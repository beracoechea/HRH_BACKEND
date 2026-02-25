const express = require('express');
const router = express.Router();
const documentController = require('../controllers/documents.controller');

const { protect, adminOnly } = require('../middleware/authMiddleware');
const upload = require('../middleware/multerConfig'); 

router.post(
    '/upload', 
    protect, 
    upload.single('archivo'), 
    documentController.uploadDocument
);

router.get('/tracking', protect, adminOnly, documentController.getTracking);
router.put('/status/:id', protect, adminOnly, documentController.updateStatus);

module.exports = router;