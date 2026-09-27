/**
 * Seeds test accounts: 30 individual employers, 30 contractor employers,
 * 30 company employers and 1 admin.
 *
 *   node prisma/seed-test-accounts.js
 *   node prisma/seed-test-accounts.js --reset   # delete only these accounts first
 *
 * Idempotent: accounts are upserted by email, nothing else is touched.
 *
 * Credentials (password `pass123` for all):
 *   employer1@gmail.com   .. employer30@gmail.com    (INDIVIDUAL)
 *   contractor1@gmail.com .. contractor30@gmail.com  (CONTRACTOR)
 *   company1@gmail.com    .. company30@gmail.com     (COMPANY)
 *   admin@gmail.com                                  (ADMIN)
 *
 * Every account is created with the fields the current profile validation
 * requires, plus PENDING placeholder documents so the admin verification queue
 * has real work to do. Approving a full set flips the employer to verified.
 */
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

const UPLOAD_DIR = path.join(__dirname, '../uploads');
const PASSWORD = 'pass123';
const RESET = process.argv.includes('--reset');

const ADMIN_EMAIL = 'admin@gmail.com';

const range = (n, fn) => Array.from({ length: n }, (_, k) => fn(k + 1));

/** Deterministic, format-valid test values. Distinct phone/ID ranges per group. */
const phone = (prefix, i) => `${prefix}${String(i).padStart(5, '0')}`; // 98765 + 00001 = 9876500001
const ADMIN_PHONE = '9000000001';

const pan = (prefix, i) => `${prefix}${String(i).padStart(4, '0')}X`; // [A-Z]{5}[0-9]{4}[A-Z]
const aadhaar = (band, i) => `9000${String(band * 10000000 + i)}`; // 12 digits

/** Signatory title that actually fits the entity type. */
const SIGNATORY_DESIGNATION = {
  PROPRIETORSHIP: 'Proprietor',
  PARTNERSHIP: 'Managing Partner',
  LLP: 'Designated Partner',
  PRIVATE_LIMITED: 'Director'
};
const LEGAL_SUFFIX = {
  PROPRIETORSHIP: ['Enterprises', 'Constructions', '& Sons', 'Traders'],
  PARTNERSHIP: ['& Co', 'Partners', 'Group'],
  LLP: ['& Associates', 'Consultants', 'Works'],
  PRIVATE_LIMITED: ['Pvt Ltd', 'Ltd', 'Corp']
};

const ADDRESS_PROOF_CYCLE = [
  'ADDRESS_PROOF_UTILITY_BILL',
  'ADDRESS_PROOF_RENT_AGREEMENT',
  'ADDRESS_PROOF_GST_CERTIFICATE'
];
const ADDRESS_PROOF_FILE = {
  ADDRESS_PROOF_UTILITY_BILL: 'Electricity Bill.pdf',
  ADDRESS_PROOF_RENT_AGREEMENT: 'Rent Agreement.pdf',
  ADDRESS_PROOF_GST_CERTIFICATE: 'GST Certificate.pdf'
};

const CITIES = [
  { name: 'Mumbai', lat: 19.076, lng: 72.8777, state: 'Maharashtra', pin: '400001', code: 'MH' },
  { name: 'Pune', lat: 18.5204, lng: 73.8567, state: 'Maharashtra', pin: '411001', code: 'MH' },
  { name: 'Delhi', lat: 28.6139, lng: 77.209, state: 'Delhi', pin: '110001', code: 'DL' },
  { name: 'Bengaluru', lat: 12.9716, lng: 77.5946, state: 'Karnataka', pin: '560001', code: 'KA' },
  { name: 'Chennai', lat: 13.0827, lng: 80.2707, state: 'Tamil Nadu', pin: '600001', code: 'TN' },
  { name: 'Hyderabad', lat: 17.385, lng: 78.4867, state: 'Telangana', pin: '500001', code: 'TS' }
];

const STREETS = [
  '12 MG Road',
  '45 Nehru Nagar',
  '78 Station Road',
  '301 Park Street',
  '9 Civil Lines',
  '56 Brigade Road'
];

const pick = (arr, i) => arr[i % arr.length];

/** CIN-shaped registration number: [ULFS]#####[SS]####[TCC]###### */
const cin = (i, stateCode) =>
  `U${String(10000 + i * 7).padStart(5, '0')}${stateCode}2020PTC${String(100000 + i).padStart(6, '0')}`;

/**
 * One seed group per employer type. `entityTypes: null` means no business block
 * (individuals), `withAddressProof` adds the third mandatory upload.
 */
const GROUPS = [
  {
    key: 'employer',
    label: 'individual employers',
    count: 30,
    employerType: 'INDIVIDUAL',
    email: (i) => `employer${i}@gmail.com`,
    name: (i) => `employer${i}`,
    phone: (i) => phone('98765', i),
    pan: (i) => pan('SEEDP', i),
    aadhaar: (i) => aadhaar(1, i),
    entityTypes: null,
    withAddressProof: false,
    withRegNumber: false
  },
  {
    key: 'contractor',
    label: 'contractors',
    count: 30,
    employerType: 'CONTRACTOR',
    email: (i) => `contractor${i}@gmail.com`,
    name: (i) => `contractor${i}`,
    phone: (i) => phone('98766', i),
    signatoryPhone: (i) => phone('98767', i),
    pan: (i) => pan('CONTP', i),
    aadhaar: (i) => aadhaar(2, i),
    entityTypes: ['PROPRIETORSHIP', 'PARTNERSHIP', 'LLP', 'PRIVATE_LIMITED'],
    withAddressProof: true,
    withRegNumber: false
  },
  {
    key: 'company',
    label: 'companies',
    count: 30,
    employerType: 'COMPANY',
    email: (i) => `company${i}@gmail.com`,
    name: (i) => `company${i}`,
    phone: (i) => phone('98768', i),
    signatoryPhone: (i) => phone('98769', i),
    pan: (i) => pan('COMPP', i),
    aadhaar: (i) => aadhaar(3, i),
    // A registered company is a body corporate - a proprietorship is not one
    entityTypes: ['PRIVATE_LIMITED', 'LLP', 'PARTNERSHIP'],
    withAddressProof: true,
    withRegNumber: true
  }
];

/** Builds a small but genuinely valid single-page PDF. */
const makePdf = (title, lines) => {
  const esc = (s) => String(s).replace(/([()\\])/g, '\\$1');
  const body = [
    'BT',
    '/F1 16 Tf',
    '50 780 Td',
    `(${esc(title)}) Tj`,
    '/F1 11 Tf',
    ...lines.flatMap((l) => ['0 -24 Td', `(${esc(l)}) Tj`]),
    'ET'
  ].join('\n');

  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${Buffer.byteLength(body)} >>\nstream\n${body}\nendstream`
  ];

  let out = '%PDF-1.4\n';
  const offsets = [];
  objects.forEach((obj, i) => {
    offsets.push(Buffer.byteLength(out));
    out += `${i + 1} 0 obj\n${obj}\nendobj\n`;
  });

  const xrefOffset = Buffer.byteLength(out);
  out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const off of offsets) out += `${String(off).padStart(10, '0')} 00000 n \n`;
  out += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  return Buffer.from(out, 'latin1');
};

const writePlaceholder = (userId, docType, originalName) => {
  if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  const fileName = `${userId}-${Date.now()}-${docType.toLowerCase()}.pdf`;
  const pdf = makePdf('SEED PLACEHOLDER - NOT A REAL DOCUMENT', [
    originalName,
    'Generated by prisma/seed-test-accounts.js',
    'Safe to approve/reject while testing the admin review flow.'
  ]);
  fs.writeFileSync(path.join(UPLOAD_DIR, fileName), pdf);
  return fileName;
};

/**
 * Creates the PENDING document rows so the admin queue has something to review.
 * Individual employers get PAN + Aadhaar; contractors also get an address proof.
 */
async function ensureDocuments(userId, specs) {
  for (const { docType, docNumber, fileName } of specs) {
    const existing = await prisma.document.findFirst({
      where: { userId, docType, status: { not: 'REJECTED' } }
    });
    if (existing) continue;

    const stored = writePlaceholder(userId, docType, fileName);
    await prisma.document.create({
      data: {
        userId,
        docType,
        docNumber,
        fileUrl: `/uploads/${stored}`,
        fileName,
        mimeType: 'application/pdf',
        status: 'PENDING'
      }
    });
  }
}

function seedSpec({ email, name, phoneNumber, panNumber, aadhaarNumber, extra = {}, docs }) {
  const { city } = extra;
  return {
    email,
    phone: phoneNumber,
    profile: {
      displayName: name,
      contactPerson: name,
      contactMobile: phoneNumber,
      panNumber,
      aadhaarNumber,
      registeredAddressLine1: extra.street,
      registeredAddressLine2: extra.street2 ?? null,
      registeredAddressCity: city.name,
      registeredAddressState: city.state,
      registeredAddressPincode: city.pin,
      locationLat: city.lat,
      locationLng: city.lng,
      locationText: city.name,
      profileComplete: true,
      ...(extra.profile || {})
    },
    docs
  };
}

/** All seeded account specs, so --reset and the seed loop share one source. */
function buildSpecs() {
  const specs = [];

  for (const group of GROUPS) {
    for (let i = 1; i <= group.count; i++) {
      const name = group.name(i);
      const city = pick(CITIES, i - 1);
      const business = {};
      const docs = [
        { docType: 'PAN', docNumber: group.pan(i), fileName: 'PAN Card.pdf' },
        { docType: 'AADHAAR', docNumber: group.aadhaar(i), fileName: 'Aadhaar.pdf' }
      ];

      if (group.entityTypes) {
        const entityType = pick(group.entityTypes, i - 1);
        business.employerType = group.employerType;
        business.legalBusinessName = `${name} ${pick(LEGAL_SUFFIX[entityType], i - 1)}`;
        business.entityType = entityType;
        business.signatoryName = `${name} Signatory`;
        business.signatoryDesignation = SIGNATORY_DESIGNATION[entityType];
        business.signatoryMobile = group.signatoryPhone(i);
        business.signatoryEmail = `signatory${i}@${group.key}.test`;
      }

      if (group.withAddressProof) {
        const proofType = pick(ADDRESS_PROOF_CYCLE, i - 1);
        business.addressProofDocType = proofType;
        docs.push({ docType: proofType, docNumber: null, fileName: ADDRESS_PROOF_FILE[proofType] });
      }

      if (group.withRegNumber) {
        business.companyRegNumber = cin(i, city.code);
      }

      specs.push(
        seedSpec({
          email: group.email(i),
          name,
          phoneNumber: group.phone(i),
          panNumber: group.pan(i),
          aadhaarNumber: group.aadhaar(i),
          extra: { city, street: pick(STREETS, i - 1), profile: business },
          docs
        })
      );
    }
  }

  return specs;
}

async function reset(specs) {
  const emails = [ADMIN_EMAIL, ...specs.map((s) => s.email)];
  const users = await prisma.user.findMany({
    where: { email: { in: emails } },
    include: { documents: { select: { fileUrl: true } } }
  });

  for (const user of users) {
    for (const doc of user.documents) {
      const p = path.join(UPLOAD_DIR, path.basename(doc.fileUrl));
      if (fs.existsSync(p)) fs.unlinkSync(p);
    }
  }

  // Cascades to EmployerProfile + Document rows
  const { count } = await prisma.user.deleteMany({ where: { email: { in: emails } } });
  console.log(`--reset: removed ${count} previously seeded account(s)`);
}

async function main() {
  const specs = buildSpecs();
  if (RESET) await reset(specs);

  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  // ---- admin ----
  await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: { role: 'ADMIN', passwordHash },
    create: { email: ADMIN_EMAIL, phone: ADMIN_PHONE, passwordHash, role: 'ADMIN' }
  });

  // ---- every seeded account ----
  let done = 0;
  for (const spec of specs) {
    const user = await prisma.user.upsert({
      where: { email: spec.email },
      update: { passwordHash, role: 'EMPLOYER' },
      create: { email: spec.email, phone: spec.phone, passwordHash, role: 'EMPLOYER' }
    });

    // employerType defaults to INDIVIDUAL in the schema, so only business groups set it
    const profileData = { employerType: 'INDIVIDUAL', ...spec.profile };

    await prisma.employerProfile.upsert({
      where: { userId: user.id },
      create: { userId: user.id, ...profileData },
      update: profileData
    });

    await ensureDocuments(user.id, spec.docs);
    done++;
    process.stdout.write(`\rSeeded: ${done}/${specs.length}`);
  }

  const totalDocs = specs.reduce((n, s) => n + s.docs.length, 0);
  console.log(`\n\nDone. 1 admin and ${specs.length} employers:`);
  for (const group of GROUPS) {
    console.log(
      `  ${String(group.count).padStart(2)} ${group.label.padEnd(20)} ${group.email(1)} .. ${group.email(group.count)}`
    );
  }
  console.log(`   1 ${'admin'.padEnd(20)} ${ADMIN_EMAIL}`);
  console.log(`Password: ${PASSWORD} (all accounts)`);
  console.log(`${totalDocs} PENDING placeholder documents queued for admin review.`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
