const express = require('express');
const router = express.Router();
const blogController = require('../controllers/blog.controller');

const { protect, adminOnly } = require('../middleware/authmiddleware');
router.get('/public', blogController.getBlogsPublic);
router.get('/admin', protect, adminOnly, blogController.getBlogsAdmin);
router.post('/save', protect, adminOnly, blogController.saveBlog);
router.delete('/:id', protect, adminOnly, blogController.deleteBlog);

module.exports = router;