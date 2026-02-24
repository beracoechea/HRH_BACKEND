const { pool } = require('../db');
// Importamos las herramientas de Drive necesarias
const { uploadToDrive, createFolder } = require('../utils/googleDriveConfig'); 

// 1. Obtener todos los folios con su estatus de documentación (Para el Admin)
const getTracking = async (req, res) => {
    try {
        const query = `
            SELECT 
                c.id, 
                c.drive_folder_id, -- <--- AGREGAMOS ESTA COLUMNA
                u.nombre AS usuario_nombre,
                u.email AS usuario_email,
                (
                    SELECT JSON_ARRAYAGG(
                        JSON_OBJECT(
                            'id', e.id,
                            'tipo_documento', e.tipo_documento,
                            'estatus', LOWER(e.estatus),
                            'url_drive', e.url_drive,
                            'fecha_entrega', e.fecha_entrega,
                            'observaciones', e.observaciones
                        )
                    )
                    FROM expedientes_credito e
                    WHERE e.credito_id = c.id
                ) AS expediente
            FROM creditos c
            JOIN usuarios u ON c.usuario_id = u.id
            WHERE c.estado != 'rechazado'
            GROUP BY c.id, u.nombre, u.email, c.drive_folder_id; -- Agregamos al GROUP BY
        `;
        
        const [rows] = await pool.query(query);

        const data = rows.map(cre => {
            let expedienteArray = [];
            try {
                expedienteArray = typeof cre.expediente === 'string' 
                    ? JSON.parse(cre.expediente) 
                    : (cre.expediente || []);
            } catch (e) {
                expedienteArray = [];
            }

            const docsRequeridos = ['INE', 'COMPROBANTE', 'NOMINA'];
            const aprobados = expedienteArray
                .filter(d => d.estatus === 'aprobado')
                .map(d => d.tipo_documento.toUpperCase());
            
            const estaCompleto = docsRequeridos.every(doc => aprobados.includes(doc));
            
            return { 
                ...cre, 
                drive_folder_id: cre.drive_folder_id, // <--- LO MAPEAMOS AQUÍ
                expediente: expedienteArray,
                estaCompleto 
            };
        });

        res.json(data);
    } catch (error) {
        console.error("ERROR EN GET_TRACKING:", error);
        res.status(500).json({ message: 'Error al obtener expedientes' });
    }
};
// 2. Actualizar estatus (Desde el panel de Admin)
const updateStatus = async (req, res) => {
    const { id } = req.params;
    const { estatus, observaciones, url_drive } = req.body;

    try {
        const query = `
            UPDATE expedientes_credito 
            SET 
                estatus = ?, 
                observaciones = ?, 
                url_drive = IFNULL(?, url_drive),
                updated_at = NOW() 
            WHERE id = ?
        `;
        
        await pool.query(query, [
            estatus.toLowerCase(), 
            observaciones || "", 
            url_drive || null, 
            id
        ]);
        
        res.json({ success: true, message: 'Estatus actualizado' });
    } catch (error) {
        console.error("ERROR EN UPDATE_STATUS:", error);
        res.status(500).json({ message: 'Error al actualizar estatus' });
    }
};

// 3. PROCESO DE SUBIDA (La función principal que usa el cliente)
const uploadDocument = async (req, res) => {
    console.log("--- INICIANDO PROCESO DE SUBIDA CON LIMPIEZA ---");
    try {
        const { credito_id, tipo_documento, email, monto, fechaSolicitud } = req.body;
        const usuario_id = req.user.id;
        const archivo = req.file;

        if (!archivo) return res.status(400).json({ message: "No se recibió archivo" });

        // 1. Validar crédito y obtener carpeta actual
        const [creditoRows] = await pool.query(
            "SELECT id, drive_folder_id FROM creditos WHERE id = ? AND usuario_id = ?", 
            [credito_id, usuario_id]
        );

        if (creditoRows.length === 0) return res.status(403).json({ message: "No tienes permiso" });

        let folderId = creditoRows[0].drive_folder_id;

        // 2. LÓGICA DE LIMPIEZA: ¿Ya existe un archivo de este tipo?
        const [docExistente] = await pool.query(
            "SELECT url_drive FROM expedientes_credito WHERE credito_id = ? AND tipo_documento = ?",
            [credito_id, tipo_documento]
        );

        if (docExistente.length > 0 && docExistente[0].url_drive) {
            console.log(`Detectado archivo previo de ${tipo_documento}. Intentando borrar...`);
            try {
                // Extraer el ID de Drive de la URL guardada
                const oldFileId = docExistente[0].url_drive.split('/d/')[1]?.split('/')[0];
                if (oldFileId) {
                    await drive.files.delete({ 
                        fileId: oldFileId, 
                        supportsAllDrives: true 
                    });
                    console.log("✅ Archivo antiguo eliminado de Drive satisfactoriamente.");
                }
            } catch (err) {
                console.log("⚠️ No se pudo eliminar el archivo en Drive (probablemente ya no existía).");
            }
        }

        // 3. Si no hay carpeta del crédito, crearla
        if (!folderId) {
            const folderName = `${email}_${fechaSolicitud}_$${monto}`.replace(/[/\\?%*:|"<>]/g, '-');
            folderId = await createFolder(folderName);
            await pool.query("UPDATE creditos SET drive_folder_id = ? WHERE id = ?", [folderId, credito_id]);
        }

        // 4. Subir el NUEVO archivo
        const fileName = `${tipo_documento}_${Date.now()}`;
        const driveData = await uploadToDrive(archivo, fileName, folderId);

        // 5. Actualizar la base de datos con la nueva URL y poner en 'pendiente'
        await pool.query(
            `UPDATE expedientes_credito 
             SET url_drive = ?, estatus = 'pendiente', fecha_entrega = NOW(), observaciones = '' 
             WHERE credito_id = ? AND tipo_documento = ?`,
            [driveData.webViewLink, credito_id, tipo_documento]
        );

        res.json({ success: true, url: driveData.webViewLink });

    } catch (error) {
        console.error("🔥 ERROR:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Exportamos todas las funciones de forma consistente
module.exports = { 
    getTracking, 
    updateStatus, 
    uploadDocument 
};