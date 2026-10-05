// Per-worker reputation and completed-work history.
//
// Nothing in the schema aggregates these, so the employer-facing worker detail
// view computes them on read. Both are derived from tables keyed on User.id
// (Review) or WorkerProfile.id (JobApplication), so callers must pass the
// matching id — `worker.userId` for reviews, `worker.id` for applications.
//
// Note on reliabilityScore: see lib/reliability.js — the column is written by
// two independent paths AND the existing rows are largely raw 0-5 values, so it
// must be normalised on read. `withWorkStats` also returns a freshly-computed
// `reputation.averageRating` so the UI never has to rest on the stored column
// alone.

const { normalizeReliability } = require('./reliability');

// Only COMPLETED applications count as finished work. A HIRED application is
// work in progress and is already visible to the employer via the job itself.
const WORK_HISTORY_STATUSES = ['COMPLETED'];

// Prisma `include` fragment for a worker's completed assignments.
//
// This deliberately contains ONLY `include` + `orderBy`. It must never carry a
// `where`, because callers spread it into `findMany` alongside their own
// `where: { workerId }` — a `where` here would silently OVERWRITE the worker
// filter (spread order) and return every other worker's completed jobs. Pair it
// with completedHistoryWhere() instead.
const WORK_HISTORY_INCLUDE = {
  include: {
    jobRole: { select: { roleName: true } },
    job: {
      select: {
        id: true,
        title: true,
        locationText: true,
        wageAmount: true,
        wageType: true,
        employer: { select: { displayName: true } }
      }
    }
  },
  orderBy: { appliedAt: 'desc' }
};

// The complete `where` for one worker's finished work. Always use this as the
// outer `where` so the worker filter cannot be lost.
const completedHistoryWhere = (workerId) => ({
  workerId,
  status: { in: WORK_HISTORY_STATUSES }
});

// How much of a review's author we expose. `email` is deliberately omitted: a
// review is public to any authenticated user, so attaching the reviewer's email
// would turn every review into an address book. Spread into a `select` under the
// `reviewer`/`reviewee` key of a Review query.
const REVIEW_PARTY_SELECT = {
  id: true,
  workerProfile: { select: { fullName: true } },
  employerProfile: { select: { displayName: true } }
};

/**
 * Shape a raw Review row (as loaded with the reviewer/job includes below) into
 * a public entry. Deliberately omits the reviewer's email address and user id —
 * an employer only needs to know the employer/worker display name.
 *
 * @param {object} review raw Review row
 * @returns {object} `{ id, rating, comment, createdAt, jobId, jobTitle, reviewerName }`
 */
const toPublicReview = (review) => {
  const reviewer = review.reviewer || {};
  const reviewerName =
    reviewer.workerProfile?.fullName || reviewer.employerProfile?.displayName || 'A reviewer';

  return {
    id: review.id,
    rating: review.rating,
    comment: review.comment,
    createdAt: review.createdAt,
    jobId: review.job?.id || null,
    jobTitle: review.job?.title || null,
    reviewerName
  };
};

/**
 * Shape a raw completed JobApplication into a history entry.
 *
 * @param {object} app raw JobApplication loaded with WORK_HISTORY_INCLUDE
 * @returns {object} `{ jobId, jobTitle, roleName, employerName, locationText, wageAmount, wageType, appliedAt }`
 */
const toHistoryEntry = (app) => ({
  jobId: app.job?.id || null,
  jobTitle: app.job?.title || null,
  roleName: app.jobRole?.roleName || null,
  employerName: app.job?.employer?.displayName || null,
  locationText: app.job?.locationText || null,
  wageAmount: app.job?.wageAmount ?? null,
  wageType: app.job?.wageType || null,
  appliedAt: app.appliedAt
});

/**
 * Attach the derived reputation + work history to a public worker projection.
 *
 * @param {object} worker a worker already narrowed by toPublicWorker()
 * @param {object} input
 * @param {Array}  input.reviews        raw Review rows (may be undefined)
 * @param {number} input.averageRating  Review-derived average (may be 0/null)
 * @param {number} input.totalReviews   Review row COUNT (may be undefined)
 * @param {Array}  input.history        raw COMPLETED JobApplication rows
 * @returns {object} `{ ...worker, reputation, reviews, workHistory }`
 */
const withWorkStats = (
  worker,
  { reviews = [], averageRating = 0, totalReviews, history = [] } = {}
) => ({
  ...worker,
  reputation: {
    // Stored column, normalised to the canonical 0-100 scale because the raw
    // value is dual-scale (see lib/reliability.js). Kept for sorting/display
    // parity with the browse and match listings.
    reliabilityScore: normalizeReliability(worker?.reliabilityScore),
    // Freshly computed from Review rows only, on the 1-5 review scale.
    averageRating: Math.round((averageRating || 0) * 100) / 100,
    // `reviews` is capped for the response payload, so the caller must pass the
    // real row count — falling back to the array length would under-report a
    // prolific worker as having at most the cap.
    totalReviews: totalReviews ?? reviews.length
  },
  reviews: reviews.map(toPublicReview),
  workHistory: history.map(toHistoryEntry)
});

module.exports = {
  WORK_HISTORY_STATUSES,
  WORK_HISTORY_INCLUDE,
  completedHistoryWhere,
  REVIEW_PARTY_SELECT,
  toPublicReview,
  toHistoryEntry,
  withWorkStats
};
