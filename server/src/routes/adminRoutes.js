const express = require('express');
const router = express.Router();
const {
  getSystemStatus,
  getUsers,
  updateUser,
} = require('../controllers/adminController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

router.get('/system-status', getSystemStatus);
router.get('/users', protect, authorize('admin'), getUsers);
router.patch('/users/:id', protect, authorize('admin'), updateUser);

module.exports = router;
