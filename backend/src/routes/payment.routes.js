const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/payment.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

router.get('/', authenticate, authorize(), paymentController.listMyPayments);
router.get('/job/:jobId', authenticate, authorize(), paymentController.getJobPayments);
router.post('/', authenticate, authorize('employer'), paymentController.createPayment);
router.put('/:id/confirm', authenticate, authorize('worker'), paymentController.confirmPayment);
router.put('/:id/cancel', authenticate, authorize('employer'), paymentController.cancelPayment);

module.exports = router;
