/* src/middleware/authMiddleware.js */
const jwt = require('jsonwebtoken');
const { ROLES } = require('../constants/roles');

const protect = async (req, res, next) => {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
        if (!token || token === 'null' || token === 'undefined') {
            return res.status(401).json({ message: 'No autorizado: Token inexistente' });
        }
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = { id: decoded.id, rol: decoded.rol, email: decoded.email };
            next();
        } catch (error) {
            const msg = error.name === 'TokenExpiredError' ? 'Sesión expirada' : 'Token inválido';
            return res.status(401).json({ message: msg });
        }
    } else {
        return res.status(401).json({ message: 'Acceso denegado' });
    }
};

// Función flexible para múltiples roles
const authorize = (rolesPermitidos) => {
    return (req, res, next) => {
        if (req.user && rolesPermitidos.includes(req.user.rol)) {
            next();
        } else {
            return res.status(403).json({ 
                message: `Privilegios insuficientes. Se requiere: [${rolesPermitidos.join(', ')}]` 
            });
        }
    };
};

// ALIAS PARA RETROCOMPATIBILIDAD: 
// Si se usa adminOnly sin parámetros, solo deja pasar al admin.
const adminOnly = authorize([ROLES.ADMIN]);

module.exports = { protect, authorize, adminOnly };