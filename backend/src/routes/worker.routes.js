const express = require('express');
const router = express.Router();
const workerController = require('../controllers/worker.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

router.get('/profile', authenticate, authorize('worker'), workerController.getProfile);
router.put('/profile', authenticate, authorize('worker'), workerController.updateProfile);
router.post('/documents', authenticate, authorize('worker'), workerController.uploadDocument);
router.get('/jobs', authenticate, authorize('worker'), workerController.getAvailableJobs);
router.post('/jobs/:id/apply', authenticate, authorize('worker'), workerController.applyToJob);
router.get('/applications', authenticate, authorize('worker'), workerController.getApplications);

module.exports = router;
