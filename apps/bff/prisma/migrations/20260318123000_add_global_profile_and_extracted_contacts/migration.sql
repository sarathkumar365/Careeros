-- CreateTable
CREATE TABLE "profiles" (
    "id" TEXT NOT NULL,
    "scope" TEXT NOT NULL DEFAULT 'global',
    "email" TEXT,
    "github" TEXT,
    "linkedin" TEXT,
    "personalSite" TEXT,
    "phone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "profiles_scope_key" ON "profiles"("scope");

-- AlterTable
ALTER TABLE "job_applications" ADD COLUMN "extractedContacts" JSONB,
ADD COLUMN "profileId" TEXT;

-- Seed global profile row
INSERT INTO "profiles" ("id", "scope", "createdAt", "updatedAt")
VALUES ('global-profile', 'global', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("scope") DO NOTHING;

-- Backfill existing rows
UPDATE "job_applications"
SET "profileId" = 'global-profile'
WHERE "profileId" IS NULL;

-- Enforce non-null relationship
ALTER TABLE "job_applications"
ALTER COLUMN "profileId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "job_applications"
ADD CONSTRAINT "job_applications_profileId_fkey"
FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
