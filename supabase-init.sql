-- Create enum types
DO $$ BEGIN
  CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'USER');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "AccountStatus" AS ENUM ('PENDING', 'ACTIVE', 'FROZEN', 'CLOSED');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "CardStatus" AS ENUM ('ACTIVE', 'FROZEN', 'EXPIRED');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "TransactionType" AS ENUM ('CREDIT', 'DEBIT', 'TRANSFER_IN', 'TRANSFER_OUT');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Create tables
CREATE TABLE IF NOT EXISTS "User" (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  email TEXT UNIQUE NOT NULL,
  "hashedPassword" TEXT,
  nome TEXT NOT NULL,
  cognome TEXT NOT NULL,
  role "UserRole" NOT NULL DEFAULT 'USER',
  "failedAttempts" INTEGER NOT NULL DEFAULT 0,
  "lockedUntil" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "Account" (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId" TEXT NOT NULL REFERENCES "User"(id),
  iban TEXT UNIQUE NOT NULL,
  balance DOUBLE PRECISION NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'EUR',
  status "AccountStatus" NOT NULL DEFAULT 'PENDING',
  "blockedAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "Card" (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "accountId" TEXT NOT NULL REFERENCES "Account"(id),
  number TEXT UNIQUE NOT NULL,
  cvv TEXT NOT NULL,
  expiry TEXT NOT NULL,
  holder TEXT NOT NULL,
  status "CardStatus" NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "Transaction" (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "accountId" TEXT NOT NULL REFERENCES "Account"(id),
  type "TransactionType" NOT NULL,
  amount DOUBLE PRECISION NOT NULL,
  description TEXT NOT NULL,
  status "TransactionStatus" NOT NULL DEFAULT 'PENDING',
  reference TEXT UNIQUE,
  category TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "RefreshToken" (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  token TEXT UNIQUE NOT NULL,
  "userId" TEXT NOT NULL REFERENCES "User"(id),
  "expiresAt" TIMESTAMPTZ NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "RefreshToken_userId_idx" ON "RefreshToken"("userId");
CREATE INDEX IF NOT EXISTS "RefreshToken_token_idx" ON "RefreshToken"("token");
CREATE INDEX IF NOT EXISTS "RefreshToken_expiresAt_idx" ON "RefreshToken"("expiresAt");

CREATE TABLE IF NOT EXISTS "InviteToken" (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  token TEXT UNIQUE NOT NULL,
  "userId" TEXT NOT NULL REFERENCES "User"(id),
  email TEXT NOT NULL,
  nome TEXT NOT NULL,
  cognome TEXT NOT NULL,
  "expiresAt" TIMESTAMPTZ NOT NULL,
  "usedAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "InviteToken_token_idx" ON "InviteToken"("token");
CREATE INDEX IF NOT EXISTS "InviteToken_userId_idx" ON "InviteToken"("userId");

CREATE TABLE IF NOT EXISTS "RateLimitEntry" (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  key TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 1,
  "expiresAt" TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS "RateLimitEntry_key_idx" ON "RateLimitEntry"("key");

-- Create admin user
-- NOTE: The $$ wrapper prevents PostgreSQL from interpreting bcrypt $ as dollar-quoting.
-- To update the password hash later, run:
--   UPDATE "User" SET "hashedPassword" = '$2b$12$...'::text WHERE email = 'admin@monivia.it';
-- or use: SELECT "hashedPassword" FROM "User" WHERE email = 'admin@monivia.it';
INSERT INTO "User" (id, email, "hashedPassword", nome, cognome, role, "createdAt", "updatedAt")
VALUES (gen_random_uuid()::text, 'admin@monivia.it', '$$2b$12$qmG0cPaJia3VMWAoLsefo.zxnChYtuoc9Kb6ukqte.qLb7m6AizJ2$$', 'Admin', 'Monivia', 'ADMIN', now(), now())
ON CONFLICT (email) DO NOTHING;
