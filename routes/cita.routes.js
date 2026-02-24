const express = require('express');
const router = express.Router();
const citaCtrl = require('../controllers/cita.controller');

// 🛡️ IMPORTACIÓN SEGURA
const { protect, adminOnly } = require('../middleware/authMiddleware');


// 🔐 RUTAS ADMINISTRATIVAS
router.get('/pendientes', protect, adminOnly, citaCtrl.getCitasPendientes); 
router.put('/confirmar/:id', protect, adminOnly, citaCtrl.confirmarCita);
router.put('/rechazar/:id', protect, adminOnly, citaCtrl.rechazarCita);

// 👤 RUTAS DE USUARIO
router.post('/', protect, citaCtrl.crearCita);

module.exports = router;