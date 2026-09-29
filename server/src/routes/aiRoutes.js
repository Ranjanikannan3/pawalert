const express = require('express');
const router = express.Router();
const { analyzeAnimal } = require('../controllers/aiController');
const { optionalAuth } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

router.post('/analyze-animal', optionalAuth, upload.single('image'), analyzeAnimal);

module.exports = router;
