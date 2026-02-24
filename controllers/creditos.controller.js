const { pool } = require('../db');
const { notifyAdminNewRequest, notifyUserConfirmation } = require('../utils/mailer');
const { REQUISITOS_CREDITO, ESTADOS_CREDITO } = require('../constants/requisitos');

// 1. Crear Solicitud y preparar expediente
exports.crearSolicitud = async (req, res) => {
    try {
        const { 
            usuario_id, tipo_credito, monto_solicitado, plazo_meses, 
            pago_mensual_ano1, pago_mensual_ano2, telefono_contacto 
        } = req.body;

        // 🛡️ USAMOS LAS CONSTANTES GLOBALES
        const tipoKey = tipo_credito?.toUpperCase() || 'PERSONAL';
        const docsRequeridos = REQUISITOS_CREDITO[tipoKey] || REQUISITOS_CREDITO.PERSONAL;

        // 1. INSERTAR EL CRÉDITO (Usamos ESTADOS_CREDITO.PENDIENTE en lugar de un string manual)
        const sqlCredito = `INSERT INTO creditos 
            (usuario_id, tipo_credito, monto_solicitado, plazo_meses, pago_mensual_ano1, pago_mensual_ano2, telefono_contacto, estado) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;

        const [result] = await pool.query(sqlCredito, [
            usuario_id, 
            tipoKey, 
            monto_solicitado, 
            plazo_meses, 
            pago_mensual_ano1, 
            pago_mensual_ano2 || 0, 
            telefono_contacto,
            ESTADOS_CREDITO.PENDIENTE // <--- Evita errores de dedo
        ]);

        const nuevoCreditoId = result.insertId;

        // 2. CREAR EXPEDIENTE ESPECÍFICO (Iteramos sobre la constante)
        for (const nombreDoc of docsRequeridos) {
            await pool.query(
                "INSERT INTO expedientes_credito (credito_id, tipo_documento, estatus, url_drive) VALUES (?, ?, 'esperando', '')",
                [nuevoCreditoId, nombreDoc]
            );
        }

        // 3. ENVIAR CORREOS... (el resto del código sigue igual)
        const [[userData]] = await pool.query("SELECT nombre, email FROM usuarios WHERE id = ?", [usuario_id]);
        
        if (userData) {
            const dataEmail = {
                nombre: userData.nombre,
                email: userData.email,
                monto: monto_solicitado,
                plazo: plazo_meses,
                tipo: tipoKey,
                telefono: telefono_contacto
            };

            const [admins] = await pool.query("SELECT email FROM usuarios WHERE rol = 'admin'");
            const adminList = admins.map(a => a.email).join(',');
            
            if (adminList) notifyAdminNewRequest(adminList, dataEmail);
            notifyUserConfirmation(dataEmail, docsRequeridos);
        }

        res.status(201).json({ 
            success: true, 
            message: `Solicitud de crédito ${tipoKey} registrada.`,
            creditoId: nuevoCreditoId 
        });

    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ message: "Error al crear la solicitud" });
    }
};
// 2. Obtener Todos (Vista Admin)
exports.obtenerTodos = async (req, res) => {
    try {
        const sql = `
            SELECT 
                c.*, u.email AS usuario_email, u.nombre AS usuario_nombre,
                -- Comparamos si los aprobados son iguales al total de requisitos de este crédito
                (
                    SELECT IF(
                        COUNT(CASE WHEN e.estatus = 'aprobado' THEN 1 END) = COUNT(*), 
                        1, 0
                    )
                    FROM expedientes_credito e 
                    WHERE e.credito_id = c.id
                ) AS documentacion_completa
            FROM creditos c
            LEFT JOIN usuarios u ON c.usuario_id = u.id
            ORDER BY c.fecha_solicitud DESC`;
            
        const [rows] = await pool.query(sql);
        res.json(rows);
    } catch (error) {
        console.error("Error al cargar créditos:", error);
        res.status(500).json({ message: "Error al cargar créditos" });
    }
};

// 3. Actualización Admin con Transacción (Pagos e Historial)
exports.actualizarPorAdmin = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const { creditoId, montoAbono, montoTotalCorregido, estado, adminId } = req.body;
        await connection.beginTransaction();

        const [[credito]] = await connection.query("SELECT pagado, estado FROM creditos WHERE id = ?", [creditoId]);
        if (!credito) throw new Error("Crédito no encontrado");

        let nuevoPagado = parseFloat(credito.pagado);
        let montoARegistrar = 0;
        let tipoMov = 'abono';

        if (montoTotalCorregido !== undefined) {
            nuevoPagado = parseFloat(montoTotalCorregido);
            tipoMov = 'correccion';
        } else if (montoAbono !== undefined) {
            montoARegistrar = parseFloat(montoAbono);
            nuevoPagado += montoARegistrar;
        }

        const nuevoEstado = estado || credito.estado;
        let sqlUpdate = "UPDATE creditos SET pagado = ?, estado = ? WHERE id = ?";
        let paramsUpdate = [nuevoPagado, nuevoEstado, creditoId];

        // Si pasa de pendiente a activo, grabamos fecha de aprobación
        if (credito.estado === 'pendiente' && nuevoEstado === 'activo') {
            sqlUpdate = "UPDATE creditos SET pagado = ?, estado = ?, fecha_aprobacion = NOW() WHERE id = ?";
        }

        await connection.query(sqlUpdate, paramsUpdate);

        // Registrar en historial si hay movimiento de dinero
        if (montoARegistrar > 0 || tipoMov === 'correccion') {
            await connection.query(
                "INSERT INTO pagos_recibidos (credito_id, monto_pagado, tipo_movimiento, administrador_id) VALUES (?, ?, ?, ?)",
                [creditoId, montoARegistrar || nuevoPagado, tipoMov, adminId || null]
            );
        }

        await connection.commit();
        res.json({ success: true, message: "Operación exitosa" });
    } catch (error) {
        await connection.rollback();
        res.status(500).json({ message: "Error al procesar la transacción" });
    } finally {
        connection.release();
    }
};

// 4. Edición de condiciones (Modal Admin)
exports.editarCredito = async (req, res) => {
    try {
        const { id } = req.params; 
        const { monto_solicitado, plazo_meses, pago_mensual_ano1, pago_mensual_ano2 } = req.body;
        
        await pool.query(
            `UPDATE creditos SET monto_solicitado=?, plazo_meses=?, pago_mensual_ano1=?, pago_mensual_ano2=? WHERE id=?`,
            [monto_solicitado, plazo_meses, pago_mensual_ano1, pago_mensual_ano2, id]
        );
        res.json({ success: true, message: "Condiciones actualizadas" });
    } catch (error) {
        res.status(500).json({ message: "Error al editar" });
    }
};

// 5. Estadísticas reales para Recharts (Dashboard)
exports.obtenerEstadisticasIngresos = async (req, res) => {
    try {
        const sql = `
            SELECT 
                DATE_FORMAT(fecha_pago, '%b') as mes,
                -- Convertimos a FLOAT para que el JSON lo mande como número
                CAST(SUM(monto_pagado) AS FLOAT) as monto
            FROM pagos_recibidos
            WHERE fecha_pago >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
            GROUP BY mes, YEAR(fecha_pago), MONTH(fecha_pago)
            ORDER BY YEAR(fecha_pago) ASC, MONTH(fecha_pago) ASC
        `;
        
        const [rows] = await pool.query(sql);
        
        // Si rows es undefined o null, enviamos []
        const data = rows || [];
        
        console.log("=== DATOS ENVIADOS AL FRONT ===");
        console.log(data); 
        
        res.status(200).json(data);
    } catch (error) {
        console.error("❌ ERROR SQL ESTADISTICAS:", error);
        res.status(500).json([]);
    }
};