// The worker fields that are safe to expose to *other* users (employers
// browsing or hiring, etc.). A worker reads their own full profile via
// GET /api/worker/profile; admins see everything via the admin endpoints.
//
// Deliberately excluded: panNumber, aadhaarNumber, locationLat/locationLng and
// updatedAt. Identity documents are never shown to a counterparty, and precise
// coordinates are tracking data the hiring UI has no use for. `userId` is
// included so review/reputation lookups can address the worker without a second
// query — note that Rating/Review/Document all key off User.id, not
// WorkerProfile.id.

const PUBLIC_WORKER_SELECT = {
  id: true,
  userId: true,
  fullName: true,
  roles: true,
  experienceYears: true,
  locationText: true,
  availability: true,
  expectedWageMin: true,
  expectedWageMax: true,
  wageType: true,
  reliabilityScore: true,
  isVerified: true,
  profilePhoto: true,
  createdAt: true
};

// Fragment of a Prisma `include`/`select` value. Use it wherever a query pulls
// in `worker` (applications, hired workers): `include: { ...publicWorkerInclude }`
const publicWorkerInclude = { worker: { select: PUBLIC_WORKER_SELECT } };

/**
 * Narrow an already-loaded full WorkerProfile to its public fields.
 * For queries that must load the full row for other reasons.
 */
const toPublicWorker = (worker) => {
  if (!worker) return null;
  return {
    id: worker.id,
    userId: worker.userId,
    fullName: worker.fullName,
    roles: worker.roles || [],
    experienceYears: worker.experienceYears,
    locationText: worker.locationText,
    availability: worker.availability,
    expectedWageMin: worker.expectedWageMin,
    expectedWageMax: worker.expectedWageMax,
    wageType: worker.wageType,
    reliabilityScore: worker.reliabilityScore,
    isVerified: worker.isVerified,
    profilePhoto: worker.profilePhoto,
    createdAt: worker.createdAt
  };
};

module.exports = { PUBLIC_WORKER_SELECT, publicWorkerInclude, toPublicWorker };
