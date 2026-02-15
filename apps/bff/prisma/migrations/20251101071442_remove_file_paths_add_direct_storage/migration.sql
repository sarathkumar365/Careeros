/*
  Warnings:

  - You are about to drop the column `jdChecklist` on the `job_applications` table. All the data in the column will be lost.
  - You are about to drop the column `jobDescriptionPath` on the `job_applications` table. All the data in the column will be lost.
  - You are about to drop the column `jobKeywords` on the `job_applications` table. All the data in the column will be lost.
  - You are about to drop the column `originalResumeFilename` on the `job_applications` table. All the data in the column will be lost.
  - You are about to drop the column `originalResumePath` on the `job_applications` table. All the data in the column will be lost.
  - You are about to drop the column `tailoredResumePath` on the `job_applications` table. All the data in the column will be lost.
  - Added the required column `jobDescription` to the `job_applications` table without a default value. This is not possible if the table is not empty.
  - Added the required column `originalResume` to the `job_applications` table without a default value. This is not possible if the table is not empty.
  - Added the required column `templateId` to the `job_applications` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "job_applications" DROP COLUMN "jdChecklist",
DROP COLUMN "jobDescriptionPath",
DROP COLUMN "jobKeywords",
DROP COLUMN "originalResumeFilename",
DROP COLUMN "originalResumePath",
DROP COLUMN "tailoredResumePath",
ADD COLUMN     "checklist" JSONB,
ADD COLUMN     "jobDescription" TEXT NOT NULL,
ADD COLUMN     "originalResume" TEXT NOT NULL,
ADD COLUMN     "tailoredResume" JSONB,
ADD COLUMN     "templateId" TEXT NOT NULL;
