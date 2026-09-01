const prisma = require('../lib/prisma');

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
        availability: availability?.toUpperCase() || 'AVAILABLE',
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

    const jobs = await prisma.job.findMany({
      where: {
        status: 'OPEN',
        requiredSkills: { hasSome: profile.skills || [] }
      },
      include: { employer: true },
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

    const profile = await prisma.workerProfile.findUnique({ where: { userId: req.user.id } });
    if (!profile) {
      return res.status(400).json({ success: false, message: 'Complete your profile first' });
    }

    const job = await prisma.job.findUnique({ where: { id: jobId } });
    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }

    const existingApplication = await prisma.jobApplication.findUnique({
      where: { jobId_workerId: { jobId, workerId: profile.id } }
    });

    if (existingApplication) {
      return res.status(400).json({ success: false, message: 'Already applied' });
    }

    const application = await prisma.jobApplication.create({
      data: {
        jobId,
        workerId: profile.id,
        status: 'PENDING'
      }
    });

    res.status(201).json({ success: true, data: application });
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
      include: { job: true },
      orderBy: { appliedAt: 'desc' }
    });

    res.json({ success: true, data: applications });
  } catch (error) {
    next(error);
  }
};
