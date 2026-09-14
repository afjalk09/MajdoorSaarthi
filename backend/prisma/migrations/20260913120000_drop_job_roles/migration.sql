-- DropForeignKey
ALTER TABLE "JobApplication" DROP CONSTRAINT IF EXISTS "JobApplication_jobRoleId_fkey";

-- DropForeignKey
ALTER TABLE "JobRole" DROP CONSTRAINT IF EXISTS "JobRole_jobId_fkey";

-- DropTable
DROP TABLE IF EXISTS "JobRole";

-- AlterTable
ALTER TABLE "JobApplication" DROP COLUMN IF EXISTS "jobRoleId";