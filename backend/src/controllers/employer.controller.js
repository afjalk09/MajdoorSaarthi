const prisma = require('../lib/prisma');

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
    const { job_id, search, role, page = 1, limit = 20 } = req.query;

    let locationText = null;

    if (job_id) {
      const job = await prisma.job.findUnique({ where: { id: job_id } });
      if (!job) {
        return res.status(404).json({ success: false, message: 'Job not found' });
      }
      locationText = job.locationText;
    }

    const where = { availability: 'AVAILABLE' };

    if (locationText && locationText.trim()) {
      where.locationText = { equals: locationText.trim(), mode: 'insensitive' };
    }

    if (search && search.trim()) {
      where.fullName = { contains: search.trim(), mode: 'insensitive' };
    }

    if (role && role.trim()) {
      where.roles = { has: role.trim() };
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const [total, workers] = await Promise.all([
      prisma.workerProfile.count({ where }),
      prisma.workerProfile.findMany({
        where,
        include: { user: { select: { email: true, phone: true } } },
        orderBy: { reliabilityScore: 'desc' },
        skip,
        take: limitNum
      })
    ]);

    res.json({
      success: true,
      data: workers,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    next(error);
  }
};
