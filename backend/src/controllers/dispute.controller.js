const prisma = require('../lib/prisma');
const { createNotification } = require('./notification.controller');

exports.raiseDispute = async (req, res, next) => {
  try {
    const { job_id, reason, description } = req.body;

    if (!job_id || !reason || !description) {
      return res.status(400).json({ success: false, message: 'job_id, reason, and description are required' });
    }

    const job = await prisma.job.findUnique({
      where: { id: job_id },
      include: { employer: true }
    });

    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }

    // Verify user is part of this job (worker or employer)
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    let isPartOfJob = false;
    let otherPartyId = null;

    if (user.role === 'EMPLOYER') {
      const employer = await prisma.employerProfile.findUnique({ where: { userId: req.user.id } });
      if (employer && job.employerId === employer.id) {
        isPartOfJob = true;
        // Find a hired worker to notify
        const hiredApp = await prisma.jobApplication.findFirst({
          where: { jobId: job_id, status: 'HIRED' },
          include: { worker: { select: { userId: true } } }
        });
        if (hiredApp) otherPartyId = hiredApp.worker.userId;
      }
    } else if (user.role === 'WORKER') {
      const worker = await prisma.workerProfile.findUnique({ where: { userId: req.user.id } });
      if (worker) {
        const app = await prisma.jobApplication.findFirst({
          where: { jobId: job_id, workerId: worker.id }
        });
        if (app) {
          isPartOfJob = true;
          otherPartyId = job.employer.userId;
        }
      }
    }

    if (!isPartOfJob) {
      return res.status(403).json({ success: false, message: 'You are not part of this job' });
    }

    const dispute = await prisma.dispute.create({
      data: {
        jobId: job_id,
        raisedById: req.user.id,
        reason: reason.toUpperCase(),
        description
      }
    });

    // Notify the other party
    if (otherPartyId) {
      await createNotification(
        otherPartyId,
        'DISPUTE_RAISED',
        'Dispute Raised',
        `A dispute has been raised for job: ${job.title}`,
        job_id
      );
    }

    res.status(201).json({ success: true, data: dispute });
  } catch (error) {
    next(error);
  }
};

exports.getMyDisputes = async (req, res, next) => {
  try {
    const disputes = await prisma.dispute.findMany({
      where: { raisedById: req.user.id },
      include: { job: { select: { id: true, title: true } } },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ success: true, data: disputes });
  } catch (error) {
    next(error);
  }
};

exports.getJobDisputes = async (req, res, next) => {
  try {
    const disputes = await prisma.dispute.findMany({
      where: { jobId: req.params.jobId },
      include: {
        raisedBy: { select: { id: true, email: true } },
        job: { select: { id: true, title: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ success: true, data: disputes });
  } catch (error) {
    next(error);
  }
};

exports.adminGetAllDisputes = async (req, res, next) => {
  try {
    const disputes = await prisma.dispute.findMany({
      include: {
        raisedBy: { select: { id: true, email: true, role: true } },
        job: { select: { id: true, title: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ success: true, data: disputes });
  } catch (error) {
    next(error);
  }
};

exports.adminResolveDispute = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, resolution } = req.body;

    if (!status || !resolution) {
      return res.status(400).json({ success: false, message: 'status and resolution are required' });
    }

    const dispute = await prisma.dispute.findUnique({
      where: { id },
      include: { job: true }
    });

    if (!dispute) {
      return res.status(404).json({ success: false, message: 'Dispute not found' });
    }

    const updated = await prisma.dispute.update({
      where: { id },
      data: {
        status: status.toUpperCase(),
        resolution,
        resolvedBy: req.user.id,
        resolvedAt: new Date()
      }
    });

    // Notify the person who raised the dispute
    await createNotification(
      dispute.raisedById,
      'DISPUTE_RESOLVED',
      'Dispute Resolved',
      `Your dispute for job "${dispute.job.title}" has been resolved.`,
      dispute.jobId
    );

    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};
