-- The analytics room's two storage needs. Both collect from the day they land
-- and neither can be backfilled, which is why they go in before the page that
-- reads them rather than after.
--
-- 1. User.lastSeenAt -- "who is still using this", the one question
--    src/app/(main)/admin/analytics/page.tsx recorded as unanswerable. There is
--    no history to recover: every day without this column is a day of activity
--    that is simply gone.
--
-- 2. MetricSnapshot -- a daily row per metric per source. Sentry's free plan
--    drops errors after 30 days and Vercel Analytics keeps 30; none of them will
--    say in 2028 what the site looked like in 2026. This table outlives every
--    free tier it collects from.
--
-- Idempotent, per CLAUDE.md: never `prisma db push` against this database.
-- Apply with: node scripts/dev/run-sql.mjs prisma/migrations-manual/2026-08-19-analytics.sql

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lastSeenAt" TIMESTAMP(3);

-- Partial index: the only read is "who was here recently", which never wants
-- the rows that have never been seen at all.
CREATE INDEX IF NOT EXISTS "User_lastSeenAt_idx"
  ON "User" ("lastSeenAt") WHERE "lastSeenAt" IS NOT NULL;

CREATE TABLE IF NOT EXISTS "MetricSnapshot" (
  "id"         TEXT         NOT NULL,
  "day"        DATE         NOT NULL,
  "source"     TEXT         NOT NULL,
  "metric"     TEXT         NOT NULL,
  "value"      DOUBLE PRECISION NOT NULL,
  "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MetricSnapshot_pkey" PRIMARY KEY ("id")
);

-- The idempotency key. A second run on the same day must overwrite, never
-- append, or every chart doubles whenever the job is retried.
CREATE UNIQUE INDEX IF NOT EXISTS "MetricSnapshot_day_source_metric_key"
  ON "MetricSnapshot" ("day", "source", "metric");

-- The room's read: one metric's line over time.
CREATE INDEX IF NOT EXISTS "MetricSnapshot_source_metric_day_idx"
  ON "MetricSnapshot" ("source", "metric", "day");
