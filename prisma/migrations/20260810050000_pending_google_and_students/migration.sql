-- Pending Google account links + lab club student role

DO $$ BEGIN
  CREATE TYPE "GoogleAccountStatus" AS ENUM ('PENDING', 'APPROVED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "GoogleAccount" ADD COLUMN IF NOT EXISTS "status" "GoogleAccountStatus";
UPDATE "GoogleAccount" SET status = 'APPROVED' WHERE status IS NULL;
ALTER TABLE "GoogleAccount" ALTER COLUMN "status" SET DEFAULT 'PENDING'::"GoogleAccountStatus";
ALTER TABLE "GoogleAccount" ALTER COLUMN "status" SET NOT NULL;

CREATE INDEX IF NOT EXISTS "GoogleAccount_status_idx" ON "GoogleAccount"("status");

DO $$ BEGIN
  ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'STUDENT';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
