const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth.middleware');
const {
  submitReview,
  getUserReviews,
  getJobReviews
} = require('../controllers/review.controller');

router.post('/', authenticate, authorize(), submitReview);
router.get('/user/:userId', authenticate, authorize(), getUserReviews);
router.get('/job/:jobId', authenticate, authorize(), getJobReviews);

module.exports = router;
