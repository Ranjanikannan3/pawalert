const express = require('express');
const router = express.Router();
const {
  createReport,
  checkDuplicate,
  getReports,
  getReportById,
  getMyReports,
  updateReportStatus,
} = require('../controllers/reportController');
const { protect, optionalAuth } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

router.post('/check-duplicate', optionalAuth, upload.single('image'), checkDuplicate);
router.post('/', optionalAuth, upload.single('image'), createReport);
router.get('/', optionalAuth, getReports);
router.get('/my', protect, getMyReports);
router.get('/:id', getReportById);
router.patch('/:id/status', protect, updateReportStatus);

module.exports = router;

