const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth.middleware');
const {
  getMilestones,
  createMilestone,
  updateMilestone,
  deleteMilestone
} = require('../controllers/milestone.controller');

router.get('/job/:jobId', authenticate, authorize(), getMilestones);
router.post('/job/:jobId', authenticate, authorize('employer'), createMilestone);
router.put('/:id', authenticate, authorize(), updateMilestone);
router.delete('/:id', authenticate, authorize('employer'), deleteMilestone);

module.exports = router;
