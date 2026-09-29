const User = require('../models/User');
const AccidentReport = require('../models/AccidentReport');
const Hotspot = require('../models/Hotspot');
const RescueRequest = require('../models/RescueRequest');
const AuthorityAction = require('../models/AuthorityAction');
const { recalculateHotspots } = require('../services/hotspotService');

// @desc    Get full admin system state and collection counts
// @route   GET /api/admin/system-status
// @access  Private (Admin)
const getSystemStatus = async (req, res, next) => {
  try {
    const userCount = await User.countDocuments();
    const reportCount = await AccidentReport.countDocuments();
    const hotspotCount = await Hotspot.countDocuments();
    const rescueCount = await RescueRequest.countDocuments();
    const actionCount = await AuthorityAction.countDocuments();

    res.json({
      success: true,
      counts: {
        users: userCount,
        reports: reportCount,
        hotspots: hotspotCount,
        rescues: rescueCount,
        actions: actionCount,
      },
      environment: {
        nodeEnv: process.env.NODE_ENV || 'development',
        aiServiceUrl: process.env.AI_SERVICE_URL || 'http://127.0.0.1:8000',
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all registered users
// @route   GET /api/admin/users
// @access  Private (Admin)
const getUsers = async (req, res, next) => {
  try {
    const users = await User.find({}).select('-passwordHash').sort({ createdAt: -1 });
    res.json({ success: true, users });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user role or status
// @route   PATCH /api/admin/users/:id
// @access  Private (Admin)
const updateUser = async (req, res, next) => {
  try {
    const { role, name, phone, organization } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (role) user.role = role;
    if (name) user.name = name;
    if (phone) user.phone = phone;
    if (organization) user.organization = organization;

    await user.save();
    res.json({ success: true, user });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getSystemStatus,
  getUsers,
  updateUser,
};
