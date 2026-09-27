-- Contractor / company employer business verification details

-- Legal entity classification for contractors & companies
CREATE TYPE "EntityType" AS ENUM ('PROPRIETORSHIP', 'PARTNERSHIP', 'LLP', 'PRIVATE_LIMITED');

-- One-of address proof documents (utility bill / rent agreement / GST certificate)
ALTER TYPE "DocType" ADD VALUE 'ADDRESS_PROOF_UTILITY_BILL';
ALTER TYPE "DocType" ADD VALUE 'ADDRESS_PROOF_RENT_AGREEMENT';
ALTER TYPE "DocType" ADD VALUE 'ADDRESS_PROOF_GST_CERTIFICATE';

-- Business details
ALTER TABLE "EmployerProfile" ADD COLUMN "legalBusinessName" TEXT;
ALTER TABLE "EmployerProfile" ADD COLUMN "entityType" "EntityType";
ALTER TABLE "EmployerProfile" ADD COLUMN "signatoryName" TEXT;
ALTER TABLE "EmployerProfile" ADD COLUMN "signatoryDesignation" TEXT;
ALTER TABLE "EmployerProfile" ADD COLUMN "signatoryMobile" TEXT;
ALTER TABLE "EmployerProfile" ADD COLUMN "signatoryEmail" TEXT;

-- Registered address + address proof
ALTER TABLE "EmployerProfile" ADD COLUMN "registeredAddressLine1" TEXT;
ALTER TABLE "EmployerProfile" ADD COLUMN "registeredAddressLine2" TEXT;
ALTER TABLE "EmployerProfile" ADD COLUMN "registeredAddressCity" TEXT;
ALTER TABLE "EmployerProfile" ADD COLUMN "registeredAddressState" TEXT;
ALTER TABLE "EmployerProfile" ADD COLUMN "registeredAddressPincode" TEXT;
ALTER TABLE "EmployerProfile" ADD COLUMN "addressProofDocType" TEXT;

-- True once all required business details + documents are on file
ALTER TABLE "EmployerProfile" ADD COLUMN "profileComplete" BOOLEAN NOT NULL DEFAULT false;

-- Document metadata (original filename, mime type, printed doc number for admin review)
ALTER TABLE "Document" ADD COLUMN "fileName" TEXT;
ALTER TABLE "Document" ADD COLUMN "mimeType" TEXT;
ALTER TABLE "Document" ADD COLUMN "docNumber" TEXT;
