const Hotspot = require('../models/Hotspot');
const AuthorityAction = require('../models/AuthorityAction');
const { recalculateHotspots } = require('../services/hotspotService');

// @desc    Get all accident hotspots
// @route   GET /api/hotspots
// @access  Public
const getHotspots = async (req, res, next) => {
  try {
    const { riskLevel, status = 'Active' } = req.query;
    const query = {};

    if (riskLevel && riskLevel !== 'All') {
      query.riskLevel = riskLevel;
    }
    if (status && status !== 'All') {
      query.status = status;
    }

    const hotspots = await Hotspot.find(query)
      .sort({ reportCount: -1, lastAccident: -1 })
      .populate('reportIds', 'reportId animalType severity address imageUrl possibleCauses citizenObservation createdAt');

    res.json({
      success: true,
      count: hotspots.length,
      hotspots,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single hotspot with associated reports and authority actions
// @route   GET /api/hotspots/:id
// @access  Public
const getHotspotById = async (req, res, next) => {
  try {
    const hotspot = await Hotspot.findById(req.params.id).populate({
      path: 'reportIds',
      options: { sort: { createdAt: -1 } },
    });

    if (!hotspot) {
      return res.status(404).json({ message: 'Hotspot not found' });
    }

    const actions = await AuthorityAction.find({ hotspotId: hotspot._id }).sort({
      createdAt: -1,
    });

    res.json({
      success: true,
      hotspot,
      actions,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Manually trigger DBSCAN Hotspot Recalculation
// @route   POST /api/hotspots/recalculate
// @access  Private (Authority/Admin)
const recalculateHotspotsHandler = async (req, res, next) => {
  try {
    const { epsilon, minPts } = req.body;
    const result = await recalculateHotspots({
      epsilon: epsilon ? parseFloat(epsilon) : undefined,
      minPts: minPts ? parseInt(minPts) : undefined,
    });

    res.json({
      success: true,
      message: 'Hotspot clustering recalculation completed successfully',
      result,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getHotspots,
  getHotspotById,
  recalculateHotspotsHandler,
};

