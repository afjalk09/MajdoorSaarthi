const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth.middleware');
const {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead
} = require('../controllers/notification.controller');

router.get('/', authenticate, authorize(), getNotifications);
router.get('/unread-count', authenticate, authorize(), getUnreadCount);
router.put('/:id/read', authenticate, authorize(), markAsRead);
router.put('/read-all', authenticate, authorize(), markAllAsRead);

module.exports = router;
