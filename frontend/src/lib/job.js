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
