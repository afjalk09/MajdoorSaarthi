const prisma = require('../lib/prisma');
const { createNotification } = require('./notification.controller');

exports.submitReview = async (req, res, next) => {
  try {
    const { job_id, reviewee_id, rating, comment } = req.body;

    if (!job_id || !reviewee_id || !rating) {
      return res.status(400).json({ success: false, message: 'job_id, reviewee_id, and rating are required' });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, message: 'Rating must be between 1 and 5' });
    }

    const job = await prisma.job.findUnique({ where: { id: job_id } });
    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }

    if (job.status !== 'COMPLETED') {
      return res.status(400).json({ success: false, message: 'Can only review after job completion' });
    }

    // Check if already reviewed
    const existing = await prisma.review.findUnique({
      where: { jobId_reviewerId: { jobId: job_id, reviewerId: req.user.id } }
    });

    if (existing) {
      return res.status(400).json({ success: false, message: 'You have already reviewed this job' });
    }

    const review = await prisma.review.create({
      data: {
        jobId: job_id,
        reviewerId: req.user.id,
        revieweeId: reviewee_id,
        rating: parseInt(rating),
        comment
      }
    });

    // Notify the reviewee
    const reviewer = await prisma.user.findUnique({ where: { id: req.user.id } });
    await createNotification(
      reviewee_id,
      'REVIEW_RECEIVED',
      'New Review Received',
      `You received a ${rating}-star review for job: ${job.title}`,
      job_id
    );

    res.status(201).json({ success: true, data: review });
  } catch (error) {
    next(error);
  }
};

exports.getUserReviews = async (req, res, next) => {
  try {
    const reviews = await prisma.review.findMany({
      where: { revieweeId: req.params.userId },
      include: {
        reviewer: { select: { id: true, email: true, workerProfile: { select: { fullName: true } }, employerProfile: { select: { displayName: true } } } },
        job: { select: { id: true, title: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Calculate average rating
    const avgResult = await prisma.review.aggregate({
      where: { revieweeId: req.params.userId },
      _avg: { rating: true },
      _count: { rating: true }
    });

    res.json({
      success: true,
      data: {
        reviews,
        averageRating: avgResult._avg.rating || 0,
        totalReviews: avgResult._count.rating || 0
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.getJobReviews = async (req, res, next) => {
  try {
    const reviews = await prisma.review.findMany({
      where: { jobId: req.params.jobId },
      include: {
        reviewer: { select: { id: true, email: true, workerProfile: { select: { fullName: true } }, employerProfile: { select: { displayName: true } } } },
        reviewee: { select: { id: true, email: true, workerProfile: { select: { fullName: true } }, employerProfile: { select: { displayName: true } } } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ success: true, data: reviews });
  } catch (error) {
    next(error);
  }
};
