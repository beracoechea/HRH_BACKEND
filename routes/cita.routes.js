const express = require('express');
const router = express.Router();
const citaCtrl = require('../controllers/cita.controller');

const { protect, adminOnly } = require('../middleware/authMiddleware');


router.get('/pendientes', protect, adminOnly, citaCtrl.getCitasPendientes); 
router.put('/confirmar/:id', protect, adminOnly, citaCtrl.confirmarCita);
router.put('/rechazar/:id', protect, adminOnly, citaCtrl.rechazarCita);

router.post('/', protect, citaCtrl.crearCita);

module.exports = router;