const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

router.get('/verifications', authenticate, authorize('admin'), adminController.getPendingVerifications);
router.put('/verifications/:id', authenticate, authorize('admin'), adminController.reviewDocument);
router.get('/workers', authenticate, authorize('admin'), adminController.getAllWorkers);
router.get('/jobs', authenticate, authorize('admin'), adminController.getAllJobs);
router.get('/analytics', authenticate, authorize('admin'), adminController.getAnalytics);

module.exports = router;
