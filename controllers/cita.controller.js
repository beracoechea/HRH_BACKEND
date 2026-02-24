/* src/controllers/cita.controller.js */
const { rawQuery } = require('../db'); // Cambiar importación
const { authClient, calendar } = require('../config/googleAuth');

exports.crearCita = async (req, res) => {
    try {
        const { nombre, email, telefono, fecha, horario, user_id } = req.body;
        const sql = `INSERT INTO citas 
            (nombre, email, telefono, fecha, horario, user_id, estatus) 
            VALUES (?, ?, ?, ?, ?, ?, 'pendiente')`;

        await rawQuery(sql, [nombre, email, telefono, fecha, horario, user_id || null]);
        res.status(201).json({ message: "¡Cita agendada con éxito!" });
    } catch (err) {
        res.status(500).json({ error: "Error al guardar en la base de datos" });
    }
};

exports.confirmarCita = async (req, res) => {
    const { id } = req.params;
    try {
        const rows = await rawQuery("SELECT * FROM citas WHERE id = ?", [id]);
        const cita = rows[0];
        if (!cita) return res.status(404).json({ error: "Cita no encontrada" });

        const admins = await rawQuery("SELECT email FROM usuarios WHERE rol = 'admin'");
        const adminEmails = admins.map(a => ({ email: a.email }));

        // ... Lógica de Google Calendar (se mantiene igual) ...
        const fechaLimpia = new Date(cita.fecha).toISOString().split('T')[0];
        const startDateTime = `${fechaLimpia}T${cita.horario}`;
        
        // (Asumiendo que el resto del código de tiempo está bien)
        const [horas, minutos] = cita.horario.split(':');
        const endObj = new Date(2000, 0, 1, parseInt(horas), parseInt(minutos));
        endObj.setMinutes(endObj.getMinutes() + 45);
        const horaFin = endObj.toTimeString().split(' ')[0];
        const endDateTime = `${fechaLimpia}T${horaFin}`;

        const event = {
            summary: `Cita CrediGO: ${cita.nombre}`,
            description: `Asesoría Financiera.\nCliente: ${cita.nombre}\nTel: ${cita.telefono}`,
            start: { dateTime: startDateTime, timeZone: 'America/Mexico_City' },
            end: { dateTime: endDateTime, timeZone: 'America/Mexico_City' },
            attendees: [{ email: cita.email }, ...adminEmails],
            sendUpdates: 'all',
        };

        await authClient.authorize(); 
        const response = await calendar.events.insert({
            calendarId: 'primary', 
            resource: event,
            sendUpdates: 'all',
        });

        // Cambio aquí: Quitar el "BD."
        await rawQuery(
            "UPDATE citas SET estatus = 'confirmada', google_event_id = ? WHERE id = ?", 
            [response.data.id, id]
        );

        res.json({ message: "Confirmación exitosa", eventId: response.data.id });
    } catch (err) {
        res.status(500).json({ error: "Error al sincronizar con Google Calendar", details: err.message });
    }
};

exports.rechazarCita = async (req, res) => {
    const { id } = req.params;
    try {
        const result = await rawQuery("UPDATE citas SET estatus = 'rechazada' WHERE id = ?", [id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "No se encontró la cita" });
        }
        res.json({ message: "Cita rechazada" });
    } catch (err) {
        res.status(500).json({ error: "Error al rechazar la cita" });
    }
};

exports.getCitasPendientes = async (req, res) => {
    try {
        const sql = `SELECT c.*, u.email as user_email FROM citas c 
                     LEFT JOIN usuarios u ON c.user_id = u.id 
                     WHERE LOWER(c.estatus) = 'pendiente' OR c.estatus IS NULL`;
        const citas = await rawQuery(sql);
        res.json(citas);
    } catch (err) {
        res.status(500).json({ error: "Error al obtener pendientes" });
    }
};