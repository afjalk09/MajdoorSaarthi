-- Drop skill-related columns — matching/apply/hire is now role-based
ALTER TABLE "WorkerProfile" DROP COLUMN "skills";
ALTER TABLE "Job" DROP COLUMN "requiredSkills";
ALTER TABLE "JobRole" DROP COLUMN "skills";
ALTER TABLE "WorkerRole" DROP COLUMN "skills";