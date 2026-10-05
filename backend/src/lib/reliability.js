// The `WorkerProfile.reliabilityScore` column is denormalised and is NOT
// reliably on a single scale.
//
// Two code paths write it, both as `(avgRating / 5) * 100` (a 0-100 value):
//   - review.controller.js  (from Review rows)
//   - rating.controller.js  (from Rating rows)
// because they were written independently, last write wins, so the column can
// silently flip between the two tables.
//
// On top of that, the existing database rows overwhelmingly hold a RAW 0-5
// value (100 of 121 rows in the seeded dev database), presumably from an
// earlier code path or manual seeding. Only 2 rows were above 5.
//
// So any read of this column has to accept BOTH scales. Because a 0-100 value
// is always greater than 5 and a 0-5 value never is, the threshold is
// unambiguous: `value <= 5` means the row is already on the star scale.
const STAR_MAX = 5;
const STORED_MAX = 100;

/**
 * Coerce a stored `reliabilityScore` to the canonical 0-100 scale.
 * Returns 0 for null/undefined/NaN/non-positive input.
 */
const normalizeReliability = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return n <= STAR_MAX ? n * (STORED_MAX / STAR_MAX) : n;
};

/**
 * Coerce a stored `reliabilityScore` to the 0-5 display scale, rounded to one
 * decimal. Returns null for an unrated worker so callers can hide the row.
 */
const toStarScore = (value) => {
  const normalized = normalizeReliability(value);
  if (normalized <= 0) return null;
  return Math.round((normalized / STORED_MAX) * STAR_MAX * 10) / 10;
};

module.exports = {
  STAR_MAX,
  STORED_MAX,
  normalizeReliability,
  toStarScore
};