const express = require('express');
const router = express.Router();
const employerController = require('../controllers/employer.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

router.get('/profile', authenticate, authorize('employer'), employerController.getProfile);
router.put('/profile', authenticate, authorize('employer'), employerController.updateProfile);
router.post('/documents', authenticate, authorize('employer'), employerController.uploadDocument);

module.exports = router;
