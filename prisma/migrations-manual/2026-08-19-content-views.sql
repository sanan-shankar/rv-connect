-- Who looks at what, and how often.
--
-- Answers the owner's curiosity ("who searches for whose profile, how often")
-- and the product question ("read click-through rates") with one table.
--
-- A COUNTER, not a log. A row per view is unbounded -- 2,000 members at twenty
-- views a day is 14M rows a year, gigabytes on a 500MB plan. Keyed on
-- (viewer, kind, target) it is bounded by distinct pairs instead: a member
-- might look at fifty profiles ever, so 2,000 members is ~100k rows total.
--
-- Idempotent, per CLAUDE.md: never `prisma db push` against this database.
-- Apply: node scripts/dev/run-sql.mjs prisma/migrations-manual/2026-08-19-content-views.sql

CREATE TABLE IF NOT EXISTS "ContentView" (
  "id"       TEXT         NOT NULL,
  "viewerId" TEXT         NOT NULL,
  "kind"     TEXT         NOT NULL,
  "targetId" TEXT         NOT NULL,
  "count"    INTEGER      NOT NULL DEFAULT 1,
  "firstAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ContentView_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ContentView_viewerId_fkey') THEN
    ALTER TABLE "ContentView"
      ADD CONSTRAINT "ContentView_viewerId_fkey"
      FOREIGN KEY ("viewerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "ContentView_viewerId_kind_targetId_key"
  ON "ContentView" ("viewerId", "kind", "targetId");
CREATE INDEX IF NOT EXISTS "ContentView_kind_targetId_idx" ON "ContentView" ("kind", "targetId");
CREATE INDEX IF NOT EXISTS "ContentView_viewerId_lastAt_idx" ON "ContentView" ("viewerId", "lastAt");
