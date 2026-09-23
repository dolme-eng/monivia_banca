-- Migration: encrypted PAN storage + audit trail
-- Run this in Supabase Dashboard > SQL Editor, then deploy the code.
-- Idempotent: safe to run multiple times.

-- 1. Encrypted full PAN on Card (NULL for pre-existing cards: those can
--    never reveal the full number, only last4 — expected, not an error)
ALTER TABLE "Card" ADD COLUMN IF NOT EXISTS "panEnc" TEXT;

-- 2. Immutable audit trail for sensitive operations
CREATE TABLE IF NOT EXISTS "AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "before" TEXT,
    "after" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "AuditLog_actorId_idx" ON "AuditLog"("actorId");
CREATE INDEX IF NOT EXISTS "AuditLog_entity_entityId_idx" ON "AuditLog"("entity", "entityId");
CREATE INDEX IF NOT EXISTS "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");
