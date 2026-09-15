-- Visit.paths: the pages one visit actually went through, in order.
--
-- Owner, 2026-09-15: "like 80% of the readings on on the site long and earlier
-- today are 0s ... it shows only one thing like feed or something even if they
-- go through multiple so I dont really get actionable insights".
--
-- Two causes, both measured on this table the same day. Views were counted
-- from (main) layout renders, which fire for Next's link PREFETCHES, so a
-- member sitting on the feed "visited" /support three times in seven seconds
-- and lastPath was whichever sidebar link was prefetched last. And a visit's
-- length only moved when a layout rendered, so one letter read for ten minutes
-- lasted 0s. Page views now come from the browser on a real navigation, with a
-- heartbeat while the member is active (src/app/api/presence/route.ts), and the
-- trail lands here so the room can show where people go, not one page.
--
-- Capped at 40 entries by the writer (TRAIL_MAX in src/lib/last-seen.ts);
-- consecutive repeats of one page are not appended. At 2,000 members that is
-- a few KB a day, inside the 90-day sweep that already bounds Visit.
--
-- A non-empty array is also how the analytics room tells a visit recorded by
-- the new tracker from the prefetch-inflated rows before it, so nothing old
-- needs deleting: the old rows simply age out of the 30-day windows.
--
-- WHEN TO APPLY: SAFE BEFORE THE DEPLOY. Purely additive with a default; the
-- running build never names the column.
--
-- IDEMPOTENT: ADD COLUMN IF NOT EXISTS.
--
-- APPLY TO BOTH PROJECTS, so the schemas do not drift:
--   node scripts/dev/run-sql.mjs prisma/migrations-manual/2026-09-15-visit-paths.sql
--   node scripts/dev/run-sql.mjs --env .env.demo prisma/migrations-manual/2026-09-15-visit-paths.sql

ALTER TABLE "Visit" ADD COLUMN IF NOT EXISTS "paths" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

SELECT count(*) AS visits, count(*) FILTER (WHERE cardinality("paths") > 0) AS with_trail
  FROM "Visit";
