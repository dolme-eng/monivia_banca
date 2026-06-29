-- Add PENDING to AccountStatus enum
ALTER TYPE "AccountStatus" ADD VALUE IF NOT EXISTS 'PENDING' BEFORE 'ACTIVE';

-- Add CANCELLED to TransactionStatus enum
ALTER TYPE "TransactionStatus" ADD VALUE IF NOT EXISTS 'CANCELLED';

-- Add blockedAt column to Account
ALTER TABLE "Account" ADD COLUMN "blockedAt" TIMESTAMP(3);

-- Set all existing accounts to ACTIVE (they were created as ACTIVE before)
UPDATE "Account" SET "status" = 'ACTIVE' WHERE "status" IS NULL;
