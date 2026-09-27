const express = require('express');
const router = express.Router();
const employerController = require('../controllers/employer.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { uploadSingleFile } = require('../middleware/upload.middleware');

router.get('/profile', authenticate, authorize('employer'), employerController.getProfile);
router.put('/profile', authenticate, authorize('employer'), employerController.updateProfile);
router.get('/documents', authenticate, authorize('employer'), employerController.getDocuments);
router.get('/documents/:id/file', authenticate, employerController.getDocumentFile);
// multer runs after authenticate so req.user.id is available for the stored filename
router.post(
  '/documents',
  authenticate,
  authorize('employer'),
  uploadSingleFile,
  employerController.uploadDocument
);
router.get('/workers', authenticate, authorize('employer'), employerController.getWorkersByLocation);

module.exports = router;
