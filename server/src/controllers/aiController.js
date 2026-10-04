const fs = require('fs');
const { analyzeAnimalImage } = require('../services/aiService');

// @desc    Analyze uploaded image to classify Dog, Cat, or Cattle
// @route   POST /api/ai/analyze-animal
// @access  Public
const analyzeAnimal = async (req, res, next) => {
  try {
    let fileBuffer = null;
    let originalName = 'uploaded-animal.jpg';
    let imageUrl = '/uploads/sample-dog.jpg';

    if (req.file) {
      fileBuffer = fs.readFileSync(req.file.path);
      originalName = req.file.originalname;
      imageUrl = `/uploads/${req.file.filename}`;
    } else if (req.body.imageUrl) {
      imageUrl = req.body.imageUrl;
      originalName = req.body.sampleType ? `${req.body.sampleType}.jpg` : 'image.jpg';
    } else if (req.body.sampleType) {
      originalName = `${req.body.sampleType}.jpg`;
    }

    let clientFingerprint = null;
    if (req.body.clientFingerprint) {
      try {
        clientFingerprint = typeof req.body.clientFingerprint === 'string'
          ? JSON.parse(req.body.clientFingerprint)
          : req.body.clientFingerprint;
      } catch (e) {}
    }

    const options = {
      latitude: req.body.latitude ? parseFloat(req.body.latitude) : null,
      longitude: req.body.longitude ? parseFloat(req.body.longitude) : null,
      imageUrl,
      isDemo: req.user ? Boolean(req.user.isDemoAccount) : undefined,
      userId: req.user ? req.user._id : null,
      isHuman: req.body.isHuman === true || req.body.isHuman === 'true',
      isAnimal: req.body.isAnimal !== undefined ? (req.body.isAnimal === true || req.body.isAnimal === 'true') : true,
      detectedType: req.body.detectedType || (req.body.sampleType && req.body.sampleType.includes('human') ? 'human' : (req.body.sampleType && req.body.sampleType.includes('non_animal') ? 'non_animal' : '')),
      detectedLabel: req.body.detectedLabel || '',
      clientFingerprint,
    };

    const aiResult = await analyzeAnimalImage(fileBuffer, originalName, options);

    res.json({
      success: true,
      imageUrl,
      ...aiResult,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  analyzeAnimal,
};
