const express = require('express');
const router = express.Router();
const {
  getCauseAnalysis,
  getAuthorityActions,
  createAuthorityAction,
  updateAuthorityAction,
} = require('../controllers/authorityController');
const { protect, optionalAuth } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');
const upload = require('../middleware/uploadMiddleware');

router.get('/cause-analysis', optionalAuth, getCauseAnalysis);
router.get('/actions', optionalAuth, getAuthorityActions);
router.post('/actions', protect, authorize('authority', 'admin'), createAuthorityAction);
router.patch('/actions/:id', protect, authorize('authority', 'admin'), upload.single('image'), updateAuthorityAction);

module.exports = router;


