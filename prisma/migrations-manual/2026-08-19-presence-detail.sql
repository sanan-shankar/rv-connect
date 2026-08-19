-- Everything already on the request that Visit was throwing away, plus a
-- record of what people search for.
--
-- The owner asked for "the most common searches" in the session that
-- commissioned the analytics room, and nothing recorded them: the header pill
-- submits to /feed?q= and the directory filters in the browser, so every query
-- anyone had ever typed was discarded.
--
-- The Visit columns cost nothing to collect: referrer, language and the Vercel
-- geo headers are on every request whether we read them or not.
--
-- Idempotent, per CLAUDE.md: never `prisma db push` against this database.
-- Apply: node scripts/dev/run-sql.mjs prisma/migrations-manual/2026-08-19-presence-detail.sql

ALTER TABLE "Visit" ADD COLUMN IF NOT EXISTS "entryPath" TEXT;
ALTER TABLE "Visit" ADD COLUMN IF NOT EXISTS "referrer"  TEXT;
ALTER TABLE "Visit" ADD COLUMN IF NOT EXISTS "language"  TEXT;
ALTER TABLE "Visit" ADD COLUMN IF NOT EXISTS "region"    TEXT;
ALTER TABLE "Visit" ADD COLUMN IF NOT EXISTS "timezone"  TEXT;
ALTER TABLE "Visit" ADD COLUMN IF NOT EXISTS "lat"       DOUBLE PRECISION;
ALTER TABLE "Visit" ADD COLUMN IF NOT EXISTS "lng"       DOUBLE PRECISION;

CREATE TABLE IF NOT EXISTS "SearchLog" (
  "id"        TEXT         NOT NULL,
  "userId"    TEXT,
  "scope"     TEXT         NOT NULL,
  "query"     TEXT         NOT NULL,
  "results"   INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SearchLog_pkey" PRIMARY KEY ("id")
);

-- SetNull, not Cascade: what the community searched for is a fact about the
-- site, and it should survive one person deleting their account. The row loses
-- its owner and keeps its query.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'SearchLog_userId_fkey') THEN
    ALTER TABLE "SearchLog"
      ADD CONSTRAINT "SearchLog_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "SearchLog_scope_createdAt_idx" ON "SearchLog" ("scope", "createdAt");
CREATE INDEX IF NOT EXISTS "SearchLog_query_idx"           ON "SearchLog" ("query");
