const prisma = require('../lib/prisma');

exports.getPendingVerifications = async (req, res, next) => {
  try {
    const documents = await prisma.document.findMany({
      where: { status: 'PENDING' },
      include: { user: true },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ success: true, data: documents });
  } catch (error) {
    next(error);
  }
};

exports.reviewDocument = async (req, res, next) => {
  try {
    const { status } = req.body;
    const document = await prisma.document.findUnique({ where: { id: req.params.id } });

    if (!document) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }

    const updatedDocument = await prisma.document.update({
      where: { id: req.params.id },
      data: {
        status: status.toUpperCase(),
        reviewedBy: req.user.id,
        reviewedAt: new Date()
      }
    });

    if (status.toUpperCase() === 'APPROVED') {
      const user = await prisma.user.findUnique({ where: { id: document.userId } });

      if (user.role === 'WORKER') {
        await prisma.workerProfile.update({
          where: { userId: user.id },
          data: { isVerified: true }
        });
      } else if (user.role === 'EMPLOYER') {
        await prisma.employerProfile.update({
          where: { userId: user.id },
          data: { isVerified: true }
        });
      }
    }

    res.json({ success: true, data: updatedDocument });
  } catch (error) {
    next(error);
  }
};

exports.getAllWorkers = async (req, res, next) => {
  try {
    const workers = await prisma.workerProfile.findMany({
      include: { user: { select: { id: true, email: true, phone: true } } },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ success: true, data: workers });
  } catch (error) {
    next(error);
  }
};

exports.getAllJobs = async (req, res, next) => {
  try {
    const jobs = await prisma.job.findMany({
      include: { employer: true },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ success: true, data: jobs });
  } catch (error) {
    next(error);
  }
};

exports.getAnalytics = async (req, res, next) => {
  try {
    const totalWorkers = await prisma.workerProfile.count();
    const totalEmployers = await prisma.employerProfile.count();
    const totalJobs = await prisma.job.count();
    const openJobs = await prisma.job.count({ where: { status: 'OPEN' } });
    const completedJobs = await prisma.job.count({ where: { status: 'COMPLETED' } });

    const payments = await prisma.payment.aggregate({
      _sum: { amount: true, platformCommission: true }
    });

    res.json({
      success: true,
      data: {
        totalWorkers,
        totalEmployers,
        totalJobs,
        openJobs,
        completedJobs,
        totalPayments: payments._sum.amount || 0,
        totalCommission: payments._sum.platformCommission || 0
      }
    });
  } catch (error) {
    next(error);
  }
};
