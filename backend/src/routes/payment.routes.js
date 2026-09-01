const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/payment.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

router.post('/initiate', authenticate, authorize('employer'), paymentController.initiatePayment);
router.put('/:id/confirm', authenticate, authorize('worker'), paymentController.confirmPayment);

module.exports = router;
