/**
 * Employer business-verification vocabularies, shared between the
 * profile validator and the document upload endpoint.
 */

// Must stay in sync with the `EmployerType` enum in prisma/schema.prisma
const EMPLOYER_TYPES = ['INDIVIDUAL', 'CONTRACTOR', 'COMPANY'];

// Must stay in sync with the `EntityType` enum in prisma/schema.prisma
const ENTITY_TYPES = ['PROPRIETORSHIP', 'PARTNERSHIP', 'LLP', 'PRIVATE_LIMITED'];

// Must stay in sync with the `DocType` enum in prisma/schema.prisma
const DOC_TYPES = [
  'AADHAAR',
  'PAN',
  'SKILL_CERTIFICATE',
  'COMPANY_REGISTRATION',
  'ADDRESS_PROOF_UTILITY_BILL',
  'ADDRESS_PROOF_RENT_AGREEMENT',
  'ADDRESS_PROOF_GST_CERTIFICATE'
];

// The three address-proof variants - exactly one is required
const ADDRESS_PROOF_TYPES = [
  'ADDRESS_PROOF_UTILITY_BILL',
  'ADDRESS_PROOF_RENT_AGREEMENT',
  'ADDRESS_PROOF_GST_CERTIFICATE'
];

// NOTE: a business employer needs PAN + AADHAAR, plus EXACTLY ONE address proof.
// Do not collapse these into a single "required doc types" array - the address
// proof is a choice from ADDRESS_PROOF_TYPES, not three separate requirements.
// Callers use ADDRESS_PROOF_TYPES.some((t) => have(t)) to express that.

// Employer types that must supply the full business detail block
const BUSINESS_EMPLOYER_TYPES = ['CONTRACTOR', 'COMPANY'];

const isBusinessEmployerType = (type) => BUSINESS_EMPLOYER_TYPES.includes(type);

module.exports = {
  EMPLOYER_TYPES,
  ENTITY_TYPES,
  DOC_TYPES,
  ADDRESS_PROOF_TYPES,
  BUSINESS_EMPLOYER_TYPES,
  isBusinessEmployerType
};
