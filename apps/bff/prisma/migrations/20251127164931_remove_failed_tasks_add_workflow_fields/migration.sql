/*
  Warnings:

  - You are about to drop the column `failedTasks` on the `job_applications` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "job_applications" DROP COLUMN "failedTasks",
ADD COLUMN     "workflowStatus" TEXT,
ADD COLUMN     "workflowSteps" JSONB NOT NULL DEFAULT '{}';
