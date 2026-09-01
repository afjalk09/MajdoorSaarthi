const prisma = require('../lib/prisma');
const matchingService = require('../services/matching.service');

exports.createJob = async (req, res, next) => {
  try {
    const {
      title, description, required_skills, workers_needed,
      location_lat, location_lng, location_text,
      wage_amount, wage_type, duration_days
    } = req.body;

    if (!title || !wage_amount || !wage_type) {
      return res.status(400).json({ success: false, message: 'Title, wage_amount, wage_type required' });
    }

    const employer = await prisma.employerProfile.findUnique({ where: { userId: req.user.id } });
    if (!employer) {
      return res.status(400).json({ success: false, message: 'Complete your profile first' });
    }

    const job = await prisma.job.create({
      data: {
        employerId: employer.id,
        title,
        description,
        requiredSkills: required_skills || [],
        workersNeeded: workers_needed || 1,
        locationLat: location_lat,
        locationLng: location_lng,
        locationText: location_text,
        wageAmount: parseFloat(wage_amount),
        wageType: wage_type.toUpperCase(),
        durationDays: duration_days ? parseInt(duration_days) : null
      }
    });

    res.status(201).json({ success: true, data: job });
  } catch (error) {
    next(error);
  }
};

exports.getEmployerJobs = async (req, res, next) => {
  try {
    const employer = await prisma.employerProfile.findUnique({ where: { userId: req.user.id } });
    if (!employer) {
      return res.status(400).json({ success: false, message: 'Complete your profile first' });
    }

    const jobs = await prisma.job.findMany({
      where: { employerId: employer.id },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ success: true, data: jobs });
  } catch (error) {
    next(error);
  }
};

exports.getJobById = async (req, res, next) => {
  try {
    const job = await prisma.job.findUnique({
      where: { id: req.params.id },
      include: { employer: true }
    });

    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }

    res.json({ success: true, data: job });
  } catch (error) {
    next(error);
  }
};

exports.updateJobStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const job = await prisma.job.findUnique({ where: { id: req.params.id } });

    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }

    const employer = await prisma.employerProfile.findUnique({ where: { userId: req.user.id } });
    if (job.employerId !== employer.id) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    const updatedJob = await prisma.job.update({
      where: { id: req.params.id },
      data: { status: status.toUpperCase() }
    });

    res.json({ success: true, data: updatedJob });
  } catch (error) {
    next(error);
  }
};

exports.getMatches = async (req, res, next) => {
  try {
    const job = await prisma.job.findUnique({ where: { id: req.params.id } });
    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }

    const matches = await matchingService.findMatches(job);

    res.json({ success: true, data: matches });
  } catch (error) {
    next(error);
  }
};

exports.hireWorker = async (req, res, next) => {
  try {
    const { id: jobId, workerId } = req.params;

    const job = await prisma.job.findUnique({ where: { id: jobId } });
    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }

    const worker = await prisma.workerProfile.findUnique({ where: { id: workerId } });
    if (!worker) {
      return res.status(404).json({ success: false, message: 'Worker not found' });
    }

    const existingApplication = await prisma.jobApplication.findUnique({
      where: { jobId_workerId: { jobId, workerId } }
    });

    let application;
    if (existingApplication) {
      application = await prisma.jobApplication.update({
        where: { id: existingApplication.id },
        data: { status: 'HIRED' }
      });
    } else {
      application = await prisma.jobApplication.create({
        data: {
          jobId,
          workerId,
          status: 'HIRED'
        }
      });
    }

    const hiredCount = await prisma.jobApplication.count({
      where: { jobId, status: 'HIRED' }
    });

    if (hiredCount >= job.workersNeeded) {
      await prisma.job.update({
        where: { id: jobId },
        data: { status: 'IN_PROGRESS' }
      });
    }

    res.json({ success: true, data: application });
  } catch (error) {
    next(error);
  }
};
