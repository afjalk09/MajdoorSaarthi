const prisma = require('../lib/prisma');
const matchingService = require('../services/matching.service');
const { createNotification } = require('./notification.controller');

// Release a worker from a job (worker cancels / employer removes).
// Keeps application status, worker availability, role fill counts and job status consistent.
const releaseWorkerFromJob = async ({ jobId, workerId, appStatus }) => {
  const app = await prisma.jobApplication.findUnique({
    where: { jobId_workerId: { jobId, workerId } }
  });

  if (!app || app.status !== 'HIRED') return { released: false };

  await prisma.jobApplication.update({
    where: { id: app.id },
    data: { status: appStatus }
  });

  await prisma.workerProfile.update({
    where: { id: workerId },
    data: { availability: 'AVAILABLE' }
  });

  // Recompute role fill counts and job status from actual hired applications
  await recomputeJobFill(jobId);

  return { released: true };
};

exports.releaseWorkerFromJob = releaseWorkerFromJob;

// Recompute per-role filledCount and job status from actual hired applications.
// A job becomes IN_PROGRESS once its total hired headcount equals workersNeeded,
// and reopens if staff drop below that while it was in progress.
const recomputeJobFill = async (jobId) => {
  const job = await prisma.job.findUnique({
    where: { id: jobId },
    select: {
      status: true,
      workersNeeded: true,
      jobRoles: { select: { id: true } }
    }
  });

  if (!job) return { filled: false };

  if (job.status === 'COMPLETED' || job.status === 'CANCELLED') {
    return { filled: job.status === 'COMPLETED' };
  }

  const apps = await prisma.jobApplication.findMany({
    where: { jobId, status: { in: ['HIRED', 'COMPLETED'] } },
    select: { jobRoleId: true }
  });

  const roleCounts = {};
  apps.forEach(a => {
    if (a.jobRoleId) roleCounts[a.jobRoleId] = (roleCounts[a.jobRoleId] || 0) + 1;
  });

  const hiredCount = apps.length;
  const nextStatus = hiredCount >= job.workersNeeded ? 'IN_PROGRESS' : 'OPEN';

  await Promise.all(job.jobRoles.map(role =>
    prisma.jobRole.update({
      where: { id: role.id },
      data: { filledCount: roleCounts[role.id] || 0 }
    })
  ));

  const updatedJob = await prisma.job.update({
    where: { id: jobId },
    data: { status: nextStatus }
  });

  return { filled: nextStatus === 'IN_PROGRESS', job: updatedJob };
};

exports.recomputeJobFill = recomputeJobFill;

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

    // Notify available workers whose skills match the job (skill-gated, not location-only)
    const locationWorkers = await prisma.workerProfile.findMany({
      where: {
        availability: { not: 'BUSY' },
        ...(requiredSkills.length > 0 ? { skills: { hasSome: requiredSkills } } : {})
      },
      select: { userId: true }
    });

    if (locationWorkers.length > 0) {
      const skillsLabel = requiredSkills.length > 0 ? ` Looking for: ${requiredSkills.join(', ')}.` : '';
      await Promise.all(locationWorkers.map(worker =>
        createNotification(
          worker.userId,
          'JOB_POSTED',
          'New Job For You',
          `New job "${job.title}" has been posted${job.locationText ? ` in ${job.locationText}` : ''}.${skillsLabel} Wage: ₹${job.wageAmount}/${job.wageType.toLowerCase()}`,
          job.id
        )
      ));
    }

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
      include: {
        jobRoles: {
          include: {
            applications: {
              where: { status: { in: ['HIRED', 'COMPLETED', 'OFFERED'] } },
              select: { status: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Derive real per-role capacity: only HIRED/COMPLETED fill a seat; pending offers don't.
    const jobsWithRoleCounts = jobs.map(job => ({
      ...job,
      jobRoles: job.jobRoles.map(role => {
        const offeredCount = role.applications.filter(a => a.status === 'OFFERED').length;
        const hiredCount = role.applications.length - offeredCount;
        return {
          ...role,
          applications: undefined,
          offeredCount,
          remainingCapacity: role.count - hiredCount
        };
      })
    }));

    res.json({ success: true, data: jobsWithRoleCounts });
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
        jobRoles: {
          include: {
            applications: {
              where: { status: { in: ['HIRED', 'COMPLETED', 'OFFERED'] } },
              select: { status: true }
            }
          }
        },
        reviews: true,
        applications: {
          where: { status: { in: ['HIRED', 'COMPLETED'] } },
          select: {
            jobRoleId: true,
            workStatus: true,
            workNote: true,
            worker: {
              include: { user: { select: { id: true } } }
            }
          }
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

    const jobRoles = job.jobRoles.map(role => {
      const offeredCount = (role.applications || []).filter(a => a.status === 'OFFERED').length;
      const hiredCount = ((role.applications || []).length) - offeredCount;
      return {
        ...role,
        applications: undefined,
        filledCount: roleHiredCount[role.id] || 0,
        offeredCount,
        remainingCapacity: role.count - hiredCount
      };
    });

    // Unique hired workers with user id + name (used for ratings/feedback)
    const hiredWorkers = [...new Map(
      job.applications
        .filter(a => a.worker)
        .map(a => [a.worker.id, {
          id: a.worker.id,
          userId: a.worker.user.id,
          fullName: a.worker.fullName,
          skills: a.worker.skills,
          workStatus: a.workStatus,
          workNote: a.workNote
        }])
    ).values()];

    // Review progress for the current user
    const myReviews = job.reviews.filter(r => r.reviewerId === req.user.id);
    const requiredReviews = req.user.role === 'EMPLOYER'
      ? hiredWorkers.length
      : (hiredWorkers.length > 0 ? 1 : 0);
    const reviewComplete = requiredReviews === 0 || (requiredReviews > 0 && myReviews.length >= requiredReviews);

    res.json({
      success: true,
      data: {
        ...job,
        jobRoles,
        hiredWorkers,
        myReviews,
        requiredReviews,
        reviewComplete
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.getJobApplications = async (req, res, next) => {
  try {
    const { id } = req.params;

    const job = await prisma.job.findUnique({ where: { id } });
    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }

    const employer = await prisma.employerProfile.findUnique({ where: { userId: req.user.id } });
    if (!employer || job.employerId !== employer.id) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    const applications = await prisma.jobApplication.findMany({
      where: { jobId: id },
      include: { worker: true, jobRole: true },
      orderBy: { appliedAt: 'desc' }
    });

    res.json({ success: true, data: applications });
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

    // Keep role fill counts and job status consistent with actual hires
    await recomputeJobFill(id);

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
    const newStatus = status.toUpperCase();
    const job = await prisma.job.findUnique({
      where: { id: req.params.id },
      include: { applications: { where: { status: 'HIRED' } } }
    });

    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }

    const employer = await prisma.employerProfile.findUnique({ where: { userId: req.user.id } });
    if (job.employerId !== employer.id) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    const updatedJob = await prisma.job.update({
      where: { id: req.params.id },
      data: { status: newStatus }
    });

    // If the job is cancelled, free the hired workers and notify them
    if (newStatus === 'CANCELLED') {
      const hiredWorkerIds = [...new Set(job.applications.map(a => a.workerId))];

      for (const workerId of hiredWorkerIds) {
        await prisma.workerProfile.update({
          where: { id: workerId },
          data: { availability: 'AVAILABLE' }
        });
      }

      for (const app of job.applications) {
        const worker = await prisma.workerProfile.findUnique({
          where: { id: app.workerId },
          select: { userId: true }
        });
        if (worker) {
          await createNotification(
            worker.userId,
            'JOB_CANCELLED',
            'Job Cancelled',
            `The job "${job.title}" you were assigned to has been cancelled. You are now available for new jobs.`,
            job.id
          );
        }
      }
    }

    // If the job is completed, free the hired workers and notify them
    if (newStatus === 'COMPLETED') {
      // Mark all hired applications as completed
      await prisma.jobApplication.updateMany({
        where: { jobId: job.id, status: 'HIRED' },
        data: { status: 'COMPLETED', workStatus: 'COMPLETED' }
      });

      const hiredWorkerIds = [...new Set(job.applications.map(a => a.workerId))];

      for (const workerId of hiredWorkerIds) {
        await prisma.workerProfile.update({
          where: { id: workerId },
          data: { availability: 'AVAILABLE' }
        });
      }

      for (const app of job.applications) {
        const worker = await prisma.workerProfile.findUnique({
          where: { id: app.workerId },
          select: { userId: true }
        });
        if (worker) {
          await createNotification(
            worker.userId,
            'JOB_COMPLETED',
            'Job Completed',
            `The job "${job.title}" has been marked as completed.`,
            job.id
          );
        }
      }
    }

    res.json({ success: true, data: updatedJob });
  } catch (error) {
    next(error);
  }
};

exports.getMatches = async (req, res, next) => {
  try {
    const job = await prisma.job.findUnique({
      where: { id: req.params.id },
      include: {
        jobRoles: {
          include: {
            applications: {
              where: { status: { in: ['HIRED', 'COMPLETED', 'OFFERED'] } },
              select: { status: true }
            }
          }
        }
      }
    });
    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }

    // Open capacity per role (pending offers don't reserve a slot)
    const remainingById = {};
    job.jobRoles.forEach(role => {
      const offeredCount = role.applications.filter(a => a.status === 'OFFERED').length;
      const hiredCount = role.applications.length - offeredCount;
      remainingById[role.id] = role.count - hiredCount;
      role.remainingCapacity = role.count - hiredCount;
      role.applications = undefined;
    });

    const matches = await matchingService.findMatches(job);

    // For each match, determine which role they best fit
    const matchesWithRoles = matches.map(match => {
      let bestRole = null;
      let bestScore = 0;

      for (const role of job.jobRoles) {
        if (remainingById[role.id] <= 0) continue; // Role has no real space left

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
          count: bestRole.count,
          remainingCapacity: bestRole.remainingCapacity
        } : null,
        jobRoles: job.jobRoles.map(role => ({
          id: role.id,
          roleName: role.roleName,
          filledCount: role.filledCount,
          count: role.count,
          remainingCapacity: role.remainingCapacity
        }))
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
      include: {
        jobRoles: {
          include: {
            applications: {
              where: { status: { in: ['HIRED', 'COMPLETED'] } },
              select: { status: true }
            }
          }
        }
      }
    });
    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }

    const worker = await prisma.workerProfile.findUnique({ where: { id: workerId } });
    if (!worker) {
      return res.status(404).json({ success: false, message: 'Worker not found' });
    }

    if (worker.availability !== 'AVAILABLE') {
      return res.status(400).json({
        success: false,
        message: 'Worker is not available (already assigned to another job)'
      });
    }

    // Honor the role the worker applied for, if any, else auto-assign
    const existingApplication = await prisma.jobApplication.findUnique({
      where: { jobId_workerId: { jobId, workerId } }
    });

    let assignedRoleId = jobRoleId || existingApplication?.jobRoleId || null;

    // Open capacity per role = count - (HIRED + COMPLETED). Pending OFFERED apps do NOT
    // reserve a slot, so an employer can keep offering until some worker accepts.
    const remainingById = {};
    for (const role of job.jobRoles) {
      remainingById[role.id] = role.count - role.applications.length;
    }

    if (!assignedRoleId) {
      // Auto-assign based on worker skills matching role skills (only roles with real space)
      let bestRole = null;
      let bestScore = 0;

      for (const role of job.jobRoles) {
        if (remainingById[role.id] <= 0) continue;

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

    if (!assignedRoleId) {
      // Fall back to the role with the most remaining capacity so a hire is never role-less
      let bestRole = null;
      let bestRemaining = 0;

      for (const role of job.jobRoles) {
        const remaining = remainingById[role.id];
        if (remaining >= 0 && remaining > bestRemaining) {
          bestRemaining = remaining;
          bestRole = role;
        }
      }

      if (bestRole) {
        assignedRoleId = bestRole.id;
      }
    }

    // Every hire must map to a role; reject if the job has no open slots
    if (!assignedRoleId) {
      return res.status(400).json({ success: false, message: 'No available slots in this job' });
    }

    // Validate the role belongs to the job and still has space (offers reserve slots too)
    if (remainingById[assignedRoleId] === undefined || remainingById[assignedRoleId] < 0) {
      return res.status(400).json({ success: false, message: 'Invalid role' });
    }
    if (remainingById[assignedRoleId] <= 0) {
      return res.status(400).json({ success: false, message: 'Role already fully filled' });
    }

    let application;
    if (existingApplication) {
      application = await prisma.jobApplication.update({
        where: { id: existingApplication.id },
        data: {
          status: 'OFFERED',
          jobRoleId: assignedRoleId
        }
      });
    } else {
      application = await prisma.jobApplication.create({
        data: {
          jobId,
          workerId,
          status: 'OFFERED',
          jobRoleId: assignedRoleId
        }
      });
    }

    // Notify the worker with the offered role and request accept/reject.
    // Worker stays AVAILABLE until they accept; slot is not filled by an offer.
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
        'JOB_OFFER',
        'New Job Offer',
        `You have been offered ${roleName} for "${job.title}". Wage: ₹${job.wageAmount}/${job.wageType.toLowerCase()}. Accept or reject the offer.`,
        jobId,
        application.id
      );
    }

    res.json({ success: true, data: application });
  } catch (error) {
    next(error);
  }
};

exports.removeWorkerFromJob = async (req, res, next) => {
  try {
    const { id: jobId, workerId } = req.params;

    const job = await prisma.job.findUnique({ where: { id: jobId } });
    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }

    const employer = await prisma.employerProfile.findUnique({ where: { userId: req.user.id } });
    if (!employer || job.employerId !== employer.id) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    if (job.status === 'COMPLETED' || job.status === 'CANCELLED') {
      return res.status(400).json({
        success: false,
        message: 'Cannot remove workers from a completed or cancelled job'
      });
    }

    const worker = await prisma.workerProfile.findUnique({
      where: { id: workerId },
      include: { user: { select: { id: true } } }
    });
    if (!worker) {
      return res.status(404).json({ success: false, message: 'Worker not found' });
    }

    const result = await releaseWorkerFromJob({ jobId, workerId, appStatus: 'REJECTED' });
    if (!result.released) {
      return res.status(400).json({ success: false, message: 'Worker is not hired on this job' });
    }

    if (worker.user) {
      await createNotification(
        worker.user.id,
        'REMOVED_FROM_JOB',
        'Removed from Job',
        `You have been removed from "${job.title}". You are now available for new jobs.`,
        jobId
      );
    }

    res.json({ success: true, data: { message: 'Worker removed from job' } });
  } catch (error) {
    next(error);
  }
};

exports.updateWorkerWorkStatus = async (req, res, next) => {
  try {
    const { id: jobId, workerId } = req.params;
    const { workStatus, workNote } = req.body || {};

    const allowed = ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED'];
    if (workStatus && !allowed.includes(workStatus)) {
      return res.status(400).json({ success: false, message: 'Invalid work status' });
    }

    const job = await prisma.job.findUnique({ where: { id: jobId } });
    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }

    if (job.status === 'COMPLETED' || job.status === 'CANCELLED') {
      return res.status(400).json({ success: false, message: 'Job is no longer active' });
    }

    const employer = await prisma.employerProfile.findUnique({ where: { userId: req.user.id } });
    if (!employer || job.employerId !== employer.id) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    const app = await prisma.jobApplication.findUnique({
      where: { jobId_workerId: { jobId, workerId } }
    });
    if (!app || app.status !== 'HIRED') {
      return res.status(400).json({ success: false, message: 'Worker is not hired on this job' });
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

    // Mark all hired applications as completed
    await prisma.jobApplication.updateMany({
      where: { jobId, status: 'HIRED' },
      data: { status: 'COMPLETED', workStatus: 'COMPLETED' }
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
