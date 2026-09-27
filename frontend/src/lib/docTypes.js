// Verification document / entity vocabularies, mirroring
// backend/src/lib/employerDocs.js

export const DOC_TYPE_LABELS = {
  AADHAAR: 'Aadhaar Card',
  PAN: 'PAN Card',
  SKILL_CERTIFICATE: 'Skill Certificate',
  COMPANY_REGISTRATION: 'Company Registration',
  ADDRESS_PROOF_UTILITY_BILL: 'Address Proof — Utility Bill',
  ADDRESS_PROOF_RENT_AGREEMENT: 'Address Proof — Rent Agreement',
  ADDRESS_PROOF_GST_CERTIFICATE: 'Address Proof — GST Certificate'
};

export const ENTITY_TYPE_OPTIONS = [
  { value: 'PROPRIETORSHIP', label: 'Proprietorship' },
  { value: 'PARTNERSHIP', label: 'Partnership' },
  { value: 'LLP', label: 'LLP' },
  { value: 'PRIVATE_LIMITED', label: 'Private Limited Company' }
];

export const ADDRESS_PROOF_OPTIONS = [
  { value: 'ADDRESS_PROOF_UTILITY_BILL', label: 'Utility Bill' },
  { value: 'ADDRESS_PROOF_RENT_AGREEMENT', label: 'Rent Agreement' },
  { value: 'ADDRESS_PROOF_GST_CERTIFICATE', label: 'GST Registration Certificate' }
];

export const ADDRESS_PROOF_TYPES = ADDRESS_PROOF_OPTIONS.map((o) => o.value);

// Documents a CONTRACTOR / COMPANY employer must have on file
export const REQUIRED_BUSINESS_DOC_TYPES = ['PAN', 'AADHAAR'];

export const BUSINESS_EMPLOYER_TYPES = ['CONTRACTOR', 'COMPANY'];

export const isBusinessType = (employerType) =>
  BUSINESS_EMPLOYER_TYPES.includes(String(employerType || '').toUpperCase());

export const DOC_STATUS_LABELS = {
  PENDING: 'Pending review',
  APPROVED: 'Approved',
  REJECTED: 'Rejected'
};

export const ACCEPTED_UPLOAD_TYPES = ['.pdf', '.jpg', '.jpeg', '.png', '.webp'];

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

export const formatFileSize = (bytes) => {
  if (!bytes && bytes !== 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const docTypeLabel = (docType) =>
  DOC_TYPE_LABELS[docType] || String(docType || '').replace(/_/g, ' ').toLowerCase();

/**
 * A document counts as "on file" while it is pending review or approved.
 * Rejected documents must be re-uploaded, so they don't satisfy the requirement.
 */
export const isDocumentOnFile = (doc) => doc && doc.status !== 'REJECTED';
