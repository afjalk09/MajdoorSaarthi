const express = require('express');
const router = express.Router();
const jobController = require('../controllers/job.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

router.post('/', authenticate, authorize('employer'), jobController.createJob);
router.get('/', authenticate, authorize('employer'), jobController.getEmployerJobs);
router.get('/:id', authenticate, jobController.getJobById);
router.put('/:id', authenticate, authorize('employer'), jobController.updateJob);
router.put('/:id/status', authenticate, authorize('employer'), jobController.updateJobStatus);
router.get('/:id/matches', authenticate, authorize('employer'), jobController.getMatches);
router.post('/:id/hire/:workerId', authenticate, authorize('employer'), jobController.hireWorker);
router.put('/:id/complete', authenticate, jobController.completeJob);

module.exports = router;
