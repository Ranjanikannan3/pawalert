const express = require('express');
const router = express.Router();
const {
  getRescueRequests,
  getRescueRequestById,
  updateRescueStatus,
  assignVolunteer,
} = require('../controllers/rescueController');
const { protect, optionalAuth } = require('../middleware/authMiddleware');

router.get('/', optionalAuth, getRescueRequests);
router.get('/:id', optionalAuth, getRescueRequestById);
router.patch('/:id/status', optionalAuth, updateRescueStatus);
router.post('/:id/assign', optionalAuth, assignVolunteer);

module.exports = router;

