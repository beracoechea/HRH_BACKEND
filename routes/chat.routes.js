const express = require('express');
const router = express.Router();
const chatCtrl = require('../controllers/chat.controller');
const BD = require('../models/GenericModel');
const { protect, adminOnly } = require('../middleware/authMiddleware');

router.get('/search', chatCtrl.getChatResponse);

router.get('/all', protect, adminOnly, async (req, res) => {
    try {
        const data = await BD.findAll('chatbot_knowledge');
        res.json(data);
    } catch (err) {
        res.status(500).json([]);
    }
});

module.exports = router;