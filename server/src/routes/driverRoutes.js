const express = require('express');
const router = express.Router();
const {
  updateDriverLocation,
  getNearbyHotspotsForDriver,
} = require('../controllers/driverController');
const { optionalAuth } = require('../middleware/authMiddleware');

router.post('/location', optionalAuth, updateDriverLocation);
router.get('/nearby-hotspots', getNearbyHotspotsForDriver);

module.exports = router;
