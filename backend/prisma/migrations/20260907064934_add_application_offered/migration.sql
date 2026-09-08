-- AlterEnum
ALTER TYPE "ApplicationStatus" ADD VALUE 'OFFERED';

-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "applicationId" TEXT;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "JobApplication"("id") ON DELETE SET NULL ON UPDATE CASCADE;
