const express = require('express');
const router = express.Router();
const creditosController = require('../controllers/creditos.controller');

// IMPORTAMOS TUS MIDDLEWARES DE SEGURIDAD
const { protect, adminOnly } = require('../middleware/authMiddleware');

/**
 * 👤 RUTA DE USUARIO: Solicitar crédito
 * Cualquier usuario logueado puede enviar una solicitud.
 */
router.post('/solicitar', protect, creditosController.crearSolicitud);

/**
 * 🔐 RUTAS ADMINISTRATIVAS: Gestión financiera
 * Estos endpoints solo deben ser accesibles por el Administrador.
 */

// Ver todos los créditos del sistema
router.get('/todos', protect, adminOnly, creditosController.obtenerTodos);

// Registrar abonos y cambiar estados (Aquí es donde enviamos el adminId)
router.put('/update-admin', protect, adminOnly, creditosController.actualizarPorAdmin);

// Editar condiciones (Monto, plazo, mensualidades)
router.put('/editar/:id', protect, adminOnly, creditosController.editarCredito);

// Ver el gráfico de ingresos y recaudación
router.get('/estadisticas-ingresos', protect, adminOnly, creditosController.obtenerEstadisticasIngresos);

//Obtener por usuario
router.get('/usuario', protect, creditosController.obtenerPorUsuario);
module.exports = router;