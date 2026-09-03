-- AlterTable
ALTER TABLE "JobApplication" ADD COLUMN     "jobRoleId" TEXT;

-- CreateTable
CREATE TABLE "JobRole" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "roleName" TEXT NOT NULL,
    "skills" TEXT[],
    "count" INTEGER NOT NULL,
    "filledCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "JobRole_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "JobRole_jobId_roleName_key" ON "JobRole"("jobId", "roleName");

-- AddForeignKey
ALTER TABLE "JobRole" ADD CONSTRAINT "JobRole_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobApplication" ADD CONSTRAINT "JobApplication_jobRoleId_fkey" FOREIGN KEY ("jobRoleId") REFERENCES "JobRole"("id") ON DELETE SET NULL ON UPDATE CASCADE;
