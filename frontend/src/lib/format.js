export function timeAgo(date) {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return 'Just now';
  const intervals = [
    { label: 'year', seconds: 31536000 },
    { label: 'month', seconds: 2592000 },
    { label: 'week', seconds: 604800 },
    { label: 'day', seconds: 86400 },
    { label: 'hour', seconds: 3600 },
    { label: 'minute', seconds: 60 }
  ];
  for (const { label, seconds: secs } of intervals) {
    if (seconds >= secs) {
      const count = Math.floor(seconds / secs);
      return `${count} ${label}${count > 1 ? 's' : ''} ago`;
    }
  }
  return 'Just now';
}

export function formatDateTime(date) {
  return new Date(date).toLocaleString([], {
    dateStyle: 'medium',
    timeStyle: 'short'
  });
}

const formatDay = (date) =>
  new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

/**
 * A job's schedule as a single line, e.g.
 * "12 Jan 2026 – 20 Jan 2026 | 09:00 – 17:00". Returns null when the job has
 * neither a start date nor a start time.
 */
export function formatJobSchedule(job) {
  if (!job?.startDate && !job?.startTime) return null;

  const parts = [];

  if (job.startDate) {
    const start = formatDay(job.startDate);
    const end = job.endDate ? formatDay(job.endDate) : null;
    parts.push(end && end !== start ? `${start} – ${end}` : start);
  }

  if (job.startTime) {
    parts.push(`${job.startTime} – ${job.endTime || '?'}`);
  }

  return parts.join(' | ');
}

/** "₹500/daily" — the wage shown on every job card and detail view. */
export function formatWage(job, { showZero = false } = {}) {
  if (!job || (job.wageAmount === null || job.wageAmount === undefined)) return null;
  if (!job.wageAmount && !showZero) return null;
  return `₹${job.wageAmount}/${String(job.wageType || '').toLowerCase()}`;
}

/** First letters of a person's name, for avatar fallbacks. */
export function initialsOf(name, fallback = '') {
  const source = (name || '').trim();
  if (!source) return fallback;
  return source
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

/**
 * A worker's expected wage as one line, e.g. "₹500–800/daily", or
 * "₹800/daily" when only one bound is set. Returns null when unset.
 *
 * The worker analogue of `formatWage` — a worker quotes a min/max range where a
 * job quotes a single amount.
 */
export function formatExpectedWage(worker) {
  const min = worker?.expectedWageMin;
  const max = worker?.expectedWageMax;
  if ((min === null || min === undefined) && (max === null || max === undefined)) return null;

  const unit = String(worker?.wageType || '').toLowerCase();
  const suffix = unit ? `/${unit}` : '';

  if (min !== null && min !== undefined && max !== null && max !== undefined) {
    return min === max ? `₹${min}${suffix}` : `₹${min}–${max}${suffix}`;
  }
  return `₹${min ?? max}${suffix}`;
}

/**
 * `WorkerProfile.reliabilityScore` is STORED DUAL-SCALE and is displayed on a
 * 5-star scale, so every render site must go through here.
 *
 * The column is denormalised and written by two independent paths
 * (`rating.controller.js` and `review.controller.js`) that both store
 * `(avg / 5) * 100` — a 0-100 value — but the existing rows overwhelmingly
 * hold a raw 0-5 value (100 of 121 in the seeded dev database). Because a
 * 0-100 value is always > 5 and a 0-5 value never is, the threshold is
 * unambiguous: `<= 5` is already the star value. Assuming 0-100 unconditionally
 * rendered those rows as "0/5" and hid the badge entirely.
 *
 * Mirrors `backend/src/lib/reliability.js`. Returns null for an unrated worker
 * so callers can hide the row entirely.
 */
export function formatReliability(score) {
  const value = Number(score);
  if (!Number.isFinite(value) || value <= 0) return null;
  const stars = value <= 5 ? value : value / 20;
  return `${Math.round(stars * 10) / 10}/5`;
}
