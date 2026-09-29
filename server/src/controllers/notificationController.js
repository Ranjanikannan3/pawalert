const Notification = require('../models/Notification');

// @desc    Get user/role notifications
// @route   GET /api/notifications
// @access  Public
const getNotifications = async (req, res, next) => {
  try {
    const requestedRole = req.query.role || (req.user ? req.user.role : 'all');
    const query = {
      $or: [
        { recipientRole: 'all' },
        { recipientRole: requestedRole },
        ...(req.user ? [{ userId: req.user._id }] : []),
      ],
    };

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(50)
      .populate('relatedReportId', 'reportId animalType address')
      .populate('relatedHotspotId', 'hotspotId name riskLevel');

    const unreadCount = await Notification.countDocuments({
      ...query,
      read: false,
    });

    res.json({
      success: true,
      unreadCount,
      notifications,
    });
  } catch (error) {
    next(error);
  }
};


// @desc    Mark notification as read
// @route   PATCH /api/notifications/:id/read
// @access  Public
const markAsRead = async (req, res, next) => {
  try {
    const notification = await Notification.findByIdAndUpdate(
      req.params.id,
      { $set: { read: true } },
      { new: true }
    );
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    res.json({ success: true, notification });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark all notifications as read
// @route   POST /api/notifications/mark-all-read
// @access  Public
const markAllAsRead = async (req, res, next) => {
  try {
    const role = req.body?.role || req.query?.role || (req.user ? req.user.role : 'all');
    let query = {};
    if (role === 'all' || role === 'admin') {
      // Mark all read for admin or global
      query = {};
    } else {
      query = {
        $or: [
          { recipientRole: 'all' },
          { recipientRole: role },
          ...(req.user ? [{ userId: req.user._id }] : []),
        ],
      };
    }
    await Notification.updateMany(query, { $set: { read: true } });
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getNotifications,
  markAsRead,
  markAllAsRead,
};
