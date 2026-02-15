-- AlterTable
ALTER TABLE "job_applications" ADD COLUMN     "failedTasks" JSONB NOT NULL DEFAULT '{}';
