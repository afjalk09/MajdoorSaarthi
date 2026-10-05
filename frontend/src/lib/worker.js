// Presentation vocabulary for a worker, mirroring lib/job.js for a job.
//
// Availability and per-assignment work status are the two worker-side enums
// that appear across the profile, the details dialog and the per-job tracking
// lists — keeping the labels in one place stops them drifting.

/** Must stay in sync with the `Availability` enum in prisma/schema.prisma */
export const AVAILABILITY_META = {
  AVAILABLE: { label: 'Available', className: 'bg-green-100 text-green-700' },
  BUSY: { label: 'Busy on a job', className: 'bg-amber-100 text-amber-700' },
  UNAVAILABLE: { label: 'Unavailable', className: 'bg-gray-100 text-gray-600' }
};

export function availabilityLabel(availability) {
  return AVAILABILITY_META[availability]?.label || availability || 'Unknown';
}

/**
 * Must stay in sync with `JobApplication.workStatus`. Note that
 * `COMPLETION_REQUESTED` is written by the worker and only the employer can
 * resolve it (accept/reject), so both audiences need the label.
 */
export const WORK_STATUS_META = {
  NOT_STARTED: 'Not started',
  IN_PROGRESS: 'In progress',
  COMPLETION_REQUESTED: 'Awaiting employer acceptance',
  COMPLETED: 'Completed'
};

export function workStatusLabel(status) {
  return WORK_STATUS_META[status] || status || 'Unknown';
}
