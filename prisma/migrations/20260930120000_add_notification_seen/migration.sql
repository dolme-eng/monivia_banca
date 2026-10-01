-- Notification "seen" state for clients.
--
-- Why a table: without it, a derived notification cannot know what the client
-- already saw, so every page load would re-show the same events. This stores
-- only the read-marker — the event itself stays derivable from Transaction /
-- Account / AuditLog, so no notification content is duplicated here.
--
-- Idempotent.
CREATE TABLE IF NOT EXISTS "NotificationSeen" (
    "id"        TEXT NOT NULL,
    "userId"    TEXT NOT NULL,
    "eventKey"  TEXT NOT NULL,
    "seenAt"    TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT "NotificationSeen_pkey" PRIMARY KEY ("id")
);

-- One row per user+event: the unique index is what makes marking as seen
-- idempotent under concurrent page loads.
CREATE UNIQUE INDEX IF NOT EXISTS "NotificationSeen_userId_eventKey_key"
    ON "NotificationSeen"("userId", "eventKey");

CREATE INDEX IF NOT EXISTS "NotificationSeen_userId_idx"
    ON "NotificationSeen"("userId");

DO $$ BEGIN
  ALTER TABLE "NotificationSeen" DROP CONSTRAINT IF EXISTS "NotificationSeen_userId_fkey";
  -- CASCADE: deleting a client must take their read markers with them.
  ALTER TABLE "NotificationSeen" ADD CONSTRAINT "NotificationSeen_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
END $$;
