-- =============================================================================
-- 0_init_baseline_current_schema
-- =============================================================================
-- BASELINE DE REFERENCE — NE PAS REJOUER SUR LA PRODUCTION.
--
-- Pourquoi ce fichier existe
-- -------------------------
-- La base de production a ete creee et modifiee entierement a la main via le
-- SQL Editor de Supabase. La table `_prisma_migrations` n'a jamais ete peuplee :
-- le CLI Prisma n'a donc AUCUNE connaissance de l'etat reel de la base.
--
-- Consequence avant ce baseline : le premier `prisma migrate deploy` execute par
-- quelqu'un aurait cru la base vide et aurait tente de recreeer les 9 tables
-- existantes, sur une base contenant 23 utilisateurs, 13 comptes, 48
-- transactions et 61 refresh tokens. Il aurait echoue (ou, pire, aurait
-- declenche une perte de donnees).
--
-- Ce fichier decrit l'etat VERIFIE de la base au 2026-09-30. Il est marque
-- comme deja applique via `prisma migrate resolve --applied`, ce qui rend
-- `migrate deploy` inoffensif : il saute ce dossier et n'applique que les
-- migrations futures.
--
-- Etat reel releve par introspection (colonnes, defaults, index, contraintes,
-- actions referentielles). Ne pas inventer : chaque ligne correspond a ce que
-- la base contient reellement.
--
-- Ecarts VOLONTAIRES.schema.prisma declare des choses que la base ne fait pas
-- ------------------------------------------------------------------------
-- 1. FK RefreshToken.userId : `schema.prisma` dit `onDelete: Cascade`, la base
--    est en `CASCADE` — coherent. Mais `Account.userId`, `Card.accountId` et
--    `Transaction.accountId` sont en `NO ACTION` dans la base, et c'est
--    CORRECT : le code supprime explicitement les enfants avant le parent
--    (voir `close`/`purge` dans src/app/api/admin/accounts/[id]/status/route.ts).
-- 2. `AuditLog.id` n'a PAS de default en base (les lignes sont creees avec un
--    uuid genere par le code). Ce fichier respecte la base, pas le schema.
-- 3. Colonnes temporelles : la base melange `timestamptz` (createdAt partout) et
--    `timestamp without time zone` (updatedAt partout sauf Transaction, qui est
--    en timestamptz). Reflete tel quel — voir la migration de normalisation
--    si on veut uniformiser.
-- 4. Contrainte `transaction_description_length` (CHECK length(description)<=255)
--    existe en base mais n'est declaree nulle part dans schema.prisma. Elle est
--    reprise ici pour que le baseline soit fidele.
-- 5. `account_balance_non_negative` existe en double (casse minuscule ET
--    majuscule) : deux CHECK identiques pour la meme regle. Reproduit tel quel
--    ; le nettoyage est une migration dediee (option B), pas ici.
-- =============================================================================

-- pgcrypto pour gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'USER');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "AccountStatus" AS ENUM ('PENDING', 'ACTIVE', 'FROZEN', 'CLOSED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "CardStatus" AS ENUM ('ACTIVE', 'FROZEN', 'EXPIRED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "TransactionType" AS ENUM ('CREDIT', 'DEBIT', 'TRANSFER_IN', 'TRANSFER_OUT');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------------------------
-- User
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "User" (
  "id"             TEXT NOT NULL DEFAULT (gen_random_uuid())::text,
  "email"          TEXT NOT NULL,
  "hashedPassword" TEXT,
  "nome"           TEXT NOT NULL,
  "cognome"        TEXT NOT NULL,
  "role"           "UserRole" NOT NULL DEFAULT 'USER'::"UserRole",
  "createdAt"      TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "failedAttempts" INTEGER NOT NULL DEFAULT 0,
  "lockedUntil"    TIMESTAMPTZ,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");

-- ---------------------------------------------------------------------------
-- Account
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "Account" (
  "id"        TEXT NOT NULL DEFAULT (gen_random_uuid())::text,
  "userId"    TEXT NOT NULL,
  "iban"      TEXT NOT NULL,
  "balance"   DECIMAL(12,2) NOT NULL DEFAULT 0,
  "currency"  TEXT NOT NULL DEFAULT 'EUR'::text,
  "status"    "AccountStatus" NOT NULL DEFAULT 'ACTIVE'::"AccountStatus",
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "blockedAt" TIMESTAMP,
  CONSTRAINT "Account_pkey" PRIMARY KEY ("id"),
  -- Defense in depth: un solde negatif ne doit jamais etre persistable.
  CONSTRAINT "Account_balance_non_negative" CHECK (balance >= 0),
  CONSTRAINT "Account_currency_eur_only" CHECK (currency = 'EUR')
);
CREATE UNIQUE INDEX IF NOT EXISTS "Account_iban_key" ON "Account"("iban");
CREATE INDEX IF NOT EXISTS "Account_userId_idx" ON "Account"("userId");
CREATE INDEX IF NOT EXISTS "Account_createdAt_idx" ON "Account"("createdAt");
DO $$ BEGIN
  ALTER TABLE "Account" DROP CONSTRAINT IF EXISTS "Account_userId_fkey";
  ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
END $$;

-- ---------------------------------------------------------------------------
-- Card
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "Card" (
  "id"         TEXT NOT NULL DEFAULT (gen_random_uuid())::text,
  "accountId"  TEXT NOT NULL,
  "numberHash" TEXT NOT NULL,
  "last4"      TEXT NOT NULL,
  -- PAN chiffre en AES-256-GCM. NULL pour les cartes emises avant le stockage
  -- chiffre : elles ne peuvent jamais reveler le numero complet.
  "panEnc"     TEXT,
  "expiry"     TEXT NOT NULL,
  "holder"     TEXT NOT NULL,
  "status"     "CardStatus" NOT NULL DEFAULT 'ACTIVE'::"CardStatus",
  "createdAt"  TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Card_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Card_last4_len4" CHECK (char_length(last4) = 4)
);
CREATE UNIQUE INDEX IF NOT EXISTS "Card_numberHash_key" ON "Card"("numberHash");
CREATE INDEX IF NOT EXISTS "Card_accountId_idx" ON "Card"("accountId");
DO $$ BEGIN
  ALTER TABLE "Card" DROP CONSTRAINT IF EXISTS "Card_accountId_fkey";
  ALTER TABLE "Card" ADD CONSTRAINT "Card_accountId_fkey"
    FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
END $$;

-- ---------------------------------------------------------------------------
-- Transaction
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "Transaction" (
  "id"          TEXT NOT NULL DEFAULT (gen_random_uuid())::text,
  "accountId"   TEXT NOT NULL,
  "type"        "TransactionType" NOT NULL,
  "amount"      DECIMAL(12,2) NOT NULL,
  "description" TEXT NOT NULL,
  "status"      "TransactionStatus" NOT NULL DEFAULT 'PENDING'::"TransactionStatus",
  "reference"   TEXT,
  "category"    TEXT,
  "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"   TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Transaction_amount_nonzero" CHECK (amount <> 0),
  CONSTRAINT "transaction_description_length" CHECK (length(description) <= 255)
);
CREATE UNIQUE INDEX IF NOT EXISTS "Transaction_reference_key" ON "Transaction"("reference");
CREATE INDEX IF NOT EXISTS "Transaction_accountId_idx" ON "Transaction"("accountId");
CREATE INDEX IF NOT EXISTS "Transaction_status_idx" ON "Transaction"("status");
CREATE INDEX IF NOT EXISTS "Transaction_createdAt_idx" ON "Transaction"("createdAt");
DO $$ BEGIN
  ALTER TABLE "Transaction" DROP CONSTRAINT IF EXISTS "Transaction_accountId_fkey";
  ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_accountId_fkey"
    FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
END $$;

-- ---------------------------------------------------------------------------
-- RefreshToken
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "RefreshToken" (
  "id"         TEXT NOT NULL,
  "token"      TEXT NOT NULL,
  "userId"     TEXT NOT NULL,
  "expiresAt"  TIMESTAMP NOT NULL,
  "createdAt"  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "consumedAt" TIMESTAMP,
  "updatedAt"  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "RefreshToken_token_key" ON "RefreshToken"("token");
CREATE INDEX IF NOT EXISTS "RefreshToken_userId_idx" ON "RefreshToken"("userId");
CREATE INDEX IF NOT EXISTS "RefreshToken_token_idx" ON "RefreshToken"("token");
CREATE INDEX IF NOT EXISTS "RefreshToken_expiresAt_idx" ON "RefreshToken"("expiresAt");
DO $$ BEGIN
  ALTER TABLE "RefreshToken" DROP CONSTRAINT IF EXISTS "RefreshToken_userId_fkey";
  -- CASCADE reel : supprimer un utilisateur doit emporter ses refresh tokens,
  -- sinon un compte efface garderait des sessions vivantes.
  ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
END $$;

-- ---------------------------------------------------------------------------
-- InviteToken
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "InviteToken" (
  "id"        TEXT NOT NULL DEFAULT (gen_random_uuid())::text,
  "token"     TEXT NOT NULL,
  "userId"    TEXT NOT NULL,
  "email"     TEXT NOT NULL,
  "nome"      TEXT NOT NULL,
  "cognome"   TEXT NOT NULL,
  "expiresAt" TIMESTAMPTZ NOT NULL,
  "usedAt"    TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InviteToken_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "InviteToken_token_key" ON "InviteToken"("token");
CREATE INDEX IF NOT EXISTS "InviteToken_token_idx" ON "InviteToken"("token");
CREATE INDEX IF NOT EXISTS "InviteToken_userId_idx" ON "InviteToken"("userId");
DO $$ BEGIN
  ALTER TABLE "InviteToken" DROP CONSTRAINT IF EXISTS "InviteToken_userId_fkey";
  ALTER TABLE "InviteToken" ADD CONSTRAINT "InviteToken_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
END $$;

-- ---------------------------------------------------------------------------
-- PasswordResetToken
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "PasswordResetToken" (
  "id"        TEXT NOT NULL DEFAULT (gen_random_uuid())::text,
  "token"     TEXT NOT NULL,
  "userId"    TEXT NOT NULL,
  "expiresAt" TIMESTAMPTZ NOT NULL,
  "usedAt"    TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "PasswordResetToken_token_key" ON "PasswordResetToken"("token");
CREATE INDEX IF NOT EXISTS "PasswordResetToken_token_idx" ON "PasswordResetToken"("token");
CREATE INDEX IF NOT EXISTS "PasswordResetToken_userId_idx" ON "PasswordResetToken"("userId");
DO $$ BEGIN
  ALTER TABLE "PasswordResetToken" DROP CONSTRAINT IF EXISTS "PasswordResetToken_userId_fkey";
  ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
END $$;

-- ---------------------------------------------------------------------------
-- RateLimitEntry
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "RateLimitEntry" (
  "id"      TEXT NOT NULL DEFAULT (gen_random_uuid())::text,
  "key"     TEXT NOT NULL,
  "count"   INTEGER NOT NULL DEFAULT 1,
  "resetAt" TIMESTAMPTZ NOT NULL,
  CONSTRAINT "RateLimitEntry_pkey" PRIMARY KEY ("key")
);
CREATE UNIQUE INDEX IF NOT EXISTS "RateLimitEntry_key_key" ON "RateLimitEntry"("key");
CREATE INDEX IF NOT EXISTS "RateLimitEntry_key_idx" ON "RateLimitEntry"("key");
CREATE INDEX IF NOT EXISTS "RateLimitEntry_resetAt_idx" ON "RateLimitEntry"("resetAt");

CREATE OR REPLACE FUNCTION cleanup_rate_limits() RETURNS void AS $$
BEGIN
  DELETE FROM "RateLimitEntry" WHERE "resetAt" < NOW();
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------------
-- AuditLog — piste d'audit immuable des operations sensibles
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "AuditLog" (
  "id"        TEXT NOT NULL,
  "actorId"   TEXT NOT NULL,
  "action"    TEXT NOT NULL,
  "entity"    TEXT NOT NULL,
  "entityId"  TEXT NOT NULL,
  "before"    TEXT,
  "after"     TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "AuditLog_actorId_idx" ON "AuditLog"("actorId");
CREATE INDEX IF NOT EXISTS "AuditLog_entity_entityId_idx" ON "AuditLog"("entity", "entityId");
CREATE INDEX IF NOT EXISTS "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");