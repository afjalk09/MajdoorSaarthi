const prisma = require('../lib/prisma');
const { createNotification } = require('./notification.controller');
const { finalizeJobCompletion, allHiredWorkersPaid } = require('../lib/jobCompletion');

const PAYMENT_METHODS = ['UPI', 'OFFLINE', 'BANK_TRANSFER', 'CASH'];
const PAYMENT_STATUSES = ['PENDING', 'COMPLETED', 'DISPUTED', 'CANCELLED'];
// Kept in sync with README: 5% platform commission. Overridable for ops/tuning.
const COMMISSION_RATE = (() => {
  const parsed = parseFloat(process.env.PLATFORM_COMMISSION_RATE);
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= 1 ? parsed : 0.05;
})();

const round2 = (n) => Math.round(n * 100) / 100;

// Payments go to both parties, so expose the worker's net payout alongside the
// stored gross amount + commission (never trust the client to recompute money).
const withMoney = (payment) => ({
  ...payment,
  netAmount: round2(payment.amount - payment.platformCommission)
});

const partyInclude = {
  job: { select: { id: true, title: true, status: true, wageAmount: true, wageType: true } },
  worker: { select: { id: true, userId: true, fullName: true } },
  employer: { select: { id: true, userId: true, displayName: true } }
};

/**
 * POST /api/payments  (employer)
 * Record a payment sent to a hired worker on one of the employer's jobs.
 * Body: { job_id, worker_id, amount, payment_method, reference?, note? }
 */
exports.createPayment = async (req, res, next) => {
  try {
    const body = req.body || {};
    const jobId = body.jobId ?? body.job_id;
    const workerId = body.workerId ?? body.worker_id;
    const paymentMethod = String(body.paymentMethod ?? body.payment_method ?? '').toUpperCase();
    const reference = body.reference ? String(body.reference).trim().slice(0, 100) : null;
    const note = body.note ? String(body.note).trim().slice(0, 500) : null;

    if (!jobId || !workerId || body.amount === undefined || body.amount === null || !paymentMethod) {
      return res.status(400).json({ success: false, message: 'job_id, worker_id, amount and payment_method are required' });
    }

    const amount = round2(parseFloat(body.amount));
    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Amount must be a positive number' });
    }

    if (!PAYMENT_METHODS.includes(paymentMethod)) {
      return res.status(400).json({ success: false, message: `Invalid payment method. Allowed: ${PAYMENT_METHODS.join(', ')}` });
    }

    const employer = await prisma.employerProfile.findUnique({ where: { userId: req.user.id } });
    if (!employer) {
      return res.status(400).json({ success: false, message: 'Employer profile not found' });
    }

    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: { employer: { select: { displayName: true } } }
    });
    if (!job || job.employerId !== employer.id) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    const worker = await prisma.workerProfile.findUnique({ where: { id: workerId } });
    if (!worker) {
      return res.status(404).json({ success: false, message: 'Worker not found' });
    }

    // Only hired (or already completed) workers can be paid on this job.
    const application = await prisma.jobApplication.findFirst({
      where: { jobId, workerId, status: { in: ['HIRED', 'COMPLETED'] } }
    });
    if (!application) {
      return res.status(400).json({ success: false, message: 'Worker is not hired on this job' });
    }

    // ONE payment per worker per job, ever. A CANCELLED payment doesn't count
    // (the employer voided it, so the worker can be paid again); anything else
    // — even one still awaiting the worker's confirmation — locks the worker.
    const existingPayment = await prisma.payment.findFirst({
      where: { jobId, workerId, status: { in: ['PENDING', 'COMPLETED', 'DISPUTED'] } }
    });
    if (existingPayment) {
      return res.status(400).json({
        success: false,
        message: existingPayment.status === 'PENDING'
          ? 'A payment to this worker is already awaiting their confirmation'
          : 'This worker has already been paid for this job'
      });
    }

    const platformCommission = round2(amount * COMMISSION_RATE);
    const payment = await prisma.payment.create({
      data: {
        jobId,
        workerId,
        employerId: employer.id,
        amount,
        platformCommission,
        paymentMethod,
        reference,
        note,
        status: 'PENDING'
      },
      include: partyInclude
    });

    await createNotification(
      worker.userId,
      'PAYMENT_SENT',
      'Payment sent',
      `${job.employer.displayName} sent you ₹${round2(amount - platformCommission)} for "${job.title}" — confirm once you've received it.`,
      job.id
    );

    res.status(201).json({ success: true, data: withMoney(payment) });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/payments/:id/confirm  (worker)
 * The worker confirms the money reached them: PENDING -> COMPLETED.
 */
exports.confirmPayment = async (req, res, next) => {
  try {
    const payment = await prisma.payment.findUnique({
      where: { id: req.params.id },
      include: partyInclude
    });

    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment not found' });
    }

    const worker = await prisma.workerProfile.findUnique({ where: { userId: req.user.id } });
    if (!worker || payment.workerId !== worker.id) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    if (payment.status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        message: payment.status === 'CANCELLED'
          ? 'This payment was cancelled by the employer'
          : `Payment is already ${payment.status.toLowerCase()}`
      });
    }

    const updated = await prisma.payment.update({
      where: { id: payment.id },
      data: { status: 'COMPLETED', confirmedAt: new Date() },
      include: partyInclude
    });

    await createNotification(
      payment.employer.userId,
      'PAYMENT_CONFIRMED',
      'Payment confirmed',
      `${worker.fullName} confirmed receipt of ₹${round2(payment.amount - payment.platformCommission)} for "${payment.job.title}".`,
      payment.jobId
    );

    // Payment = the work is done AND paid: complete this worker's assignment
    // and free them right away, exactly like the employer's "Accept Completion".
    const app = await prisma.jobApplication.findFirst({
      where: { jobId: payment.jobId, workerId: payment.workerId }
    });
    if (app && app.status === 'HIRED') {
      await prisma.jobApplication.update({
        where: { id: app.id },
        data: { status: 'COMPLETED', workStatus: 'COMPLETED' }
      });
    }
    await prisma.workerProfile.update({
      where: { id: payment.workerId },
      data: { availability: 'AVAILABLE' }
    });

    // Auto-complete the JOB once every HIRED worker has a confirmed payment —
    // the payment-driven equivalent of "Mark as Completed". A CANCELLED job is
    // left alone.
    let jobCompleted = false;
    const currentJob = await prisma.job.findUnique({
      where: { id: payment.jobId },
      select: { status: true }
    });
    if (
      currentJob &&
      (currentJob.status === 'OPEN' || currentJob.status === 'IN_PROGRESS') &&
      await allHiredWorkersPaid(payment.jobId)
    ) {
      await finalizeJobCompletion(payment.jobId, 'PAYMENT');
      jobCompleted = true;
    }

    res.json({ success: true, data: { ...withMoney(updated), jobCompleted } });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/payments/:id/cancel  (employer)
 * Void a payment that has not been confirmed yet: PENDING -> CANCELLED.
 */
exports.cancelPayment = async (req, res, next) => {
  try {
    const payment = await prisma.payment.findUnique({
      where: { id: req.params.id },
      include: partyInclude
    });

    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment not found' });
    }

    const employer = await prisma.employerProfile.findUnique({ where: { userId: req.user.id } });
    if (!employer || payment.employerId !== employer.id) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    if (payment.status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        message: `Only pending payments can be cancelled (this one is ${payment.status.toLowerCase()})`
      });
    }

    const updated = await prisma.payment.update({
      where: { id: payment.id },
      data: { status: 'CANCELLED' },
      include: partyInclude
    });

    await createNotification(
      payment.worker.userId,
      'PAYMENT_CANCELLED',
      'Payment cancelled',
      `${payment.employer.displayName} cancelled the ₹${payment.amount} payment for "${payment.job.title}".`,
      payment.jobId
    );

    res.json({ success: true, data: withMoney(updated) });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/payments  (both roles)
 * The caller's payment history. Query: ?job_id=&status=
 */
exports.listMyPayments = async (req, res, next) => {
  try {
    const where = {};

    if (req.user.role === 'WORKER') {
      const worker = await prisma.workerProfile.findUnique({ where: { userId: req.user.id } });
      if (!worker) return res.json({ success: true, data: [] });
      where.workerId = worker.id;
    } else if (req.user.role === 'EMPLOYER') {
      const employer = await prisma.employerProfile.findUnique({ where: { userId: req.user.id } });
      if (!employer) return res.json({ success: true, data: [] });
      where.employerId = employer.id;
    }
    // ADMIN: no party filter — admins see the whole ledger.

    const jobId = req.query.job_id || req.query.jobId;
    if (jobId) where.jobId = jobId;

    const status = String(req.query.status || '').toUpperCase();
    if (status) {
      if (!PAYMENT_STATUSES.includes(status)) {
        return res.status(400).json({ success: false, message: `Invalid status. Allowed: ${PAYMENT_STATUSES.join(', ')}` });
      }
      where.status = status;
    }

    const payments = await prisma.payment.findMany({
      where,
      include: partyInclude,
      orderBy: { createdAt: 'desc' },
      take: 100
    });

    res.json({ success: true, data: payments.map(withMoney) });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/payments/job/:jobId  (job participants only)
 * Payments for one job — used by the JobTracking page. Anyone can read a job,
 * but money belongs only to its participants, so this is gated (unlike GET
 * /jobs/:id). A worker sees ONLY their own payments here — what the employer
 * paid the other workers is not theirs to read.
 */
exports.getJobPayments = async (req, res, next) => {
  try {
    const job = await prisma.job.findUnique({ where: { id: req.params.jobId } });
    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }

    const where = { jobId: job.id };

    if (req.user.role !== 'ADMIN') {
      if (req.user.role === 'EMPLOYER') {
        const employer = await prisma.employerProfile.findUnique({ where: { userId: req.user.id } });
        if (!employer || job.employerId !== employer.id) {
          return res.status(403).json({ success: false, message: 'Unauthorized' });
        }
      } else if (req.user.role === 'WORKER') {
        const worker = await prisma.workerProfile.findUnique({ where: { userId: req.user.id } });
        const application = worker
          ? await prisma.jobApplication.findFirst({ where: { jobId: job.id, workerId: worker.id } })
          : null;
        if (!application) {
          return res.status(403).json({ success: false, message: 'Unauthorized' });
        }
        where.workerId = worker.id;
      } else {
        return res.status(403).json({ success: false, message: 'Unauthorized' });
      }
    }

    const payments = await prisma.payment.findMany({
      where,
      include: partyInclude,
      orderBy: { createdAt: 'desc' }
    });

    res.json({ success: true, data: payments.map(withMoney) });
  } catch (error) {
    next(error);
  }
};
