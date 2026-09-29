const express = require('express');
const router = express.Router();
const {
  getOverviewStats,
  getAnimalBreakdown,
  getAreaBreakdown,
  getTrends,
} = require('../controllers/analyticsController');

router.get('/overview', getOverviewStats);
router.get('/animals', getAnimalBreakdown);
router.get('/animal-breakdown', getAnimalBreakdown);
router.get('/areas', getAreaBreakdown);
router.get('/trends', getTrends);

module.exports = router;
