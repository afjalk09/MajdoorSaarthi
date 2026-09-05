-- AlterTable
ALTER TABLE "JobApplication" ADD COLUMN     "workNote" TEXT,
ADD COLUMN     "workStatus" TEXT NOT NULL DEFAULT 'NOT_STARTED';
