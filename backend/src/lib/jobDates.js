// Job schedule → application cutoff.
//
// A job stops accepting NEW applications the moment it starts (its start date,
// plus its start time when one is set) and stays closed after it ends. This is
// deliberately evaluated per request — there is no stored flag, no cron and no
// JobStatus change — so an employer who edits the dates via PUT /api/jobs/:id
// (allowed while status is OPEN) automatically re-opens applications.
//
// Status checks (`status !== 'OPEN'`) stay at the call sites: this module only
// answers the date question.

/** "09:30" → minutes since local midnight; anything malformed → null. */
const parseTime = (value) => {
  if (!value || typeof value !== 'string') return null;
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
};

/**
 * The instant work begins — `startDate` at `startTime` (default 00:00 local),
 * or null when the job has no start date.
 */
const jobStartMoment = (job) => {
  if (!job?.startDate) return null;
  const moment = new Date(job.startDate);
  const minutes = parseTime(job.startTime);
  const total = minutes === null ? 0 : minutes;
  moment.setHours(Math.floor(total / 60), total % 60, 0, 0);
  return moment;
};

/**
 * The instant work ends — the last millisecond of `endDate`, or null when the
 * job has no end date. An open-ended job never closes by end date.
 */
const jobEndMoment = (job) => {
  if (!job?.endDate) return null;
  const moment = new Date(job.endDate);
  moment.setHours(23, 59, 59, 999);
  return moment;
};

/**
 * Why applications are closed for this job, or null while they are open.
 *
 * 'ENDED' wins over 'STARTED' because it is the more useful message. Jobs with
 * no dates are never date-closed.
 */
const applicationsClosedReason = (job, now = new Date()) => {
  const end = jobEndMoment(job);
  if (end && end <= now) return 'ENDED';
  const start = jobStartMoment(job);
  if (start && start <= now) return 'STARTED';
  return null;
};

const isJobApplicationsClosed = (job, now = new Date()) =>
  applicationsClosedReason(job, now) !== null;

/** Server-facing message for a 400 response. */
const applicationsClosedMessage = (reason) =>
  reason === 'ENDED'
    ? 'This job has ended — applications are closed'
    : 'This job has already started — applications are closed';

module.exports = {
  jobStartMoment,
  jobEndMoment,
  applicationsClosedReason,
  isJobApplicationsClosed,
  applicationsClosedMessage
};
