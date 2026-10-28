// Job / application presentation vocabularies. Mirrors the Prisma enums
// `JobStatus`, `ApplicationStatus` and `WageType`.

export const JOB_STATUS_META = {
  OPEN: { label: 'Open', className: 'bg-blue-500 hover:bg-blue-500' },
  IN_PROGRESS: { label: 'In Progress', className: 'bg-yellow-500 hover:bg-yellow-500' },
  COMPLETED: { label: 'Completed', className: 'bg-green-500 hover:bg-green-500' },
  CANCELLED: { label: 'Cancelled', className: '' }
};

export const jobStatusLabel = (status) => JOB_STATUS_META[status]?.label || status || 'Unknown';

export const WAGE_TYPE_LABELS = {
  DAILY: 'Daily',
  HOURLY: 'Hourly',
  PROJECT: 'Project'
};

export const wageTypeLabel = (wageType) => WAGE_TYPE_LABELS[wageType] || wageType || '';

/**
 * How a JobApplication status is worded. OFFERED and OFFER_WITHDRAWN read
 * differently to each side: the worker received the offer, the employer sent
 * it. Every entry therefore carries both a worker- and an employer-facing label.
 */
export const APPLICATION_STATUS_META = {
  PENDING: { label: 'Applied', employerLabel: 'Applied', variant: 'secondary' },
  ACCEPTED: { label: 'Accepted', employerLabel: 'Accepted', variant: 'default' },
  REJECTED: { label: 'Rejected', employerLabel: 'Rejected', variant: 'destructive' },
  HIRED: { label: 'Hired', employerLabel: 'Hired', variant: 'default' },
  COMPLETED: { label: 'Completed', employerLabel: 'Completed', variant: 'secondary' },
  WITHDRAWN: { label: 'Withdrawn', employerLabel: 'Withdrawn', variant: 'secondary' },
  OFFERED: { label: 'Offer Received', employerLabel: 'Offer Pending', variant: 'outline' },
  OFFER_WITHDRAWN: { label: 'Offer Withdrawn', employerLabel: 'Offer Withdrawn', variant: 'destructive' }
};

export const applicationStatusLabel = (status) =>
  APPLICATION_STATUS_META[status]?.label || status || 'Unknown';

/** The same status as the employer sees it on their own job. */
export const applicationStatusLabelForEmployer = (status) =>
  APPLICATION_STATUS_META[status]?.employerLabel || status || 'Unknown';

/** True while the worker still has something to act on for this application. */
export const isActionableApplication = (status) => status === 'OFFERED' || status === 'PENDING';

/**
 * Date gate mirror of `backend/src/lib/jobDates.js`.
 *
 * A job stops accepting NEW applications the moment it starts (start date +
 * start time when set) and after its end date. Computed on the client from the
 * dates — not from the server's `applicationsClosed` flag — so a tab left open
 * past the start moment disables Apply without a refetch. The server enforces
 * the same rule; this only decides what the UI lets you click.
 *
 * Returns 'ENDED' | 'STARTED' | null (null = still open, or no dates set).
 */
export const applicationsClosedReason = (job) => {
  if (!job?.startDate) return null;

  const atLocalMidnight = (value) => {
    const date = new Date(value);
    date.setHours(0, 0, 0, 0);
    return date;
  };

  const now = new Date();

  if (job.endDate) {
    const end = atLocalMidnight(job.endDate);
    end.setHours(23, 59, 59, 999);
    if (end <= now) return 'ENDED';
  }

  const start = atLocalMidnight(job.startDate);
  const match = /^(\d{1,2}):(\d{2})$/.exec(String(job.startTime || '').trim());
  if (match && Number(match[1]) <= 23 && Number(match[2]) <= 59) {
    start.setHours(Number(match[1]), Number(match[2]), 0, 0);
  }
  if (start <= now) return 'STARTED';

  return null;
};

export const isJobApplicationsClosed = (job) => applicationsClosedReason(job) !== null;

export const JOB_CLOSURE_META = {
  STARTED: { label: 'Started', className: 'bg-amber-500 hover:bg-amber-500' },
  ENDED: { label: 'Ended', className: 'bg-slate-500 hover:bg-slate-500' }
};

/** Badge text for a closed job, or null while it still accepts applications. */
export const jobClosureLabel = (job) =>
  JOB_CLOSURE_META[applicationsClosedReason(job)]?.label || null;

// ---------------------------------------------------------------------------
// Payments (mirrors the Prisma enums PaymentStatus / PaymentMethod)
// ---------------------------------------------------------------------------

/**
 * PENDING = the employer recorded the payment and the worker has NOT yet
 * confirmed receipt — that confirmation is the worker's side of the flow.
 */
export const PAYMENT_STATUS_META = {
  PENDING: { label: 'Pending Confirmation', variant: 'outline' },
  COMPLETED: { label: 'Confirmed', variant: 'default' },
  DISPUTED: { label: 'Disputed', variant: 'destructive' },
  CANCELLED: { label: 'Cancelled', variant: 'secondary' }
};

export const paymentStatusLabel = (status) =>
  PAYMENT_STATUS_META[status]?.label || status || 'Unknown';

export const PAYMENT_METHOD_LABELS = {
  UPI: 'UPI',
  OFFLINE: 'Offline',
  BANK_TRANSFER: 'Bank Transfer',
  CASH: 'Cash'
};

export const paymentMethodLabel = (method) => PAYMENT_METHOD_LABELS[method] || method || 'Unknown';
