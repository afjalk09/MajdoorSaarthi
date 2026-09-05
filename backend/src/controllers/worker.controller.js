const prisma = require('../lib/prisma');
const { createNotification } = require('./notification.controller');
const { releaseWorkerFromJob } = require('./job.controller');

exports.getProfile = async (req, res, next) => {
  try {
    const profile = await prisma.workerProfile.findUnique({
      where: { userId: req.user.id }
    });

    if (!profile) {
      return res.status(404).json({ success: false, message: 'Profile not found' });
    }

    res.json({ success: true, data: profile });
  } catch (error) {
    next(error);
  }
};

exports.updateProfile = async (req, res, next) => {
  try {
    const {
      full_name, skills, experience_years, location_lat, location_lng,
      location_text, availability, expected_wage_min, expected_wage_max, wage_type
    } = req.body;

    const profile = await prisma.workerProfile.findUnique({ where: { userId: req.user.id } });

    if (!profile) {
      const newProfile = await prisma.workerProfile.create({
        data: {
          userId: req.user.id,
          fullName: full_name,
          skills: skills || [],
          experienceYears: experience_years || 0,
          locationLat: location_lat,
          locationLng: location_lng,
          locationText: location_text,
          availability: availability?.toUpperCase() || 'AVAILABLE',
          expectedWageMin: expected_wage_min,
          expectedWageMax: expected_wage_max,
          wageType: wage_type?.toUpperCase() || 'DAILY'
        }
      });
      return res.json({ success: true, data: newProfile });
    }

    const updatedProfile = await prisma.workerProfile.update({
      where: { userId: req.user.id },
      data: {
        fullName: full_name,
        skills: skills || [],
        experienceYears: experience_years || 0,
        locationLat: location_lat,
        locationLng: location_lng,
        locationText: location_text,
        expectedWageMin: expected_wage_min,
        expectedWageMax: expected_wage_max,
        wageType: wage_type?.toUpperCase() || 'DAILY'
      }
    });

    res.json({ success: true, data: updatedProfile });
  } catch (error) {
    next(error);
  }
};

exports.uploadDocument = async (req, res, next) => {
  try {
    const { doc_type, file_url } = req.body;

    if (!doc_type || !file_url) {
      return res.status(400).json({ success: false, message: 'doc_type and file_url required' });
    }

    const document = await prisma.document.create({
      data: {
        userId: req.user.id,
        docType: doc_type.toUpperCase(),
        fileUrl: file_url
      }
    });

    res.status(201).json({ success: true, data: document });
  } catch (error) {
    next(error);
  }
};

exports.getAvailableJobs = async (req, res, next) => {
  try {
    const profile = await prisma.workerProfile.findUnique({ where: { userId: req.user.id } });

    if (!profile) {
      return res.status(400).json({ success: false, message: 'Complete your profile first' });
    }

    const where = { status: 'OPEN' };

    // Match by location text (case-insensitive). Jobs without a location are visible to all.
    const workerLocation = (profile.locationText || '').trim();
    if (workerLocation) {
      where.OR = [
        { locationText: null },
        { locationText: { equals: workerLocation, mode: 'insensitive' } }
      ];
    }

    const jobs = await prisma.job.findMany({
      where,
      include: { employer: true, jobRoles: true },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ success: true, data: jobs });
  } catch (error) {
    next(error);
  }
};

exports.applyToJob = async (req, res, next) => {
  try {
    const { id: jobId } = req.params;
    const { jobRoleId } = req.body || {};

    const profile = await prisma.workerProfile.findUnique({ where: { userId: req.user.id } });
    if (!profile) {
      return res.status(400).json({ success: false, message: 'Complete your profile first' });
    }

    if (profile.availability === 'BUSY') {
      return res.status(400).json({
        success: false,
        message: 'You are already assigned to a job and cannot apply for another'
      });
    }

    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: {
        employer: { select: { userId: true } },
        jobRoles: true
      }
    });
    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }

    if (job.status !== 'OPEN') {
      return res.status(400).json({ success: false, message: 'This job is no longer accepting applications' });
    }

    const existingApplication = await prisma.jobApplication.findUnique({
      where: { jobId_workerId: { jobId, workerId: profile.id } }
    });

    if (existingApplication) {
      return res.status(400).json({ success: false, message: 'Already applied' });
    }

    // Resolve the role the worker is applying for
    let appliedRoleId = jobRoleId;

    if (appliedRoleId) {
      const role = await prisma.jobRole.findUnique({
        where: { id: appliedRoleId },
        include: { applications: { where: { status: { in: ['HIRED', 'COMPLETED'] } } } }
      });
      if (!role || role.jobId !== jobId) {
        return res.status(400).json({ success: false, message: 'Invalid role' });
      }
      if (role.applications.length >= role.count) {
        return res.status(400).json({ success: false, message: 'Role is already fully filled' });
      }
    } else {
      // Auto-pick the best matching role that still has space
      let bestRole = null;
      let bestScore = 0;

      for (const role of job.jobRoles) {
        if (role.filledCount >= role.count) continue;

        const workerSkills = profile.skills || [];
        const roleSkills = role.skills || [];
        const matchedSkills = workerSkills.filter(s => roleSkills.includes(s));
        const score = roleSkills.length > 0 ? matchedSkills.length / roleSkills.length : 0;

        if (score > bestScore) {
          bestScore = score;
          bestRole = role;
        }
      }

      if (bestRole) {
        appliedRoleId = bestRole.id;
      }
    }

    const application = await prisma.jobApplication.create({
      data: {
        jobId,
        workerId: profile.id,
        status: 'PENDING',
        jobRoleId: appliedRoleId
      }
    });

    // Notify the employer to review the application
    if (job.employer?.userId) {
      await createNotification(
        job.employer.userId,
        'APPLICATION_RECEIVED',
        'New Job Application',
        `${profile.fullName} applied for "${job.title}". Review and accept the application.`,
        jobId
      );
    }

    res.status(201).json({ success: true, data: application });
  } catch (error) {
    next(error);
  }
};

exports.cancelHiredJob = async (req, res, next) => {
  try {
    const { id: jobId } = req.params;

    const profile = await prisma.workerProfile.findUnique({ where: { userId: req.user.id } });
    if (!profile) {
      return res.status(400).json({ success: false, message: 'Complete your profile first' });
    }

    const app = await prisma.jobApplication.findUnique({
      where: { jobId_workerId: { jobId, workerId: profile.id } },
      include: { job: { include: { employer: { select: { userId: true } } } } }
    });

    if (!app || app.status !== 'HIRED') {
      return res.status(400).json({ success: false, message: 'You are not assigned to this job' });
    }

    if (app.job.status === 'COMPLETED' || app.job.status === 'CANCELLED') {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel a job that is already ${app.job.status.toLowerCase()}`
      });
    }

    const result = await releaseWorkerFromJob({ jobId, workerId: profile.id, appStatus: 'WITHDRAWN' });
    if (!result.released) {
      return res.status(400).json({ success: false, message: 'You are not assigned to this job' });
    }

    if (app.job.employer?.userId) {
      await createNotification(
        app.job.employer.userId,
        'WORKER_CANCELLED',
        'Worker Cancelled Job',
        `${profile.fullName} cancelled "${app.job.title}". The slot is now open.`,
        jobId
      );
    }

    res.json({ success: true, data: { message: 'Job cancelled' } });
  } catch (error) {
    next(error);
  }
};

exports.getApplications = async (req, res, next) => {
  try {
    const profile = await prisma.workerProfile.findUnique({ where: { userId: req.user.id } });

    if (!profile) {
      return res.status(400).json({ success: false, message: 'Complete your profile first' });
    }

    const applications = await prisma.jobApplication.findMany({
      where: { workerId: profile.id },
      include: { job: { include: { employer: true } } },
      orderBy: { appliedAt: 'desc' }
    });

    res.json({ success: true, data: applications });
  } catch (error) {
    next(error);
  }
};

exports.updateMyWorkStatus = async (req, res, next) => {
  try {
    const { id: jobId } = req.params;
    const { workStatus, workNote } = req.body || {};

    const allowed = ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED'];
    if (workStatus && !allowed.includes(workStatus)) {
      return res.status(400).json({ success: false, message: 'Invalid work status' });
    }

    const profile = await prisma.workerProfile.findUnique({ where: { userId: req.user.id } });
    if (!profile) {
      return res.status(400).json({ success: false, message: 'Complete your profile first' });
    }

    const job = await prisma.job.findUnique({ where: { id: jobId } });
    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }

    if (job.status === 'COMPLETED' || job.status === 'CANCELLED') {
      return res.status(400).json({ success: false, message: 'Job is no longer active' });
    }

    const app = await prisma.jobApplication.findUnique({
      where: { jobId_workerId: { jobId, workerId: profile.id } }
    });
    if (!app || app.status !== 'HIRED') {
      return res.status(400).json({ success: false, message: 'You are not hired on this job' });
    }

    const data = {};
    if (workStatus) data.workStatus = workStatus;
    if (workNote !== undefined) data.workNote = workNote;

    const updated = await prisma.jobApplication.update({
      where: { id: app.id },
      data
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};
