const { pool } = require('../db');
const { uploadToDrive, createFolder } = require('../utils/googleDriveConfig');

const getTracking = async (req, res) => {
    try {
        const query = `
            SELECT 
                c.id, 
                c.drive_folder_id,
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
            GROUP BY c.id, u.nombre, u.email, c.drive_folder_id;
        `;
        
        const [rows] = await pool.query(query);
        const data = rows.map(cre => ({
            ...cre,
            expediente: typeof cre.expediente === 'string' ? JSON.parse(cre.expediente) : (cre.expediente || []),
            estaCompleto: false 
        }));

        res.json(data);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener expedientes' });
    }
};
const updateStatus = async (req, res) => {
    const { id } = req.params;
    const { estatus, observaciones, url_drive } = req.body;
    try {
        await pool.query(
            `UPDATE expedientes_credito SET estatus = ?, 
            observaciones = ?, url_drive = IFNULL(?, url_drive), 
            updated_at = NOW() WHERE id = ?`,
            [estatus.toLowerCase(), observaciones || "", url_drive || null, id]
        );
        res.json({ success: true, message: 'Estatus actualizado' });
    } catch (error) {
        res.status(500).json({ message: 'Error al actualizar' });
    }
};

const uploadDocument = async (req, res) => {
    try {
        const { credito_id, tipo_documento } = req.body;
        
        const usuario_id = req.user.id;
        const nombreCliente = req.user.nombre || "Cliente"; 
        const emailCliente = req.user.email; 
        
        const archivo = req.file;

        if (!archivo) return res.status(400).json({ success: false, message: "No se recibió archivo" });

        const [creditoRows] = await pool.query(
            "SELECT id, drive_folder_id, monto_solicitado, fecha_solicitud FROM creditos WHERE id = ? AND usuario_id = ?", 
            [credito_id, usuario_id]
        );

        if (creditoRows.length === 0) {
            return res.status(403).json({ success: false, message: "No tienes permiso sobre este crédito" });
        }

        const { drive_folder_id, monto_solicitado, fecha_solicitud } = creditoRows[0];

        const [docActual] = await pool.query(
            "SELECT estatus FROM expedientes_credito WHERE credito_id = ? AND tipo_documento = ?",
            [credito_id, tipo_documento]
        );

        if (docActual.length > 0) {
            const status = docActual[0].estatus.toLowerCase();
            if (status === 'pendiente' || status === 'aprobado') {
                return res.status(400).json({ 
                    success: false, 
                    message: `El documento ya está ${status}. Espera a que el administrador lo revise.` 
                });
            }
        }

        let folderId = drive_folder_id;
        
        if (!folderId) {
            const fechaLabel = new Date(fecha_solicitud).toISOString().split('T')[0];
            
            const folderName = `${nombreCliente}_${emailCliente}_${fechaLabel}_$${monto_solicitado}`
                .replace(/[/\\?%*:|"<>]/g, '-')
                .trim();
            
            console.log(`Creando carpeta: ${folderName}`); 
            
            folderId = await createFolder(folderName);
            
            await pool.query("UPDATE creditos SET drive_folder_id = ? WHERE id = ?", [folderId, credito_id]);
        }

        const fileName = `${tipo_documento.toUpperCase()}_${Date.now()}`;
        const driveData = await uploadToDrive(archivo, fileName, folderId);

        await pool.query(
            `UPDATE expedientes_credito 
             SET url_drive = ?, estatus = 'pendiente', fecha_entrega = NOW(), observaciones = '' 
             WHERE credito_id = ? AND tipo_documento = ?`,
            [driveData.webViewLink, credito_id, tipo_documento]
        );

        res.json({ 
            success: true, 
            message: "Documento enviado con éxito",
            nuevoEstatus: 'pendiente',
            url: driveData.webViewLink
        });

    } catch (error) {
        console.error("🔥 ERROR EN UPLOAD:", error);
        res.status(500).json({ success: false, message: "Error interno al procesar el documento" });
    }
};
module.exports = { 
    getTracking, 
    updateStatus, 
    uploadDocument 
};