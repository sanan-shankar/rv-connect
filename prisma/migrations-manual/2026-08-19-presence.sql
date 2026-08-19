-- Presence and sessions.
--
-- The owner asked for this directly: who is online right now, where they are,
-- what device and what page, and how long the average session is. The purpose
-- is finding where older alumni get stuck; it is disclosed in the policies.
--
-- A table rather than more columns on User, because a column can only hold the
-- LAST value. Session length, pages per visit and return frequency are all
-- questions about a span of time, and a span needs a row.
--
-- Idempotent, per CLAUDE.md: never `prisma db push` against this database.
-- Apply: node scripts/dev/run-sql.mjs prisma/migrations-manual/2026-08-19-presence.sql

CREATE TABLE IF NOT EXISTS "Visit" (
  "id"        TEXT         NOT NULL,
  "userId"    TEXT         NOT NULL,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "endedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "views"     INTEGER      NOT NULL DEFAULT 1,
  "lastPath"  TEXT,
  "device"    TEXT,
  "os"        TEXT,
  "browser"   TEXT,
  "country"   TEXT,
  "city"      TEXT,
  CONSTRAINT "Visit_pkey" PRIMARY KEY ("id")
);

-- Cascade: a member who deletes their account takes their presence history
-- with them, exactly as they take their posts and photos.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Visit_userId_fkey') THEN
    ALTER TABLE "Visit"
      ADD CONSTRAINT "Visit_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- "Who is online right now", and recent visits across everyone.
CREATE INDEX IF NOT EXISTS "Visit_endedAt_idx" ON "Visit" ("endedAt");
-- One person's history, and the lookup deciding extend-or-open on every view.
CREATE INDEX IF NOT EXISTS "Visit_userId_endedAt_idx" ON "Visit" ("userId", "endedAt");
