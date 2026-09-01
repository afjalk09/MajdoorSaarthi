const express = require('express');
const router = express.Router();
const ratingController = require('../controllers/rating.controller');
const { authenticate } = require('../middleware/auth.middleware');

router.post('/', authenticate, ratingController.createRating);

module.exports = router;
