-- Google auth users (idempotent recovery from partial apply)

UPDATE "User" SET role = 'HOD' WHERE role::text = 'ADMIN';

DO $$ BEGIN
  CREATE TYPE "UserStatus" AS ENUM ('PENDING', 'APPROVED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "User" ALTER COLUMN "role" DROP DEFAULT;

DO $$ BEGIN
  CREATE TYPE "UserRole_new" AS ENUM ('STAFF', 'HOD');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Only rewrite role type if old ADMIN-capable enum still exists
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'UserRole' AND e.enumlabel = 'ADMIN'
  ) THEN
    ALTER TABLE "User" ALTER COLUMN "role" TYPE "UserRole_new" USING ("role"::text::"UserRole_new");
    DROP TYPE "UserRole";
    ALTER TYPE "UserRole_new" RENAME TO "UserRole";
  ELSIF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'UserRole_new')
     AND EXISTS (SELECT 1 FROM pg_type WHERE typname = 'UserRole') THEN
    -- UserRole already STAFF/HOD; drop unused new type
    DROP TYPE "UserRole_new";
  END IF;
END $$;

ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'STAFF'::"UserRole";

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "status" "UserStatus";
UPDATE "User" SET status = 'APPROVED' WHERE status IS NULL;
ALTER TABLE "User" ALTER COLUMN "status" SET DEFAULT 'PENDING'::"UserStatus";
ALTER TABLE "User" ALTER COLUMN "status" SET NOT NULL;

ALTER TABLE "User" ALTER COLUMN "canSignOut" SET DEFAULT false;

CREATE TABLE IF NOT EXISTS "GoogleAccount" (
    "id" TEXT NOT NULL,
    "googleSub" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,

    CONSTRAINT "GoogleAccount_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "GoogleAccount_googleSub_key" ON "GoogleAccount"("googleSub");
CREATE INDEX IF NOT EXISTS "GoogleAccount_userId_idx" ON "GoogleAccount"("userId");
CREATE INDEX IF NOT EXISTS "GoogleAccount_email_idx" ON "GoogleAccount"("email");

DO $$ BEGIN
  ALTER TABLE "GoogleAccount" ADD CONSTRAINT "GoogleAccount_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
