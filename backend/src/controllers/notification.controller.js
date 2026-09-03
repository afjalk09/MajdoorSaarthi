const prisma = require('../lib/prisma');

exports.getNotifications = async (req, res, next) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user.id },
      include: { job: { select: { id: true, title: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50
    });

    res.json({ success: true, data: notifications });
  } catch (error) {
    next(error);
  }
};

exports.getUnreadCount = async (req, res, next) => {
  try {
    const count = await prisma.notification.count({
      where: { userId: req.user.id, isRead: false }
    });

    res.json({ success: true, data: { count } });
  } catch (error) {
    next(error);
  }
};

exports.markAsRead = async (req, res, next) => {
  try {
    const notification = await prisma.notification.findUnique({
      where: { id: req.params.id }
    });

    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    if (notification.userId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    const updated = await prisma.notification.update({
      where: { id: req.params.id },
      data: { isRead: true }
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};

exports.markAllAsRead = async (req, res, next) => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user.id, isRead: false },
      data: { isRead: true }
    });

    res.json({ success: true, data: { message: 'All notifications marked as read' } });
  } catch (error) {
    next(error);
  }
};

exports.createNotification = async (userId, type, title, message, jobId = null) => {
  try {
    return await prisma.notification.create({
      data: { userId, type, title, message, jobId }
    });
  } catch (error) {
    console.error('Failed to create notification:', error);
  }
};
