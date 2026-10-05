// Shared, single-source-of-truth logic for per-role capacity on a job.
//
// Capacity rule: only HIRED / COMPLETED applications fill a seat. A pending
// OFFERED application does NOT reserve a slot — the first acceptance wins.
// `recomputeJobFill` in job.controller.js persists the HIRED/COMPLETED half of
// this rule into `JobRole.filledCount`; `withRoleCapacity` derives the read-side
// view from real application rows so responses never trust a stale column.

// Application statuses that can appear on a job's roles. Anything outside
// HIRED/COMPLETED/OFFERED (PENDING, REJECTED, WITHDRAWN, ...) is not capacity.
const CAPACITY_STATUSES = ['HIRED', 'COMPLETED', 'OFFERED'];

// Prisma `include` fragment: roles plus just the application statuses needed
// to compute capacity. Spread into a query's `jobRoles` field.
const roleCapacityInclude = {
  include: {
    applications: {
      where: { status: { in: CAPACITY_STATUSES } },
      select: { status: true }
    }
  }
};

/**
 * Derive live fill + capacity for each role of a job and strip the raw
 * application rows. Expects roles queried with `roleCapacityInclude`.
 *
 * `filledCount` is recomputed from real HIRED/COMPLETED applications rather
 * than read from the stored `JobRole.filledCount` column, so a response can
 * never report a stale count. `recomputeJobFill` still persists the same
 * numbers; this is the read-side mirror of that rule.
 *
 * @param {Array} jobRoles roles including `applications: [{ status }]`
 * @returns {Array} roles with `filledCount`, `offeredCount` and
 *                   `remainingCapacity` added and `applications` removed
 */
const withRoleCapacity = (jobRoles = []) =>
  jobRoles.map(({ applications, ...role }) => {
    const apps = applications || [];
    const offeredCount = apps.filter((a) => a.status === 'OFFERED').length;
    const hiredCount = apps.length - offeredCount;

    return {
      ...role,
      filledCount: hiredCount,
      offeredCount,
      remainingCapacity: role.count - hiredCount
    };
  });

module.exports = { CAPACITY_STATUSES, roleCapacityInclude, withRoleCapacity };
