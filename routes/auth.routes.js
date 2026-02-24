const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { protect, authorize, adminOnly } = require('../middleware/authMiddleware');
const { ROLES } = require('../constants/roles');

router.post('/login', authController.login);
router.post('/register', authController.register);

// Ver lista de usuarios: Permitido para todo el Staff operativo
router.get('/users_list', protect, authorize([ROLES.ADMIN, ROLES.ANALISTA, ROLES.GESTOR]), authController.getUsersList);

// Cambiar roles: ESTRICTAMENTE SOLO ADMIN
router.put('/update_role', protect, adminOnly, authController.updateRole);

// Ver detalle: El controlador ya decide si es Staff o el dueño
router.get('/user_details/:id', protect, authController.getUserDetails);

module.exports = router;