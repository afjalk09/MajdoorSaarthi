const prisma = require('../lib/prisma');

exports.createRating = async (req, res, next) => {
  try {
    const { job_id, ratee_id, rating, review } = req.body;

    if (!job_id || !ratee_id || !rating) {
      return res.status(400).json({ success: false, message: 'job_id, ratee_id, rating required' });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, message: 'Rating must be 1-5' });
    }

    const existingRating = await prisma.rating.findUnique({
      where: { jobId_raterId: { jobId: job_id, raterId: req.user.id } }
    });

    if (existingRating) {
      return res.status(400).json({ success: false, message: 'Already rated for this job' });
    }

    const newRating = await prisma.rating.create({
      data: {
        jobId: job_id,
        raterId: req.user.id,
        rateeId: ratee_id,
        rating: parseInt(rating),
        review
      }
    });

    // Update worker reliability score
    const rateeUser = await prisma.user.findUnique({ where: { id: ratee_id } });
    if (rateeUser && rateeUser.role === 'WORKER') {
      const ratings = await prisma.rating.findMany({
        where: { rateeId: ratee_id }
      });
      const avgRating = ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length;
      const reliabilityScore = (avgRating / 5) * 100;

      await prisma.workerProfile.update({
        where: { userId: ratee_id },
        data: { reliabilityScore: Math.round(reliabilityScore * 100) / 100 }
      });
    }

    res.status(201).json({ success: true, data: newRating });
  } catch (error) {
    next(error);
  }
};
