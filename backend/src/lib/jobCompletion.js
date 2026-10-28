const prisma = require('./prisma');
const { createNotification } = require('../controllers/notification.controller');

/**
 * Whole-project job completion, shared by every code path that can end a job:
 * - the manual "Mark as Completed" buttons (trigger 'WORKER' / 'EMPLOYER'),
 * - the payment cascade (trigger 'PAYMENT'): the last hired worker's payment
 *   was confirmed, so the job completes automatically.
 *
 * Idempotent-ish: safe to call on an already-COMPleted job (the updateMany and
 * the status write are no-ops for apps already COMPLETED); the notifications
 * would re-fire, so callers should only invoke this when the job is still
 * OPEN/IN_PROGRESS.
 *
 * Does: job → COMPLETED, every remaining HIRED app → COMPLETED (+ workStatus),
 * frees those workers to AVAILABLE, notifies all hired workers and the
 * employer with JOB_COMPLETED + REVIEW_REQUIRED (which is what drives the
 * review prompts / auto-open modal on the frontend).
 */
async function finalizeJobCompletion(jobId, trigger = 'EMPLOYER') {
  const job = await prisma.job.findUnique({
    where: { id: jobId },
    include: {
      employer: { include: { user: { select: { id: true } } } },
      // COMPLETED apps too: the payment cascade completes each worker's app at
      // confirm time, so by the time the last payment lands the earlier workers
      // are already COMPLETED — they still need JOB_COMPLETED/REVIEW_REQUIRED.
      applications: {
        where: { status: { in: ['HIRED', 'COMPLETED'] } },
        include: { worker: { include: { user: { select: { id: true } } } } }
      }
    }
  });
  if (!job) return null;

  const updatedJob = await prisma.job.update({
    where: { id: jobId },
    data: { status: 'COMPLETED' }
  });

  // Only HIRED apps still need flipping — COMPLETED ones are done.
  await prisma.jobApplication.updateMany({
    where: { jobId, status: 'HIRED' },
    data: { status: 'COMPLETED', workStatus: 'COMPLETED' }
  });

  for (const app of job.applications) {
    await prisma.workerProfile.update({
      where: { id: app.workerId },
      data: { availability: 'AVAILABLE' }
    });
  }

  for (const app of job.applications) {
    await createNotification(
      app.worker.userId,
      'JOB_COMPLETED',
      'Job Completed',
      trigger === 'PAYMENT'
        ? `The job "${job.title}" is complete — the final payment has been confirmed.`
        : `The job "${job.title}" has been marked as completed.`,
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

  const employerMessage =
    trigger === 'WORKER'
      ? `The job "${job.title}" has been marked as completed by a worker.`
      : trigger === 'PAYMENT'
        ? `The job "${job.title}" is complete — the final payment has been confirmed. Please rate your hired worker(s).`
        : `The job "${job.title}" has been marked as completed.`;

  await createNotification(
    job.employer.userId,
    'JOB_COMPLETED',
    'Job Completed',
    employerMessage,
    jobId
  );
  await createNotification(
    job.employer.userId,
    'REVIEW_REQUIRED',
    'Review Required',
    `Please rate your hired worker(s) for the job "${job.title}".`,
    jobId
  );

  return updatedJob;
}

/**
 * True when every HIRED application on the job has a confirmed (COMPLETED)
 * payment — i.e. nothing is left to pay, so the job may auto-complete.
 * A job with no HIRED apps counts as "all paid" (vacuously true).
 */
async function allHiredWorkersPaid(jobId) {
  const hiredApps = await prisma.jobApplication.findMany({
    where: { jobId, status: 'HIRED' },
    select: { workerId: true }
  });
  if (hiredApps.length === 0) return true;

  for (const app of hiredApps) {
    const paid = await prisma.payment.findFirst({
      where: { jobId, workerId: app.workerId, status: 'COMPLETED' },
      select: { id: true }
    });
    if (!paid) return false;
  }
  return true;
}

module.exports = { finalizeJobCompletion, allHiredWorkersPaid };
