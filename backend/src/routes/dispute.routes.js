const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth.middleware');
const {
  raiseDispute,
  getMyDisputes,
  getJobDisputes,
  adminGetAllDisputes,
  adminResolveDispute
} = require('../controllers/dispute.controller');

router.post('/', authenticate, authorize(), raiseDispute);
router.get('/my', authenticate, authorize(), getMyDisputes);
router.get('/job/:jobId', authenticate, authorize(), getJobDisputes);
router.get('/admin/all', authenticate, authorize('admin'), adminGetAllDisputes);
router.put('/admin/:id/resolve', authenticate, authorize('admin'), adminResolveDispute);

module.exports = router;
