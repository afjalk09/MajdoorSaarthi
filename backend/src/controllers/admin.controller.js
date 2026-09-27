const prisma = require('../lib/prisma');
const { ADDRESS_PROOF_TYPES, isBusinessEmployerType } = require('../lib/employerDocs');

/**
 * An employer is verified once their PAN and Aadhaar are BOTH approved. Business
 * (contractor/company) employers additionally need one address proof on file.
 * Previously a single approved document verified anyone, which is no longer
 * enough now that individuals also submit PAN + Aadhaar.
 */
const recomputeEmployerVerification = async (userId) => {
  const employer = await prisma.employerProfile.findUnique({ where: { userId } });
  if (!employer) return null;

  const documents = await prisma.document.findMany({
    where: { userId, status: 'APPROVED' }
  });
  const approvedTypes = new Set(documents.map((d) => d.docType));

  const hasIdentity = ['PAN', 'AADHAAR'].every((t) => approvedTypes.has(t));
  const hasAddressProof = !isBusinessEmployerType(employer.employerType)
    || ADDRESS_PROOF_TYPES.some((t) => approvedTypes.has(t));

  return prisma.employerProfile.update({
    where: { userId },
    data: { isVerified: Boolean(hasIdentity && hasAddressProof) }
  });
};

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

    const reviewStatus = String(status || '').toUpperCase();
    const updatedDocument = await prisma.document.update({
      where: { id: document.id },
      data: {
        status: reviewStatus,
        reviewedBy: req.user.id,
        reviewedAt: new Date()
      }
    });

    if (reviewStatus === 'APPROVED' || reviewStatus === 'REJECTED') {
      const user = await prisma.user.findUnique({ where: { id: document.userId } });

      if (user.role === 'WORKER' && reviewStatus === 'APPROVED') {
        await prisma.workerProfile.update({
          where: { userId: user.id },
          data: { isVerified: true }
        });
      } else if (user.role === 'EMPLOYER') {
        // Derives verification from the employer's full required set, so an
        // approval can verify and a rejection can un-verify
        await recomputeEmployerVerification(user.id).catch(() => {});
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
