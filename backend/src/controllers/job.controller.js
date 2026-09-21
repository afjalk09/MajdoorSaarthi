const prisma = require('../lib/prisma');
const matchingService = require('../services/matching.service');
const { createNotification } = require('./notification.controller');
const roleService = require('../services/role.service');

// Validate role requirements against the taxonomy. Returns the cleaned
// requirements array, or null if validation failed (caller sends the error).
const prepareRoleRequirements = async (roleRequirements) => {
  if (!Array.isArray(roleRequirements) || roleRequirements.length === 0) {
    return { error: 'At least one role requirement is needed' };
  }

  const roles = await prisma.workerRole.findMany({ where: { active: true } });

  const cleaned = [];
  for (const req of roleRequirements) {
    const rawName = (req.roleName || '').trim();
    if (!rawName) {
      return { error: 'Each role requirement needs a role name' };
    }

    const canonical = roleService.canonicalRoleName(roles, rawName);
    if (!canonical) {
      return { error: `Unknown role "${rawName}". Choose a role from the list.` };
    }

    cleaned.push({
      roleName: canonical,
      count: req.count || 1
    });
  }

  return { cleaned };
};

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
      wage_amount, wage_type, duration_days,
      start_date, end_date, start_time, end_time
    } = req.body;

    if (!title || !wage_amount || !wage_type) {
      return res.status(400).json({ success: false, message: 'Title, wage_amount, wage_type required' });
    }

    if (!role_requirements || !Array.isArray(role_requirements) || role_requirements.length === 0) {
      return res.status(400).json({ success: false, message: 'At least one role requirement is needed' });
    }

    const prepared = await prepareRoleRequirements(role_requirements);
    if (prepared.error) {
      return res.status(400).json({ success: false, message: prepared.error });
    }
    const roleRequirements = prepared.cleaned;

    const employer = await prisma.employerProfile.findUnique({ where: { userId: req.user.id } });
    if (!employer) {
      return res.status(400).json({ success: false, message: 'Complete your profile first' });
    }

    // Compute workersNeeded from role_requirements
    const workersNeeded = roleRequirements.reduce((sum, r) => sum + (r.count || 1), 0);
    const roleNames = roleRequirements.map(r => r.roleName);

    const job = await prisma.job.create({
      data: {
        employerId: employer.id,
        title,
        description,
        workersNeeded,
        locationLat: location_lat,
        locationLng: location_lng,
        locationText: location_text,
        wageAmount: parseFloat(wage_amount),
        wageType: wage_type.toUpperCase(),
        durationDays: duration_days ? parseInt(duration_days) : null,
        startDate: start_date ? new Date(start_date) : null,
        endDate: end_date ? new Date(end_date) : null,
        startTime: start_time || null,
        endTime: end_time || null,
        jobRoles: {
          create: roleRequirements.map(r => ({
            roleName: r.roleName,
            count: r.count || 1
          }))
        }
      },
      include: { jobRoles: true }
    });

    // Notify available workers whose profile roles overlap the job's roles
    const roleWorkers = await prisma.workerProfile.findMany({
      where: {
        availability: { not: 'BUSY' },
        roles: { hasSome: roleNames }
      },
      select: { userId: true }
    });

    if (roleWorkers.length > 0) {
      const roleLabel = roleNames.join(', ');
      const scheduleLabel = job.startDate
        ? ` Starts: ${job.startDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}${job.startTime ? `, ${job.startTime}–${job.endTime || '?'}` : ''}.`
        : '';
      await Promise.all(roleWorkers.map(worker =>
        createNotification(
          worker.userId,
          'JOB_POSTED',
          'New Job For You',
          `New job "${job.title}" has been posted${job.locationText ? ` in ${job.locationText}` : ''}. Looking for: ${roleLabel}.${scheduleLabel} Wage: ₹${job.wageAmount}/${job.wageType.toLowerCase()}`,
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
        },
        applications: {
          where: { status: { in: ['HIRED', 'COMPLETED'] } },
          select: { status: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Derive real per-role capacity: only HIRED/COMPLETED fill a seat; pending offers don't.
    const jobsWithRoleCounts = jobs.map(job => ({
      ...job,
      applications: undefined,
      totalHired: (job.applications || []).length,
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

    const roleNameById = {};
    job.jobRoles.forEach(role => { roleNameById[role.id] = role.roleName; });

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

    // Unique hired workers with user id + name + role (used for ratings/feedback + per-worker tracking)
    const hiredWorkers = [...new Map(
      job.applications
        .filter(a => a.worker)
        .map(a => [a.worker.id, {
          id: a.worker.id,
          userId: a.worker.user.id,
          fullName: a.worker.fullName,
          roles: a.worker.roles,
          workStatus: a.workStatus,
          workNote: a.workNote,
          jobRoleId: a.jobRoleId || null,
          roleName: (a.jobRoleId && roleNameById[a.jobRoleId]) || null
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
      wage_amount, wage_type, duration_days,
      start_date, end_date, start_time, end_time
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

    // Compute workersNeeded from role_requirements
    let workersNeeded = job.workersNeeded;
    let roleRequirements = null;

    if (role_requirements && Array.isArray(role_requirements)) {
      const prepared = await prepareRoleRequirements(role_requirements);
      if (prepared.error) {
        return res.status(400).json({ success: false, message: prepared.error });
      }
      roleRequirements = prepared.cleaned;
      workersNeeded = roleRequirements.reduce((sum, r) => sum + (r.count || 1), 0);
    }

    const updatedJob = await prisma.job.update({
      where: { id },
      data: {
        title,
        description,
        workersNeeded,
        locationLat: location_lat,
        locationLng: location_lng,
        locationText: location_text,
        wageAmount: wage_amount ? parseFloat(wage_amount) : job.wageAmount,
        wageType: wage_type ? wage_type.toUpperCase() : job.wageType,
        durationDays: duration_days ? parseInt(duration_days) : job.durationDays,
        startDate: start_date !== undefined ? (start_date ? new Date(start_date) : null) : job.startDate,
        endDate: end_date !== undefined ? (end_date ? new Date(end_date) : null) : job.endDate,
        startTime: start_time !== undefined ? (start_time || null) : job.startTime,
        endTime: end_time !== undefined ? (end_time || null) : job.endTime
      }
    });

    // Update role requirements if provided
    if (roleRequirements) {
      // Delete existing roles
      await prisma.jobRole.deleteMany({ where: { jobId: id } });

      // Create new roles
      if (roleRequirements.length > 0) {
        await prisma.jobRole.createMany({
          data: roleRequirements.map(r => ({
            jobId: id,
            roleName: r.roleName,
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
          await createNotification(
            worker.userId,
            'REVIEW_REQUIRED',
            'Review Required',
            `Please rate your employer for the job "${job.title}".`,
            job.id
          );
        }
      }

      // Notify employer to review workers
      await createNotification(
        job.employerId ? (await prisma.employerProfile.findUnique({ where: { id: job.employerId } }))?.userId : null,
        'REVIEW_REQUIRED',
        'Review Required',
        `Please rate your hired worker(s) for the job "${job.title}".`,
        job.id
      );
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

    // For each match, determine which role they best fit (role-name based only)
    const matchesWithRoles = matches.map(match => {
      let bestRole = null;
      let bestScore = -1;
      const workerRoles = (match.roles || []).map(r => r.toLowerCase());

      for (const role of job.jobRoles) {
        if (remainingById[role.id] <= 0) continue; // Role has no real space left

        const matchesWorkerRole = workerRoles.includes((role.roleName || '').toLowerCase());

        // A role the worker is registered for wins over an unrelated role.
        const score = matchesWorkerRole ? 1 : 0;

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
      // Auto-assign based on the worker's profile roles (only roles with real space).
      // A worker's taxonomy role wins over an unrelated role.
      const workerRoles = (worker.roles || []).map(r => r.toLowerCase());

      for (const role of job.jobRoles) {
        if (remainingById[role.id] <= 0) continue;

        if (workerRoles.includes((role.roleName || '').toLowerCase())) {
          assignedRoleId = role.id;
          break;
        }
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

exports.acceptApplication = async (req, res, next) => {
  try {
    const { id: jobId, workerId } = req.params;

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

    if (job.status === 'COMPLETED' || job.status === 'CANCELLED') {
      return res.status(400).json({ success: false, message: 'This job is no longer active' });
    }

    const employer = await prisma.employerProfile.findUnique({ where: { userId: req.user.id } });
    if (!employer || job.employerId !== employer.id) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    const app = await prisma.jobApplication.findUnique({
      where: { jobId_workerId: { jobId, workerId } }
    });
    if (!app) {
      return res.status(404).json({ success: false, message: 'Application not found' });
    }
    if (app.status !== 'PENDING') {
      return res.status(400).json({ success: false, message: 'No pending application from this worker' });
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

    // Resolve the role: honor the applied role if it still has space, else auto-assign.
    const remainingById = {};
    for (const role of job.jobRoles) {
      remainingById[role.id] = role.count - role.applications.length;
    }

    let assignedRoleId = app.jobRoleId;
    if (assignedRoleId && (remainingById[assignedRoleId] === undefined || remainingById[assignedRoleId] <= 0)) {
      assignedRoleId = null;
    }

    if (!assignedRoleId) {
      // Prefer a role the worker's profile matches, else the most-remaining-capacity role.
      const workerRoles = (worker.roles || []).map(r => r.toLowerCase());

      for (const role of job.jobRoles) {
        if (remainingById[role.id] <= 0) continue;
        if (workerRoles.includes((role.roleName || '').toLowerCase())) {
          assignedRoleId = role.id;
          break;
        }
      }

      if (!assignedRoleId) {
        let bestRemaining = 0;
        for (const role of job.jobRoles) {
          const remaining = remainingById[role.id];
          if (remaining >= 0 && remaining > bestRemaining) {
            bestRemaining = remaining;
            assignedRoleId = role.id;
          }
        }
      }
    }

    if (!assignedRoleId || remainingById[assignedRoleId] <= 0) {
      return res.status(400).json({ success: false, message: 'No available slots in this job' });
    }

    const updated = await prisma.jobApplication.update({
      where: { id: app.id },
      data: { status: 'HIRED', jobRoleId: assignedRoleId }
    });

    await prisma.workerProfile.update({
      where: { id: workerId },
      data: { availability: 'BUSY' }
    });

    const roleName = job.jobRoles.find(r => r.id === assignedRoleId)?.roleName || 'the team';

    // Withdraw leftover OFFERED apps for the same role ONLY when this acceptance fills it.
    if (assignedRoleId && remainingById[assignedRoleId] - 1 <= 0) {
      const pendingOffers = await prisma.jobApplication.findMany({
        where: {
          jobId,
          jobRoleId: assignedRoleId,
          status: 'OFFERED',
          NOT: { id: app.id }
        },
        select: { id: true, workerId: true }
      });

      if (pendingOffers.length > 0) {
        await prisma.jobApplication.updateMany({
          where: { id: { in: pendingOffers.map(p => p.id) } },
          data: { status: 'OFFER_WITHDRAWN' }
        });

        for (const pending of pendingOffers) {
          const pendingUser = await prisma.workerProfile.findUnique({
            where: { id: pending.workerId },
            select: { userId: true }
          });
          if (pendingUser) {
            await createNotification(
              pendingUser.userId,
              'OFFER_WITHDRAWN',
              'Offer Withdrawn',
              `Your offer for "${job.title}" as ${roleName} was withdrawn because the role has been fully filled.`,
              jobId
            );
          }
        }
      }
    }

    await recomputeJobFill(jobId);

    if (worker.userId) {
      await createNotification(
        worker.userId,
        'APPLICATION_ACCEPTED',
        'Application Accepted',
        `Your application for "${job.title}" as ${roleName} was accepted — you are now assigned to this job.`,
        jobId,
        updated.id
      );
    }

    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};

exports.rejectApplication = async (req, res, next) => {
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

    const app = await prisma.jobApplication.findUnique({
      where: { jobId_workerId: { jobId, workerId } }
    });
    if (!app) {
      return res.status(404).json({ success: false, message: 'Application not found' });
    }
    if (app.status !== 'PENDING') {
      return res.status(400).json({ success: false, message: 'No pending application from this worker' });
    }

    const updated = await prisma.jobApplication.update({
      where: { id: app.id },
      data: { status: 'REJECTED' }
    });

    const worker = await prisma.workerProfile.findUnique({
      where: { id: workerId },
      select: { userId: true }
    });

    if (worker?.userId) {
      await createNotification(
        worker.userId,
        'APPLICATION_REJECTED',
        'Application Rejected',
        `Your application for "${job.title}" was rejected by the employer.`,
        jobId,
        updated.id
      );
    }

    res.json({ success: true, data: updated });
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
    if (!workStatus && workNote === undefined) {
      return res.status(400).json({ success: false, message: 'Nothing to update' });
    }

    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: { employer: { include: { user: { select: { id: true } } } } }
    });
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
      where: { jobId_workerId: { jobId, workerId } },
      include: { worker: { include: { user: { select: { id: true } } } } }
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

    // Accepting a worker's completion: free them immediately + notify the worker.
    if (workStatus === 'COMPLETED') {
      await prisma.workerProfile.update({
        where: { id: workerId },
        data: { availability: 'AVAILABLE' }
      });
      if (app.worker?.user?.id) {
        await createNotification(
          app.worker.user.id,
          'WORK_ACCEPTED',
          'Work Accepted',
          `${employer.displayName} verified and accepted your work on "${job.title}". You are now available for new jobs.`,
          jobId,
          app.id
        );
      }
    } else if (
      app.workStatus === 'COMPLETION_REQUESTED' &&
      app.worker?.user?.id
    ) {
      // Employer reset a pending completion request (reject / needs more work).
      await createNotification(
        app.worker.user.id,
        'WORK_REJECTED',
        'Work Not Accepted',
        `${employer.displayName} needs more work on "${job.title}". Your completion request was not accepted.`,
        jobId,
        app.id
      );
    }

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

    // Notify all hired workers (JOB_COMPLETED + REVIEW_REQUIRED)
    for (const app of job.applications) {
      await createNotification(
        app.worker.userId,
        'JOB_COMPLETED',
        'Job Completed',
        `The job "${job.title}" has been marked as completed.`,
        jobId
      );
      await createNotification(
        app.worker.userId,
        'REVIEW_REQUIRED',
        'Review Required',
        `Please rate your employer for the job "${job.title}".`,
        jobId
      );
    }

    // Notify employer (always, not just when worker initiated)
    await createNotification(
      job.employer.userId,
      'JOB_COMPLETED',
      'Job Completed',
      user.role === 'WORKER'
        ? `The job "${job.title}" has been marked as completed by a worker.`
        : `The job "${job.title}" has been marked as completed.`,
      jobId
    );
    await createNotification(
      job.employer.userId,
      'REVIEW_REQUIRED',
      'Review Required',
      `Please rate your hired worker(s) for the job "${job.title}".`,
      jobId
    );

    res.json({ success: true, data: updatedJob });
  } catch (error) {
    next(error);
  }
};
