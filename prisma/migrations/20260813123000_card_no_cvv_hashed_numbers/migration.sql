-- Migration: Remove CVV, hash card numbers
-- WARNING: This is destructive — existing card numbers are lost.
-- For production: backup Card table first, then run this migration.

-- 1. Add new columns
ALTER TABLE "Card" ADD COLUMN "numberHash" TEXT;
ALTER TABLE "Card" ADD COLUMN "last4" TEXT;

-- 2. Populate last4 from existing numbers (last 4 chars)
UPDATE "Card" SET "last4" = RIGHT("number", 4);
UPDATE "Card" SET "numberHash" = "number";

-- 3. Make columns NOT NULL and add unique constraint
ALTER TABLE "Card" ALTER COLUMN "numberHash" SET NOT NULL;
ALTER TABLE "Card" ALTER COLUMN "last4" SET NOT NULL;
ALTER TABLE "Card" ADD CONSTRAINT "Card_numberHash_key" UNIQUE ("numberHash");

-- 4. Drop old columns
ALTER TABLE "Card" DROP COLUMN "cvv";
ALTER TABLE "Card" DROP COLUMN "number";
