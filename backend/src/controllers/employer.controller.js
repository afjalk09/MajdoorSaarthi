const fs = require('fs');
const path = require('path');
const prisma = require('../lib/prisma');
const { PUBLIC_WORKER_SELECT, toPublicWorker } = require('../lib/publicWorker');
const { WORK_HISTORY_INCLUDE, completedHistoryWhere, REVIEW_PARTY_SELECT, withWorkStats } = require('../lib/workerHistory');
const { DOC_TYPES, ADDRESS_PROOF_TYPES, EMPLOYER_TYPES } = require('../lib/employerDocs');
const { UPLOAD_DIR } = require('../middleware/upload.middleware');
const {
  BUSINESS_ONLY_COLUMNS,
  trimToNull,
  validateProfileFields,
  readCompanyRegNumber,
  requiresBusinessDetails
} = require('../lib/employerValidation');

/** Documents still on file for a user: anything not rejected (pending review or approved) */
const activeDocuments = (userId) =>
  prisma.document.findMany({
    where: { userId, status: { not: 'REJECTED' } },
    orderBy: { createdAt: 'desc' }
  });

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

exports.getDocuments = async (req, res, next) => {
  try {
    const documents = await prisma.document.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ success: true, data: documents });
  } catch (error) {
    next(error);
  }
};

/**
 * Auth-gated file streaming. PAN/Aadhaar files must never be publicly readable,
 * so this (not the static /uploads mount) is what the UI links to.
 */
exports.getDocumentFile = async (req, res, next) => {
  try {
    const document = await prisma.document.findUnique({ where: { id: req.params.id } });

    if (!document) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }

    const isOwner = document.userId === req.user.id;
    if (!isOwner && req.user.role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Not authorized to view this document' });
    }

    const fileName = path.basename(document.fileUrl);
    const absolutePath = path.join(UPLOAD_DIR, fileName);

    if (!fs.existsSync(absolutePath)) {
      return res.status(404).json({ success: false, message: 'File is no longer available' });
    }

    // originalname is user-supplied - strip quotes/control chars before it goes in a header
    const downloadName = String(document.fileName || fileName).replace(/["\r\n]/g, '').trim() || fileName;

    res.setHeader('Content-Type', document.mimeType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename="${downloadName}"`);
    res.sendFile(absolutePath);
  } catch (error) {
    next(error);
  }
};

/**
 * Multipart upload of a single verification document (field name: `file`).
 * Re-uploading the same doc_type replaces the previous PENDING copy so that
 * rejected documents can be re-sent without piling up rows.
 */
exports.uploadDocument = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const docType = String(req.body.doc_type || '').toUpperCase();
    if (!DOC_TYPES.includes(docType)) {
      fs.unlink(req.file.path, () => {});
      return res.status(400).json({
        success: false,
        message: `Invalid document type. Allowed: ${DOC_TYPES.join(', ')}`
      });
    }

    const docNumber = trimToNull(req.body.doc_number);

    const previous = await prisma.document.findMany({
      where: { userId: req.user.id, docType, status: 'PENDING' }
    });

    const document = await prisma.document.create({
      data: {
        userId: req.user.id,
        docType,
        docNumber,
        fileUrl: `/uploads/${req.file.filename}`,
        fileName: req.file.originalname || req.file.filename,
        mimeType: req.file.mimetype
      }
    });

    // Retire the superseded copies only after the new row exists
    for (const old of previous) {
      await prisma.document.delete({ where: { id: old.id } }).catch(() => {});
      const oldPath = path.join(UPLOAD_DIR, path.basename(old.fileUrl));
      fs.unlink(oldPath, () => {});
    }

    res.status(201).json({ success: true, data: document });
  } catch (error) {
    if (req.file?.path) fs.unlink(req.file.path, () => {});
    next(error);
  }
};

exports.updateProfile = async (req, res, next) => {
  try {
    const body = req.body || {};
    const employerType = String(body.employer_type || 'INDIVIDUAL').toUpperCase();

    if (!EMPLOYER_TYPES.includes(employerType)) {
      return res.status(400).json({
        success: false,
        message: `Invalid employer type. Allowed: ${EMPLOYER_TYPES.join(', ')}`,
        fields: [{ field: 'employer_type', message: 'Select a valid account type' }]
      });
    }

    const isBusiness = requiresBusinessDetails(employerType);

    const displayName = trimToNull(body.display_name);
    if (!displayName) {
      return res.status(400).json({
        success: false,
        message: 'Display name is required',
        fields: [{ field: 'display_name', message: 'Display name is required' }]
      });
    }

    // PAN, Aadhaar, contact number and the registered address are required for
    // every account type; the legal entity + signatory block is business-only.
    const { data: detailData, fields } = validateProfileFields(body, isBusiness);

    const existing = await prisma.employerProfile.findUnique({ where: { userId: req.user.id } });

    // Mandatory uploads are only enforced until the profile is complete, so that
    // later edits don't force the employer to re-upload already-approved documents.
    // Switching INTO a business account is an exception: an individual completes
    // their profile without an address proof, so the business document set must
    // be re-checked rather than inherited.
    const typeChanged = Boolean(existing) && existing.employerType !== employerType;
    const needsDocuments = !existing?.profileComplete || (typeChanged && isBusiness);

    if (needsDocuments) {
      const documents = await activeDocuments(req.user.id);
      const uploadedTypes = new Set(documents.map((d) => d.docType));

      for (const required of ['PAN', 'AADHAAR']) {
        if (!uploadedTypes.has(required)) {
          fields.push({ field: required.toLowerCase(), message: `Upload the ${required} document` });
        }
      }

      if (isBusiness && !ADDRESS_PROOF_TYPES.some((t) => uploadedTypes.has(t))) {
        fields.push({ field: 'address_proof_doc', message: 'Upload one registered address proof document' });
      }
    }

    if (fields.length) {
      return res.status(400).json({
        success: false,
        message: isBusiness
          ? 'Please complete all required business details and uploads'
          : 'Please complete all required details and uploads',
        fields
      });
    }

    const data = {
      employerType,
      displayName,
      contactPerson: trimToNull(body.contact_person),
      locationLat: body.location_lat ?? null,
      locationLng: body.location_lng ?? null,
      locationText: trimToNull(body.location_text),
      companyRegNumber: employerType === 'COMPANY' ? readCompanyRegNumber(body) : null,
      ...detailData
    };

    if (isBusiness) {
      // Record which address proof is actually on file
      const addressProofDoc = await prisma.document.findFirst({
        where: {
          userId: req.user.id,
          docType: { in: ADDRESS_PROOF_TYPES },
          status: { not: 'REJECTED' }
        },
        orderBy: { createdAt: 'desc' }
      });

      data.addressProofDocType = addressProofDoc?.docType || null;
      data.profileComplete = true;
    } else {
      // Switching to an individual clears the business-only block but keeps
      // PAN / Aadhaar / contact number / registered address
      const cleared = Object.fromEntries(BUSINESS_ONLY_COLUMNS.map((column) => [column, null]));
      Object.assign(data, cleared, { addressProofDocType: null, profileComplete: true });
    }

    const profile = await prisma.employerProfile.upsert({
      where: { userId: req.user.id },
      create: { userId: req.user.id, ...data },
      update: data
    });

    res.json({ success: true, data: profile });
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
        // Public projection only — never leak panNumber / aadhaarNumber.
        select: PUBLIC_WORKER_SELECT,
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

/**
 * Full public profile of one worker, plus the derived reputation and completed
 * work history an employer needs before making a hire decision.
 *
 * Deliberately NOT gated on availability or verification: an employer must be
 * able to inspect a BUSY worker (to send an offer that may become the first
 * acceptance) and an already-hired one (from the job's Hired Workers list).
 */
exports.getWorkerDetail = async (req, res, next) => {
  try {
    const worker = await prisma.workerProfile.findUnique({
      where: { id: req.params.id },
      select: PUBLIC_WORKER_SELECT
    });

    if (!worker) {
      return res.status(404).json({ success: false, message: 'Worker not found' });
    }

    // Reviews key off User.id, applications off WorkerProfile.id.
    const [reviews, reviewStats, history] = await Promise.all([
      prisma.review.findMany({
        where: { revieweeId: worker.userId },
        include: {
          reviewer: { select: REVIEW_PARTY_SELECT },
          job: { select: { id: true, title: true } }
        },
        orderBy: { createdAt: 'desc' },
        take: 20
      }),
      prisma.review.aggregate({
        where: { revieweeId: worker.userId },
        _avg: { rating: true },
        _count: { _all: true }
      }),
      prisma.jobApplication.findMany({
        where: completedHistoryWhere(worker.id),
        ...WORK_HISTORY_INCLUDE
      })
    ]);

    res.json({
      success: true,
      data: withWorkStats(toPublicWorker(worker), {
        reviews,
        averageRating: reviewStats._avg.rating || 0,
        totalReviews: reviewStats._count._all || 0,
        history
      })
    });
  } catch (error) {
    next(error);
  }
};
