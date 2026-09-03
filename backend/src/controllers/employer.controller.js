const prisma = require('../lib/prisma');

// Haversine formula to calculate distance between two coordinates in km
function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371;
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
    const profile = await prisma.employerProfile.findUnique({
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
      employer_type, display_name, contact_person, aadhaar_number,
      pan_number, company_reg_number, location_lat, location_lng, location_text
    } = req.body;

    const profile = await prisma.employerProfile.findUnique({ where: { userId: req.user.id } });

    if (!profile) {
      const newProfile = await prisma.employerProfile.create({
        data: {
          userId: req.user.id,
          employerType: employer_type?.toUpperCase() || 'INDIVIDUAL',
          displayName: display_name,
          contactPerson: contact_person,
          aadhaarNumber: aadhaar_number,
          panNumber: pan_number,
          companyRegNumber: company_reg_number,
          locationLat: location_lat,
          locationLng: location_lng,
          locationText: location_text
        }
      });
      return res.json({ success: true, data: newProfile });
    }

    const updatedProfile = await prisma.employerProfile.update({
      where: { userId: req.user.id },
      data: {
        employerType: employer_type?.toUpperCase() || 'INDIVIDUAL',
        displayName: display_name,
        contactPerson: contact_person,
        aadhaarNumber: aadhaar_number,
        panNumber: pan_number,
        companyRegNumber: company_reg_number,
        locationLat: location_lat,
        locationLng: location_lng,
        locationText: location_text
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

exports.getWorkersByLocation = async (req, res, next) => {
  try {
    const { job_id } = req.query;

    let locationText = null;
    let locationLat = null;
    let locationLng = null;
    let jobSkills = [];

    if (job_id) {
      const job = await prisma.job.findUnique({ where: { id: job_id } });
      if (!job) {
        return res.status(404).json({ success: false, message: 'Job not found' });
      }
      locationText = job.locationText;
      locationLat = job.locationLat;
      locationLng = job.locationLng;
      jobSkills = job.requiredSkills || [];
    }

    const where = { availability: 'AVAILABLE' };

    // Filter by location text if available
    if (locationText) {
      where.locationText = locationText;
    }

    const workers = await prisma.workerProfile.findMany({
      where,
      include: { user: { select: { email: true, phone: true } } },
      orderBy: { reliabilityScore: 'desc' }
    });

    // Calculate distance and filter by proximity (50km)
    const workersWithDistance = workers
      .map(worker => {
        let distance = null;
        if (locationLat && locationLng && worker.locationLat && worker.locationLng) {
          distance = haversineDistance(locationLat, locationLng, worker.locationLat, worker.locationLng);
        }

        // Calculate skill match percentage
        const workerSkills = worker.skills || [];
        const matchedSkills = workerSkills.filter(s => jobSkills.includes(s));
        const skillMatch = jobSkills.length > 0
          ? Math.round((matchedSkills.length / jobSkills.length) * 100)
          : 0;

        return {
          ...worker,
          distance,
          skillMatch,
          matchedSkills
        };
      })
      .filter(worker => {
        if (worker.distance === null) return true;
        return worker.distance <= 50;
      })
      .sort((a, b) => {
        // Sort by skill match first, then by distance
        if (b.skillMatch !== a.skillMatch) return b.skillMatch - a.skillMatch;
        if (a.distance === null) return 1;
        if (b.distance === null) return -1;
        return a.distance - b.distance;
      });

    res.json({ success: true, data: workersWithDistance });
  } catch (error) {
    next(error);
  }
};
