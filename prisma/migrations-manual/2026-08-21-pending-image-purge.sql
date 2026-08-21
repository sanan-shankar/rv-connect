-- The worklist of R2 objects a purge still owes a delete.
--
-- purgeUserAccount cannot be atomic across two systems: the rows go first,
-- and the rows are the only thing that remembers where a member's images live.
-- Before this table one flaky R2 minute during a purge left the bytes publicly
-- fetchable forever with nothing able to enumerate them, while the audit line
-- claimed they had been removed (bug audit B-011, B-013).
--
-- Written inside the same transaction as the row delete, drained immediately
-- afterwards, and retried by the nightly retention sweep for whatever is left.
--
-- Idempotent, per CLAUDE.md: never `prisma db push` against this database.
-- Apply: node scripts/dev/run-sql.mjs prisma/migrations-manual/2026-08-21-pending-image-purge.sql

CREATE TABLE IF NOT EXISTS "PendingImagePurge" (
  "id"        TEXT         NOT NULL,
  "url"       TEXT         NOT NULL,
  "reason"    TEXT         NOT NULL DEFAULT 'purge',
  "attempts"  INTEGER      NOT NULL DEFAULT 0,
  "lastError" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PendingImagePurge_pkey" PRIMARY KEY ("id")
);

-- Oldest first, which is both how the drain reads it and how a human would
-- want a backlog listed.
CREATE INDEX IF NOT EXISTS "PendingImagePurge_createdAt_idx"
  ON "PendingImagePurge" ("createdAt");

-- Row-level security is on for every table in this database (see
-- 2026-08-20-enable-rls.sql). Nothing but the app's own service role ever
-- touches this table, and that role bypasses RLS, so enabling it with no
-- policy is the correct "deny everyone else" position.
ALTER TABLE "PendingImagePurge" ENABLE ROW LEVEL SECURITY;
