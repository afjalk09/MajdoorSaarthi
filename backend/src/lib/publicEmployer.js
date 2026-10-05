// The employer fields that are safe to expose to *other* users (workers
// browsing a job, etc.). Employers read their own full profile via
// GET /api/employer/profile; admins see everything via the admin endpoints.
//
// Deliberately excluded: panNumber, aadhaarNumber, contactMobile, every
// signatory* field, every registeredAddress* field, addressProofDocType and
// legalBusinessName. Per the project design `displayName` is the public-facing
// name and `legalBusinessName` is the tax-document name — only the former is
// public. `userId` is included so notification/socket code can address the
// employer without a second lookup.

const PUBLIC_EMPLOYER_SELECT = {
  id: true,
  userId: true,
  displayName: true,
  employerType: true,
  contactPerson: true,
  locationText: true,
  isVerified: true
};

// Fragment of a Prisma `include` value. Spread it into the `include` of a
// job query: `include: { ...publicEmployerInclude, jobRoles: ... }`
const publicEmployerInclude = { employer: { select: PUBLIC_EMPLOYER_SELECT } };

/**
 * Narrow an already-loaded full EmployerProfile to its public fields.
 * For queries that must load the full row for other reasons.
 */
const toPublicEmployer = (employer) => {
  if (!employer) return null;
  return {
    id: employer.id,
    userId: employer.userId,
    displayName: employer.displayName,
    employerType: employer.employerType,
    contactPerson: employer.contactPerson,
    locationText: employer.locationText,
    isVerified: employer.isVerified
  };
};

module.exports = { PUBLIC_EMPLOYER_SELECT, publicEmployerInclude, toPublicEmployer };
