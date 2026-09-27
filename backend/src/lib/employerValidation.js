const { ENTITY_TYPES, isBusinessEmployerType } = require('./employerDocs');

const PAN_RE = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const AADHAAR_RE = /^\d{12}$/;
const MOBILE_RE = /^[6-9]\d{9}$/;
const PINCODE_RE = /^\d{6}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const trimToNull = (value) => {
  if (value === undefined || value === null) return null;
  const trimmed = String(value).trim();
  return trimmed.length ? trimmed : null;
};

/**
 * Required for EVERY employer account type: PAN, Aadhaar, contact number and
 * the registered address.
 * `key` is the request body field (snake_case), `column` the EmployerProfile column.
 */
const COMMON_FIELDS = [
  {
    key: 'pan_number',
    column: 'panNumber',
    label: 'PAN',
    required: true,
    uppercase: true,
    test: PAN_RE,
    testMessage: 'Enter a valid PAN (e.g. ABCDE1234F)'
  },
  {
    key: 'aadhaar_number',
    column: 'aadhaarNumber',
    label: 'Aadhaar Number',
    required: true,
    test: AADHAAR_RE,
    testMessage: 'Enter a valid 12-digit Aadhaar number'
  },
  {
    key: 'contact_mobile',
    column: 'contactMobile',
    label: 'Contact Number',
    required: true,
    test: MOBILE_RE,
    testMessage: 'Enter a valid 10-digit mobile number'
  },
  { key: 'registered_address_line1', column: 'registeredAddressLine1', label: 'Registered Address', required: true },
  { key: 'registered_address_line2', column: 'registeredAddressLine2', label: 'Registered Address (line 2)', required: false },
  { key: 'registered_address_city', column: 'registeredAddressCity', label: 'City', required: true },
  { key: 'registered_address_state', column: 'registeredAddressState', label: 'State', required: true },
  {
    key: 'registered_address_pincode',
    column: 'registeredAddressPincode',
    label: 'PIN Code',
    required: true,
    test: PINCODE_RE,
    testMessage: 'Enter a valid 6-digit PIN code'
  }
];

/**
 * Only required for CONTRACTOR / COMPANY: the registered legal entity and the
 * person authorised to act for it. An individual employer is their own signatory.
 */
const BUSINESS_ONLY_FIELDS = [
  { key: 'legal_business_name', column: 'legalBusinessName', label: 'Legal Business Name', required: true },
  {
    key: 'entity_type',
    column: 'entityType',
    label: 'Entity Type',
    required: true,
    enum: ENTITY_TYPES,
    enumMessage: 'Select a valid entity type'
  },
  { key: 'signatory_name', column: 'signatoryName', label: 'Signatory Full Name', required: true },
  { key: 'signatory_designation', column: 'signatoryDesignation', label: 'Signatory Designation', required: true },
  {
    key: 'signatory_mobile',
    column: 'signatoryMobile',
    label: 'Signatory Mobile',
    required: true,
    test: MOBILE_RE,
    testMessage: 'Enter a valid 10-digit mobile number'
  },
  {
    key: 'signatory_email',
    column: 'signatoryEmail',
    label: 'Signatory Email',
    required: true,
    test: EMAIL_RE,
    testMessage: 'Enter a valid email address'
  }
];

const COMMON_COLUMNS = COMMON_FIELDS.map((f) => f.column);
const BUSINESS_ONLY_COLUMNS = BUSINESS_ONLY_FIELDS.map((f) => f.column);

const validateFieldSet = (body, fields, data, errors) => {
  for (const field of fields) {
    let value = trimToNull(body[field.key]);

    if (field.uppercase && value) value = value.toUpperCase();

    if (field.required && !value) {
      errors.push({ field: field.key, message: `${field.label} is required` });
      data[field.column] = null;
      continue;
    }

    if (value && field.test && !field.test.test(value)) {
      errors.push({ field: field.key, message: field.testMessage || `${field.label} is invalid` });
    }

    if (value && field.enum && !field.enum.includes(value.toUpperCase())) {
      errors.push({ field: field.key, message: field.enumMessage || `${field.label} is invalid` });
    }

    data[field.column] = value;
  }
};

/**
 * Validates the profile detail block.
 * @param isBusiness true for CONTRACTOR / COMPANY, which additionally require
 *                   the legal entity + signatory details.
 * @returns `{ data, fields }` where `fields` lists human-readable problems.
 */
const validateProfileFields = (body, isBusiness) => {
  const data = {};
  const fields = [];

  validateFieldSet(body, COMMON_FIELDS, data, fields);
  if (isBusiness) {
    validateFieldSet(body, BUSINESS_ONLY_FIELDS, data, fields);
  }

  return { data, fields };
};

/**
 * Company registration number is only meaningful for COMPANY employers.
 * The PAN format is not enforced here (proprietorships often have no CIN).
 */
const readCompanyRegNumber = (body) => trimToNull(body.company_reg_number);

const requiresBusinessDetails = (employerType) => isBusinessEmployerType(employerType);

module.exports = {
  PAN_RE,
  AADHAAR_RE,
  MOBILE_RE,
  PINCODE_RE,
  EMAIL_RE,
  COMMON_FIELDS,
  BUSINESS_ONLY_FIELDS,
  COMMON_COLUMNS,
  BUSINESS_ONLY_COLUMNS,
  trimToNull,
  validateProfileFields,
  readCompanyRegNumber,
  requiresBusinessDetails
};
