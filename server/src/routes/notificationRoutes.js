const express = require('express');
const router = express.Router();
const {
  getNotifications,
  markAsRead,
  markAllAsRead,
} = require('../controllers/notificationController');
const { optionalAuth } = require('../middleware/authMiddleware');

router.get('/', optionalAuth, getNotifications);
router.patch('/:id/read', markAsRead);
router.post('/mark-all-read', optionalAuth, markAllAsRead);

module.exports = router;
