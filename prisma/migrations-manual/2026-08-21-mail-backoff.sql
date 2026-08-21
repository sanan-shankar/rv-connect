-- A bad minute at Resend must not permanently fail queued mail.
--
-- A requeued row kept its original createdAt, so it stayed the oldest eligible
-- row and the very next iteration of the SAME drain pass picked it up again:
-- four attempts inside about four seconds, then status 'failed', which nothing
-- retries. A thirty-second brownout -- most likely at launch, when hundreds of
-- confirmations go out at once -- converted the entire backlog, password
-- resets included, into mail that would never arrive (bug audit B-002).
--
--   nextAttemptAt  when the drain may pick the row up again; null means now.
--   deferrals      provider-caused failures, counted apart from `attempts`
--                  because a 429 says nothing about the address.
--
-- Plus QueueLease, so overlapping drain passes take turns instead of fanning
-- out past the provider's rate limit (B-072). A lease row rather than a pg
-- advisory lock: advisory locks are session-scoped and this app talks to
-- Postgres through the pgbouncer transaction pooler.
--
-- Idempotent, per CLAUDE.md: never `prisma db push` against this database.
-- Apply: node scripts/dev/run-sql.mjs prisma/migrations-manual/2026-08-21-mail-backoff.sql

ALTER TABLE "OutboundEmail" ADD COLUMN IF NOT EXISTS "nextAttemptAt" TIMESTAMP(3);
ALTER TABLE "OutboundEmail" ADD COLUMN IF NOT EXISTS "deferrals" INTEGER NOT NULL DEFAULT 0;

-- The drain read: the next DUE thing to send.
CREATE INDEX IF NOT EXISTS "OutboundEmail_status_nextAttemptAt_priority_createdAt_idx"
  ON "OutboundEmail" ("status", "nextAttemptAt", "priority", "createdAt");

-- The old three-column form is now a strict prefix of nothing the drain asks
-- for; dropping it keeps the write cost of this hot table honest.
DROP INDEX IF EXISTS "OutboundEmail_status_priority_createdAt_idx";

CREATE TABLE IF NOT EXISTS "QueueLease" (
  "name"      TEXT         NOT NULL,
  "holder"    TEXT         NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "QueueLease_pkey" PRIMARY KEY ("name")
);

ALTER TABLE "QueueLease" ENABLE ROW LEVEL SECURITY;
