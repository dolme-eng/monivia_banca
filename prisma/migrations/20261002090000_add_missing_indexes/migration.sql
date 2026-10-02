-- Index present in prisma/schema.prisma but never actually created in the
-- database (it was built by hand in the Supabase SQL editor, and these two
-- were only ever declared in the schema file).
--
-- `prisma migrate diff` flagged them as missing. Both are pure performance
-- objects: CREATE INDEX takes no lock that blocks reads or writes on Postgres,
-- and the tables hold 13 and 48 rows, so this is instant.
--
-- Transaction(accountId, status) backs the pending-approvals query, which
-- filters on both columns on every dashboard poll.

-- Idempotent so a re-run is harmless.
CREATE INDEX IF NOT EXISTS "RateLimitEntry_resetAt_idx" ON "RateLimitEntry"("resetAt");
CREATE INDEX IF NOT EXISTS "Transaction_accountId_status_idx" ON "Transaction"("accountId", "status");
