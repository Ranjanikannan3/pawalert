const AccidentReport = require('../models/AccidentReport');
const Hotspot = require('../models/Hotspot');
const RescueRequest = require('../models/RescueRequest');
const AuthorityAction = require('../models/AuthorityAction');

// @desc    Get aggregate overview statistics for municipality and public dashboards
// @route   GET /api/analytics/overview
// @access  Public
const getOverviewStats = async (req, res, next) => {
  try {
    const totalReports = await AccidentReport.countDocuments();
    
    // Today's reports
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const todayReports = await AccidentReport.countDocuments({
      createdAt: { $gte: startOfToday },
    });

    const activeHotspots = await Hotspot.countDocuments({ status: 'Active' });
    const highRiskHotspots = await Hotspot.countDocuments({
      status: 'Active',
      riskLevel: 'HIGH',
    });
    const mediumRiskHotspots = await Hotspot.countDocuments({
      status: 'Active',
      riskLevel: 'MEDIUM',
    });
    const lowRiskHotspots = await Hotspot.countDocuments({
      status: 'Active',
      riskLevel: 'LOW',
    });

    const pendingRescues = await RescueRequest.countDocuments({
      status: { $in: ['PENDING', 'Requested', 'ASSIGNED', 'Assigned', 'ACCEPTED', 'Accepted', 'ON THE WAY', 'On the Way', 'ANIMAL REACHED', 'Animal Reached'] },
    });
    const completedRescues = await RescueRequest.countDocuments({
      status: { $in: ['COMPLETED', 'Completed', 'RESCUED', 'Rescued', 'RESOLVED', 'Resolved'] },
    });

    // Animal type breakdown
    const dogCount = await AccidentReport.countDocuments({ animalType: 'Dog' });
    const catCount = await AccidentReport.countDocuments({ animalType: 'Cat' });
    const cattleCount = await AccidentReport.countDocuments({ animalType: 'Cattle' });
    const otherCount = await AccidentReport.countDocuments({ animalType: 'Other' });

    // Actions summary
    const pendingActions = await AuthorityAction.countDocuments({ status: 'Pending' });
    const completedActions = await AuthorityAction.countDocuments({ status: 'Completed' });

    res.json({
      success: true,
      data: {
        totalReports,
        todayReports,
        activeHotspots,
        highRiskHotspots,
        mediumRiskHotspots,
        lowRiskHotspots,
        pendingRescues,
        completedRescues,
        animalCounts: {
          Dog: dogCount,
          Cat: catCount,
          Cattle: cattleCount,
          Other: otherCount,
        },
        authorityActions: {
          pending: pendingActions,
          completed: completedActions,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get animal classification statistics
// @route   GET /api/analytics/animals
// @access  Public
const getAnimalBreakdown = async (req, res, next) => {
  try {
    const breakdown = await AccidentReport.aggregate([
      {
        $group: {
          _id: '$animalType',
          count: { $sum: 1 },
          avgConfidence: { $avg: '$aiConfidence' },
        },
      },
    ]);

    const formatted = breakdown.map((b) => ({
      animal: b._id || 'Unknown',
      count: b.count,
      avgConfidence: parseFloat((b.avgConfidence * 100).toFixed(1)),
    }));

    res.json({ success: true, breakdown: formatted });
  } catch (error) {
    next(error);
  }
};

// @desc    Get area-wise hotspot and accident ranking
// @route   GET /api/analytics/areas
// @access  Public
const getAreaBreakdown = async (req, res, next) => {
  try {
    const hotspots = await Hotspot.find({ status: 'Active' })
      .sort({ reportCount: -1 })
      .limit(8)
      .select('name reportCount riskLevel radius animalDistribution');

    const formatted = hotspots.map((h) => ({
      name: h.name,
      accidents: h.reportCount,
      riskLevel: h.riskLevel,
      radius: h.radius,
      dogs: h.animalDistribution?.Dog || 0,
      cats: h.animalDistribution?.Cat || 0,
      cattle: h.animalDistribution?.Cattle || 0,
    }));

    res.json({ success: true, areas: formatted });
  } catch (error) {
    next(error);
  }
};

// @desc    Get accident trends over time for line charts
// @route   GET /api/analytics/trends
// @access  Public
const getTrends = async (req, res, next) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const reports = await AccidentReport.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
          },
          Dog: {
            $sum: { $cond: [{ $eq: ['$animalType', 'Dog'] }, 1, 0] },
          },
          Cat: {
            $sum: { $cond: [{ $eq: ['$animalType', 'Cat'] }, 1, 0] },
          },
          Cattle: {
            $sum: { $cond: [{ $eq: ['$animalType', 'Cattle'] }, 1, 0] },
          },
          total: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const formatted = reports.map((r) => ({
      date: r._id,
      Dog: r.Dog,
      Cat: r.Cat,
      Cattle: r.Cattle,
      total: r.total,
    }));

    res.json({ success: true, trends: formatted });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getOverviewStats,
  getAnimalBreakdown,
  getAreaBreakdown,
  getTrends,
};
