const express = require('express');
const router = express.Router();
const {
  getHotspots,
  getHotspotById,
  recalculateHotspotsHandler,
} = require('../controllers/hotspotController');
const { optionalAuth } = require('../middleware/authMiddleware');

router.get('/', optionalAuth, getHotspots);
router.get('/:id', optionalAuth, getHotspotById);
router.post('/recalculate', optionalAuth, recalculateHotspotsHandler);

module.exports = router;

