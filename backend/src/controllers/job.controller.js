const prisma = require('../lib/prisma');
const matchingService = require('../services/matching.service');
const { createNotification } = require('./notification.controller');

exports.createJob = async (req, res, next) => {
  try {
    const {
      title, description, role_requirements,
      location_lat, location_lng, location_text,
      wage_amount, wage_type, duration_days
    } = req.body;

    if (!title || !wage_amount || !wage_type) {
      return res.status(400).json({ success: false, message: 'Title, wage_amount, wage_type required' });
    }

    if (!role_requirements || !Array.isArray(role_requirements) || role_requirements.length === 0) {
      return res.status(400).json({ success: false, message: 'At least one role requirement is needed' });
    }

    const employer = await prisma.employerProfile.findUnique({ where: { userId: req.user.id } });
    if (!employer) {
      return res.status(400).json({ success: false, message: 'Complete your profile first' });
    }

    // Compute workersNeeded and requiredSkills from role_requirements
    const workersNeeded = role_requirements.reduce((sum, r) => sum + (r.count || 1), 0);
    const requiredSkills = [...new Set(role_requirements.flatMap(r => r.skills || []))];

    const job = await prisma.job.create({
      data: {
        employerId: employer.id,
        title,
        description,
        requiredSkills,
        workersNeeded,
        locationLat: location_lat,
        locationLng: location_lng,
        locationText: location_text,
        wageAmount: parseFloat(wage_amount),
        wageType: wage_type.toUpperCase(),
        durationDays: duration_days ? parseInt(duration_days) : null,
        jobRoles: {
          create: role_requirements.map(r => ({
            roleName: r.roleName,
            skills: r.skills || [],
            count: r.count || 1
          }))
        }
      },
      include: { jobRoles: true }
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
      include: { jobRoles: true },
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
      include: {
        employer: true,
        jobRoles: true,
        applications: {
          where: { status: 'HIRED' },
          select: { jobRoleId: true }
        }
      }
    });

    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }

    // Compute filledCount for each role from actual hired applications
    const roleHiredCount = {};
    job.applications.forEach(app => {
      if (app.jobRoleId) {
        roleHiredCount[app.jobRoleId] = (roleHiredCount[app.jobRoleId] || 0) + 1;
      }
    });

    const jobRoles = job.jobRoles.map(role => ({
      ...role,
      filledCount: roleHiredCount[role.id] || 0
    }));

    res.json({ success: true, data: { ...job, jobRoles } });
  } catch (error) {
    next(error);
  }
};

exports.updateJob = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      title, description, role_requirements,
      location_lat, location_lng, location_text,
      wage_amount, wage_type, duration_days
    } = req.body;

    const job = await prisma.job.findUnique({ where: { id } });
    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }

    const employer = await prisma.employerProfile.findUnique({ where: { userId: req.user.id } });
    if (job.employerId !== employer.id) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    if (job.status !== 'OPEN') {
      return res.status(400).json({ success: false, message: 'Can only edit open jobs' });
    }

    // Compute workersNeeded and requiredSkills from role_requirements
    let workersNeeded = job.workersNeeded;
    let requiredSkills = job.requiredSkills;

    if (role_requirements && Array.isArray(role_requirements)) {
      workersNeeded = role_requirements.reduce((sum, r) => sum + (r.count || 1), 0);
      requiredSkills = [...new Set(role_requirements.flatMap(r => r.skills || []))];
    }

    const updatedJob = await prisma.job.update({
      where: { id },
      data: {
        title,
        description,
        requiredSkills,
        workersNeeded,
        locationLat: location_lat,
        locationLng: location_lng,
        locationText: location_text,
        wageAmount: wage_amount ? parseFloat(wage_amount) : job.wageAmount,
        wageType: wage_type ? wage_type.toUpperCase() : job.wageType,
        durationDays: duration_days ? parseInt(duration_days) : job.durationDays
      }
    });

    // Update role requirements if provided
    if (role_requirements && Array.isArray(role_requirements)) {
      // Delete existing roles
      await prisma.jobRole.deleteMany({ where: { jobId: id } });

      // Create new roles
      if (role_requirements.length > 0) {
        await prisma.jobRole.createMany({
          data: role_requirements.map(r => ({
            jobId: id,
            roleName: r.roleName,
            skills: r.skills || [],
            count: r.count || 1
          }))
        });
      }
    }

    const jobWithRoles = await prisma.job.findUnique({
      where: { id },
      include: { jobRoles: true }
    });

    res.json({ success: true, data: jobWithRoles });
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
    const job = await prisma.job.findUnique({
      where: { id: req.params.id },
      include: { jobRoles: true }
    });
    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }

    const matches = await matchingService.findMatches(job);

    // For each match, determine which role they best fit
    const matchesWithRoles = matches.map(match => {
      let bestRole = null;
      let bestScore = 0;

      for (const role of job.jobRoles) {
        if (role.filledCount >= role.count) continue; // Role already full

        const workerSkills = match.skills || [];
        const roleSkills = role.skills || [];
        const matchedSkills = workerSkills.filter(s => roleSkills.includes(s));
        const score = roleSkills.length > 0 ? matchedSkills.length / roleSkills.length : 0;

        if (score > bestScore) {
          bestScore = score;
          bestRole = role;
        }
      }

      return {
        ...match,
        suggestedRole: bestRole ? {
          id: bestRole.id,
          roleName: bestRole.roleName,
          filledCount: bestRole.filledCount,
          count: bestRole.count
        } : null
      };
    });

    res.json({ success: true, data: matchesWithRoles });
  } catch (error) {
    next(error);
  }
};

exports.hireWorker = async (req, res, next) => {
  try {
    const { id: jobId, workerId } = req.params;
    const { jobRoleId } = req.body;

    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: { jobRoles: true }
    });
    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }

    const worker = await prisma.workerProfile.findUnique({ where: { id: workerId } });
    if (!worker) {
      return res.status(404).json({ success: false, message: 'Worker not found' });
    }

    // Determine which role to assign
    let assignedRoleId = jobRoleId;

    if (!assignedRoleId) {
      // Auto-assign based on worker skills matching role skills
      let bestRole = null;
      let bestScore = 0;

      for (const role of job.jobRoles) {
        if (role.filledCount >= role.count) continue;

        const workerSkills = worker.skills || [];
        const roleSkills = role.skills || [];
        const matchedSkills = workerSkills.filter(s => roleSkills.includes(s));
        const score = roleSkills.length > 0 ? matchedSkills.length / roleSkills.length : 0;

        if (score > bestScore) {
          bestScore = score;
          bestRole = role;
        }
      }

      if (bestRole) {
        assignedRoleId = bestRole.id;
      }
    }

    // Validate the role exists and has space
    if (assignedRoleId) {
      const role = await prisma.jobRole.findUnique({ where: { id: assignedRoleId } });
      if (!role || role.jobId !== jobId) {
        return res.status(400).json({ success: false, message: 'Invalid role' });
      }
      if (role.filledCount >= role.count) {
        return res.status(400).json({ success: false, message: 'Role already fully filled' });
      }
    }

    const existingApplication = await prisma.jobApplication.findUnique({
      where: { jobId_workerId: { jobId, workerId } }
    });

    let application;
    if (existingApplication) {
      application = await prisma.jobApplication.update({
        where: { id: existingApplication.id },
        data: {
          status: 'HIRED',
          jobRoleId: assignedRoleId
        }
      });
    } else {
      application = await prisma.jobApplication.create({
        data: {
          jobId,
          workerId,
          status: 'HIRED',
          jobRoleId: assignedRoleId
        }
      });
    }

    // Update filledCount for the assigned role
    if (assignedRoleId) {
      const hiredForRole = await prisma.jobApplication.count({
        where: { jobId, jobRoleId: assignedRoleId, status: 'HIRED' }
      });

      await prisma.jobRole.update({
        where: { id: assignedRoleId },
        data: { filledCount: hiredForRole }
      });
    }

    // Check if all roles are fully filled
    const allRoles = await prisma.jobRole.findMany({ where: { jobId } });
    const allFilled = allRoles.length > 0 && allRoles.every(r => r.filledCount >= r.count);

    if (allFilled) {
      await prisma.job.update({
        where: { id: jobId },
        data: { status: 'IN_PROGRESS' }
      });
    }

    // Create notification for the hired worker
    const workerUser = await prisma.workerProfile.findUnique({
      where: { id: workerId },
      select: { userId: true }
    });

    if (workerUser) {
      const roleAssigned = assignedRoleId
        ? job.jobRoles.find(r => r.id === assignedRoleId)
        : null;
      const roleName = roleAssigned ? roleAssigned.roleName : 'the team';

      await createNotification(
        workerUser.userId,
        'HIRED',
        'You have been hired!',
        `You have been hired for "${job.title}" as ${roleName}. Wage: ₹${job.wageAmount}/${job.wageType.toLowerCase()}`,
        jobId
      );
    }

    res.json({ success: true, data: application });
  } catch (error) {
    next(error);
  }
};

exports.completeJob = async (req, res, next) => {
  try {
    const { id: jobId } = req.params;
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });

    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: {
        employer: true,
        applications: { where: { status: 'HIRED' }, include: { worker: true } }
      }
    });

    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }

    // Verify user is part of this job
    let isPartOfJob = false;
    if (user.role === 'EMPLOYER') {
      const employer = await prisma.employerProfile.findUnique({ where: { userId: req.user.id } });
      if (employer && job.employerId === employer.id) isPartOfJob = true;
    } else if (user.role === 'WORKER') {
      const worker = await prisma.workerProfile.findUnique({ where: { userId: req.user.id } });
      if (worker) {
        const app = job.applications.find(a => a.workerId === worker.id);
        if (app) isPartOfJob = true;
      }
    }

    if (!isPartOfJob) {
      return res.status(403).json({ success: false, message: 'You are not part of this job' });
    }

    const updatedJob = await prisma.job.update({
      where: { id: jobId },
      data: { status: 'COMPLETED' }
    });

    // Update all hired workers' availability back to AVAILABLE
    for (const app of job.applications) {
      await prisma.workerProfile.update({
        where: { id: app.workerId },
        data: { availability: 'AVAILABLE' }
      });
    }

    // Notify all hired workers
    for (const app of job.applications) {
      await createNotification(
        app.worker.userId,
        'JOB_COMPLETED',
        'Job Completed',
        `The job "${job.title}" has been marked as completed.`,
        jobId
      );
    }

    // Notify employer if worker initiated
    if (user.role === 'WORKER') {
      await createNotification(
        job.employer.userId,
        'JOB_COMPLETED',
        'Job Completed',
        `The job "${job.title}" has been marked as completed by a worker.`,
        jobId
      );
    }

    res.json({ success: true, data: updatedJob });
  } catch (error) {
    next(error);
  }
};
