const prisma = require('../lib/prisma');

// Haversine formula to calculate distance between two coordinates in km
function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

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

    const MAX_DISTANCE_KM = 50;

    // Build where clause
    const where = { status: 'OPEN' };

    // Only filter by skills if worker has skills
    if (profile.skills && profile.skills.length > 0) {
      where.requiredSkills = { hasSome: profile.skills };
    }

    const jobs = await prisma.job.findMany({
      where,
      include: { employer: true },
      orderBy: { createdAt: 'desc' }
    });

    // Calculate distance and filter by proximity
    const workerLat = profile.locationLat;
    const workerLng = profile.locationLng;

    const jobsWithDistance = jobs
      .map(job => {
        let distance = null;
        if (workerLat && workerLng && job.locationLat && job.locationLng) {
          distance = haversineDistance(workerLat, workerLng, job.locationLat, job.locationLng);
        }
        return { ...job, distance };
      })
      .filter(job => {
        // Show jobs without location data (can't filter by distance)
        if (job.distance === null) return true;
        return job.distance <= MAX_DISTANCE_KM;
      })
      .sort((a, b) => {
        // Jobs without distance go to the end
        if (a.distance === null) return 1;
        if (b.distance === null) return -1;
        return a.distance - b.distance;
      });

    res.json({ success: true, data: jobsWithDistance });
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
