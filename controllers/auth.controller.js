const { rawQuery } = require('../db');
const bcrypt = require('bcrypt');
const { ROLES, LISTA_ROLES } = require('../constants/roles');
const jwt = require('jsonwebtoken');

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const rows = await rawQuery("SELECT * FROM usuarios WHERE email = ?", [email]);

        if (rows.length === 0) return res.status(401).json({ message: "Credenciales inválidas" });

        const user = rows[0];
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) return res.status(401).json({ message: "Credenciales inválidas" });

        const token = jwt.sign(
            { id: user.id, rol: user.rol, email: user.email }, 
            process.env.JWT_SECRET,
            { expiresIn: '6h' }
        );

res.json({ 
    success: true, 
    token, 
    user: { 
        id: user.id, 
        nombre: user.nombre, 
        email: user.email,
        rol: user.rol 
    } 
});    } catch (error) {
        res.status(500).json({ message: "Error en el servidor" });
    }
};

exports.register = async (req, res) => {
    try {
        const { nombre, email, password } = req.body;
        
        // Validar que el usuario no exista antes de hashear (Ahorra CPU)
        const checkUser = await rawQuery("SELECT id FROM usuarios WHERE email = ?", [email]);
        if (checkUser.length > 0) {
            return res.status(400).json({ message: "El correo ya está registrado" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const sql = `INSERT INTO usuarios (nombre, email, password, rol) VALUES (?, ?, ?, ?)`;
        const result = await rawQuery(sql, [nombre, email, hashedPassword, 'cliente']);
        
        res.status(201).json({ 
            success: true,
            user: { id: result.insertId, nombre, email, rol: 'cliente' } 
        });
    } catch (err) {
        res.status(500).json({ message: "Error al registrar usuario" });
    }
};

exports.getUsersList = async (req, res) => {
    try {
        const sql = `
            SELECT 
                u.id, 
                u.nombre, 
                u.email, 
                u.rol, 
                (SELECT COUNT(*) FROM citas WHERE user_id = u.id) as citas_count,
                (SELECT COUNT(*) FROM creditos WHERE usuario_id = u.id) as creditos_count,
                (SELECT COUNT(*) FROM citas 
                 WHERE user_id = u.id 
                 AND (estatus = 'pendiente' OR estatus IS NULL OR estatus = '')
                ) > 0 as has_pending
            FROM usuarios u
            ORDER BY has_pending DESC, u.email ASC`;
            
        const users = await rawQuery(sql);
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: "Error al obtener la lista" });
    }
};

exports.getUserDetails = async (req, res) => {
    const { id } = req.params;
    const { id: requesterId, rol: requesterRole } = req.user;

    // Lógica STAFF: Admin, Analista y Gestor pueden ver todo.
    const isStaff = [ROLES.ADMIN, ROLES.ANALISTA, ROLES.GESTOR].includes(requesterRole);
    const isOwner = requesterId == id;

    if (!isStaff && !isOwner) {
        return res.status(403).json({ message: "No tienes permiso para ver este perfil" });
    }

    try {
        const citas = await rawQuery("SELECT * FROM citas WHERE user_id = ?", [id]);
        const sqlCreditos = `SELECT c.*, 
            (SELECT JSON_ARRAYAGG(JSON_OBJECT('tipo', e.tipo_documento, 'url', e.url_drive)) 
             FROM expedientes_credito e WHERE e.credito_id = c.id) as expediente
            FROM creditos c WHERE c.usuario_id = ?`;
        
        const rows = await rawQuery(sqlCreditos, [id]);
        const creditos = rows.map(c => ({
            ...c,
            expediente: typeof c.expediente === 'string' ? JSON.parse(c.expediente) : (c.expediente || [])
        }));

        res.json({ citas, creditos });
    } catch (err) {
        res.status(500).json({ error: "Error al obtener detalles" });
    }
};
exports.updateRole = async (req, res) => {
    const { userId, role } = req.body;
    try {
        if (!LISTA_ROLES.includes(role)) {
            return res.status(400).json({ message: "Rol no válido" });
        }
        await rawQuery("UPDATE usuarios SET rol = ? WHERE id = ?", [role, userId]);
        res.json({ success: true, message: "Rol actualizado" });
    } catch (err) {
        res.status(500).json({ message: "Error al actualizar" });
    }
};