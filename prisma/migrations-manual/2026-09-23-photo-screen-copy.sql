-- Photo.screenUrl: the copy the viewer opens instead of the full-resolution master.
--
-- Owner, 2026-09-23: "Every time I open a photo in the image viewer it takes so
-- long to open... I picked a random image not even that high res and it took
-- 41 seconds to open. it's just totally unusable now". The viewer fetched
-- `url`, the q100 master (median ~2MB, 7-11MB for a 24MP photograph), for a
-- screen that shows about 3,000 pixels across. The screen copy is that master
-- boxed to 3200px at WebP q82: 0.3-1.8MB on the same photographs.
--
-- NULL means "open `url`", which is exactly what every row did before this, so
-- the column is safe to add empty and fill later:
--   node scripts/dev/backfill-screen-copies.mjs            (dry run)
--   node scripts/dev/backfill-screen-copies.mjs --apply
--
-- WHEN TO APPLY: SAFE BEFORE THE DEPLOY. One nullable column nothing on the
-- running build selects. Purely additive.
--
-- IDEMPOTENT: ADD COLUMN IF NOT EXISTS.
--
-- APPLY TO BOTH PROJECTS: every Collection read selects the whole row, so a
-- build that knows the column fails against a database that does not.
--   node scripts/dev/run-sql.mjs prisma/migrations-manual/2026-09-23-photo-screen-copy.sql
--   node scripts/dev/run-sql.mjs --env .env.demo prisma/migrations-manual/2026-09-23-photo-screen-copy.sql

ALTER TABLE "Photo" ADD COLUMN IF NOT EXISTS "screenUrl" TEXT;

SELECT count(*) AS photos,
       count(*) FILTER (WHERE "screenUrl" IS NOT NULL) AS with_screen_copy
  FROM "Photo";
