const prisma = require('../lib/prisma');
const { createNotification } = require('./notification.controller');
const { releaseWorkerFromJob, recomputeJobFill } = require('./job.controller');
const roleService = require('../services/role.service');
const { roleCapacityInclude, withRoleCapacity } = require('../lib/jobRoles');
const { publicEmployerInclude } = require('../lib/publicEmployer');
const {
  applicationsClosedReason,
  applicationsClosedMessage
} = require('../lib/jobDates');

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
      full_name, roles, experience_years, location_lat, location_lng,
      location_text, availability, expected_wage_min, expected_wage_max, wage_type
    } = req.body;

    // Accept roles from the taxonomy OR manually added custom roles. Taxonomy
    // names are canonicalized; custom names pass through (max 50 chars each).
    let validatedRoles;
    if (roles !== undefined) {
      if (!Array.isArray(roles)) {
        return res.status(400).json({ success: false, message: 'roles must be an array' });
      }
      const allRoles = await roleService.getAllRoles();
      const uniqueRoles = [...new Set(roles.map(r => (r || '').trim()).filter(Boolean))];
      const cleaned = uniqueRoles
        .slice(0, 10)
        .map(r => (r.length > 50 ? r.slice(0, 50) : r))
        .map(r => roleService.canonicalRoleName(allRoles, r) || r);
      validatedRoles = [...new Set(cleaned)];
    }

    const profile = await prisma.workerProfile.findUnique({ where: { userId: req.user.id } });

    if (!profile) {
      const newProfile = await prisma.workerProfile.create({
        data: {
          userId: req.user.id,
          fullName: full_name,
          roles: validatedRoles || [],
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
        ...(validatedRoles !== undefined ? { roles: validatedRoles } : {}),
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
    const { role } = req.query;

    const profile = await prisma.workerProfile.findUnique({ where: { userId: req.user.id } });

    if (!profile) {
      return res.status(400).json({ success: false, message: 'Complete your profile first' });
    }

    const where = { status: 'OPEN' };

    // Filter by taxonomy role name (matches any of the job's role requirements)
    if (role && role.trim()) {
      where.jobRoles = { some: { roleName: { equals: role.trim(), mode: 'insensitive' } } };
    }

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
      // Workers only ever see the employer's public-safe fields.
      include: { ...publicEmployerInclude, jobRoles: roleCapacityInclude },
      orderBy: { createdAt: 'desc' }
    });

    // Live per-role capacity, so "N needed" is never read from a stale
    // filledCount column (same rule the Apply dialog relies on).
    // Started/expired jobs stay visible but carry a date-closure flag so the
    // worker sees them with Apply disabled instead of silently vanishing.
    jobs.forEach(job => {
      job.jobRoles = withRoleCapacity(job.jobRoles);
      job.closedReason = applicationsClosedReason(job);
      job.applicationsClosed = job.closedReason !== null;
    });

    // Role-aware sort: jobs the worker's profile roles match are shown first, then by recency.
    const workerRoles = (profile.roles || []).map(r => r.toLowerCase());
    const roleMatched = new Set();
    jobs.forEach(job => {
      const matches = (job.jobRoles || []).filter(r =>
        workerRoles.includes((r.roleName || '').toLowerCase())
      );
      if (matches.length > 0) {
        roleMatched.add(job.id);
        const roleNames = matches.map(r => r.roleName);
        job.matchedRoles = [...new Set(roleNames)];
      }
    });

    jobs.sort((a, b) => {
      if (a.applicationsClosed !== b.applicationsClosed) {
        return a.applicationsClosed ? 1 : -1;
      }
      const aMatched = roleMatched.has(a.id) ? 1 : 0;
      const bMatched = roleMatched.has(b.id) ? 1 : 0;
      if (aMatched !== bMatched) return bMatched - aMatched;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    res.json({ success: true, data: jobs });
  } catch (error) {
    next(error);
  }
};

// Worker-facing job detail. Deliberately narrower than GET /api/jobs/:id: it
// returns no reviews, no applications and no hiredWorkers, so a browsing worker
// cannot read coworkers' names, work notes or other workers' review bodies.
// No status filter — a worker must be able to inspect their own COMPLETED or
// CANCELLED jobs too.
exports.getJobDetail = async (req, res, next) => {
  try {
    const job = await prisma.job.findUnique({
      where: { id: req.params.id },
      include: { ...publicEmployerInclude, jobRoles: roleCapacityInclude }
    });

    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }

    const closedReason = applicationsClosedReason(job);

    res.json({
      success: true,
      data: {
        ...job,
        jobRoles: withRoleCapacity(job.jobRoles),
        closedReason,
        applicationsClosed: closedReason !== null
      }
    });
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

    // Date gate: a job that has started (or ended) never accepts new applications,
    // even while its status is still OPEN.
    const closedReason = applicationsClosedReason(job);
    if (closedReason) {
      return res.status(400).json({ success: false, message: applicationsClosedMessage(closedReason) });
    }

    const existingApplication = await prisma.jobApplication.findUnique({
      where: { jobId_workerId: { jobId, workerId: profile.id } }
    });

    const canReapply = existingApplication && ['REJECTED', 'WITHDRAWN'].includes(existingApplication.status);

    if (existingApplication && !canReapply) {
      return res.status(400).json({ success: false, message: 'Already applied' });
    }

    // Resolve the role the worker is applying for (role-based, no skill gate)
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
      // Prefer a role the worker's profile matches, else the role with the most space.
      const workerRoles = (profile.roles || []).map(r => r.toLowerCase());

      for (const role of job.jobRoles) {
        if (role.filledCount >= role.count) continue;
        if (workerRoles.includes((role.roleName || '').toLowerCase())) {
          appliedRoleId = role.id;
          break;
        }
      }

      if (!appliedRoleId) {
        let bestRole = null;
        let bestRemaining = 0;
        for (const role of job.jobRoles) {
          const remaining = role.count - role.filledCount;
          if (remaining > bestRemaining) {
            bestRemaining = remaining;
            bestRole = role;
          }
        }
        if (bestRole) {
          appliedRoleId = bestRole.id;
        }
      }

      if (!appliedRoleId) {
        return res.status(400).json({ success: false, message: 'No available slots in this job' });
      }
    }

    let application;
    if (canReapply) {
      application = await prisma.jobApplication.update({
        where: { id: existingApplication.id },
        data: {
          status: 'PENDING',
          jobRoleId: appliedRoleId,
          appliedAt: new Date(),
          matchScore: null,
          matchReasons: null
        }
      });
    } else {
      application = await prisma.jobApplication.create({
        data: {
          jobId,
          workerId: profile.id,
          status: 'PENDING',
          jobRoleId: appliedRoleId
        }
      });
    }

    // Notify the employer to review the application
    if (job.employer?.userId) {
      await createNotification(
        job.employer.userId,
        'APPLICATION_RECEIVED',
        'New Job Application',
        `${profile.fullName} applied for "${job.title}". Accept or reject the application.`,
        jobId,
        application.id
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
      include: {
        jobRole: true,
        // jobRoles are kept (role-aware job images need them); the employer is
        // narrowed to its public-safe fields.
        job: { include: { ...publicEmployerInclude, jobRoles: true } }
      },
      orderBy: { appliedAt: 'desc' }
    });

    res.json({ success: true, data: applications });
  } catch (error) {
    next(error);
  }
};

exports.acceptOffer = async (req, res, next) => {
  try {
    const { id: appId } = req.params;

    const profile = await prisma.workerProfile.findUnique({ where: { userId: req.user.id } });
    if (!profile) {
      return res.status(400).json({ success: false, message: 'Complete your profile first' });
    }

    const app = await prisma.jobApplication.findUnique({
      where: { id: appId },
      include: {
        job: { include: { employer: { select: { userId: true } }, jobRoles: true } }
      }
    });

    if (!app || app.workerId !== profile.id) {
      return res.status(404).json({ success: false, message: 'Application not found' });
    }

    if (app.status !== 'OFFERED') {
      return res.status(400).json({ success: false, message: 'No pending offer on this application' });
    }

    if (app.job.status === 'COMPLETED' || app.job.status === 'CANCELLED') {
      return res.status(400).json({ success: false, message: 'This job is no longer active' });
    }

    // Date gate: once the job's start moment has passed the offer cannot be
    // accepted any more (declining it still works).
    const closedReason = applicationsClosedReason(app.job);
    if (closedReason) {
      return res.status(400).json({ success: false, message: applicationsClosedMessage(closedReason) });
    }

    if (profile.availability !== 'AVAILABLE') {
      return res.status(400).json({
        success: false,
        message: 'You are already assigned to another job and cannot accept this offer'
      });
    }

    // Re-check the offered role still has a real open slot (it may have been filled meanwhile)
    if (app.jobRoleId) {
      const role = await prisma.jobRole.findUnique({
        where: { id: app.jobRoleId },
        include: { applications: { where: { status: { in: ['HIRED', 'COMPLETED'] } } } }
      });
      if (!role || role.jobId !== app.jobId) {
        return res.status(400).json({ success: false, message: 'Offered role no longer exists' });
      }
      if (role.applications.length >= role.count) {
        return res.status(400).json({ success: false, message: 'This role has already been filled' });
      }
    }

    const updated = await prisma.jobApplication.update({
      where: { id: app.id },
      data: { status: 'HIRED' }
    });

    await prisma.workerProfile.update({
      where: { id: profile.id },
      data: { availability: 'BUSY' }
    });

    const roleName = app.jobRoleId
      ? app.job.jobRoles.find(r => r.id === app.jobRoleId)?.roleName
      : 'the team';

    // Auto-withdraw leftover same-job+role offers ONLY when this acceptance fills the
    // role. While seats remain, the other offers stay OPEN so the employer keeps filling.
    if (app.jobRoleId) {
      const role = await prisma.jobRole.findUnique({
        where: { id: app.jobRoleId },
        include: { applications: { where: { status: { in: ['HIRED', 'COMPLETED'] } } } }
      });
      const isNowFull = role && role.applications.length >= role.count;

      if (isNowFull) {
        const pendingOffers = await prisma.jobApplication.findMany({
          where: {
            jobId: app.jobId,
            jobRoleId: app.jobRoleId,
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
                `Your offer for "${app.job.title}" as ${roleName} was withdrawn because the role has been fully filled.`,
                app.jobId
              );
            }
          }
        }
      }
    }

    await recomputeJobFill(app.jobId);

    if (app.job.employer?.userId) {
      await createNotification(
        app.job.employer.userId,
        'OFFER_ACCEPTED',
        'Offer Accepted',
        `${profile.fullName} accepted your offer for "${app.job.title}" as ${roleName}.`,
        app.jobId
      );
    }

    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};

exports.rejectOffer = async (req, res, next) => {
  try {
    const { id: appId } = req.params;

    const profile = await prisma.workerProfile.findUnique({ where: { userId: req.user.id } });
    if (!profile) {
      return res.status(400).json({ success: false, message: 'Complete your profile first' });
    }

    const app = await prisma.jobApplication.findUnique({
      where: { id: appId },
      include: {
        job: { include: { employer: { select: { userId: true } }, jobRoles: true } }
      }
    });

    if (!app || app.workerId !== profile.id) {
      return res.status(404).json({ success: false, message: 'Application not found' });
    }

    if (app.status !== 'OFFERED') {
      return res.status(400).json({ success: false, message: 'No pending offer on this application' });
    }

    const updated = await prisma.jobApplication.update({
      where: { id: app.id },
      data: { status: 'REJECTED' }
    });

    if (app.job.employer?.userId) {
      const roleName = app.jobRoleId
        ? app.job.jobRoles.find(r => r.id === app.jobRoleId)?.roleName
        : 'the team';
      await createNotification(
        app.job.employer.userId,
        'OFFER_DECLINED',
        'Offer Declined',
        `${profile.fullName} declined your offer for "${app.job.title}" as ${roleName}. The slot is open for other applicants.`,
        app.jobId
      );
    }

    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};

exports.updateMyWorkStatus = async (req, res, next) => {
  try {
    const { id: jobId } = req.params;
    const { workStatus, workNote } = req.body || {};

    const allowed = ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETION_REQUESTED'];
    if (workStatus && !allowed.includes(workStatus)) {
      return res.status(400).json({ success: false, message: 'Invalid work status' });
    }
    if (!workStatus && workNote === undefined) {
      return res.status(400).json({ success: false, message: 'Nothing to update' });
    }

    const profile = await prisma.workerProfile.findUnique({ where: { userId: req.user.id } });
    if (!profile) {
      return res.status(400).json({ success: false, message: 'Complete your profile first' });
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

    if (workStatus === 'COMPLETION_REQUESTED' && job.employer?.user?.id) {
      await createNotification(
        job.employer.user.id,
        'WORK_COMPLETION_REQUEST',
        'Work Completion Request',
        `${profile.fullName} has marked their work as complete for "${job.title}". Please verify and accept or reject it.`,
        jobId,
        app.id
      );
    }

    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};
