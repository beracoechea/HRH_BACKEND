const express = require('express');
const router = express.Router();
const BD = require('../models/GenericModel');

// 🔒 SEGURIDAD: Solo estas tablas pueden ser consultadas desde el front
const ALLOWED_TABLES = ['appointments', 'chatbot_knowledge'];

router.get('/chat/search', async (req, res) => {
  const { q } = req.query; // El texto del usuario viene como ?q=hola
  if (!q) return res.json([]);

  try {
    const results = await BD.searchFuzzy('chatbot_knowledge', 'keywords', q);
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: "Error en búsqueda" });
  }
});

// Endpoint Universal para Listar
router.get('/:table', async (req, res) => {
  const { table } = req.params;
  if (!ALLOWED_TABLES.includes(table)) return res.status(403).json({ error: 'Tabla no permitida' });

  try {
    const data = await BD.findAll(table);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});



// Endpoint Universal para Insertar
router.post('/:table', async (req, res) => {
  const { table } = req.params;
  if (!ALLOWED_TABLES.includes(table)) return res.status(403).json({ error: 'Acción no permitida' });

  try {
    const newItem = await BD.create(table, req.body);
    res.status(201).json(newItem);
  } catch (err) {
    res.status(500).json({ error: 'Error al insertar datos' });
  }
});

module.exports = router;