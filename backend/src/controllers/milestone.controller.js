const prisma = require('../lib/prisma');

exports.getMilestones = async (req, res, next) => {
  try {
    const milestones = await prisma.milestone.findMany({
      where: { jobId: req.params.jobId },
      orderBy: { createdAt: 'asc' }
    });

    res.json({ success: true, data: milestones });
  } catch (error) {
    next(error);
  }
};

exports.createMilestone = async (req, res, next) => {
  try {
    const { jobId } = req.params;
    const { title, description, due_date } = req.body;

    if (!title) {
      return res.status(400).json({ success: false, message: 'Title is required' });
    }

    const job = await prisma.job.findUnique({ where: { id: jobId } });
    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }

    const employer = await prisma.employerProfile.findUnique({ where: { userId: req.user.id } });
    if (job.employerId !== employer.id) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    const milestone = await prisma.milestone.create({
      data: {
        jobId,
        title,
        description,
        dueDate: due_date ? new Date(due_date) : null
      }
    });

    res.status(201).json({ success: true, data: milestone });
  } catch (error) {
    next(error);
  }
};

exports.updateMilestone = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, title, description } = req.body;

    const milestone = await prisma.milestone.findUnique({
      where: { id },
      include: { job: true }
    });

    if (!milestone) {
      return res.status(404).json({ success: false, message: 'Milestone not found' });
    }

    const updateData = {};
    if (status) {
      updateData.status = status.toUpperCase();
      if (status.toUpperCase() === 'COMPLETED') {
        updateData.completedAt = new Date();
      }
    }
    if (title) updateData.title = title;
    if (description !== undefined) updateData.description = description;

    const updated = await prisma.milestone.update({
      where: { id },
      data: updateData
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};

exports.deleteMilestone = async (req, res, next) => {
  try {
    const { id } = req.params;

    const milestone = await prisma.milestone.findUnique({
      where: { id },
      include: { job: true }
    });

    if (!milestone) {
      return res.status(404).json({ success: false, message: 'Milestone not found' });
    }

    const employer = await prisma.employerProfile.findUnique({ where: { userId: req.user.id } });
    if (milestone.job.employerId !== employer.id) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    await prisma.milestone.delete({ where: { id } });

    res.json({ success: true, data: { message: 'Milestone deleted' } });
  } catch (error) {
    next(error);
  }
};
