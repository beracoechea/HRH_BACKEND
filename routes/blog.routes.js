const express = require('express');
const router = express.Router();
const blogController = require('../controllers/blog.controller');

// IMPORTAMOS LOS MIDDLEWARES DE SEGURIDAD
const { protect, adminOnly } = require('../middleware/authmiddleware');

// 🔓 RUTA PÚBLICA: Cualquier persona puede leer las noticias o blogs.
// No lleva middleware porque queremos que sea visible para prospectos.
router.get('/public', blogController.getBlogsPublic);

// 🔐 RUTAS ADMINISTRATIVAS: Requieren autenticación y rol de admin.
// Si un "hacker" intenta usar el endpoint /admin o /save desde la consola,
// el middleware 'protect' lo detendrá si no hay token, 
// y 'adminOnly' lo detendrá si no es administrador.



router.get('/admin', protect, adminOnly, blogController.getBlogsAdmin);
router.post('/save', protect, adminOnly, blogController.saveBlog);
router.delete('/:id', protect, adminOnly, blogController.deleteBlog);

module.exports = router;