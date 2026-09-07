-- Retire the Collection's two legacy tagging columns: "Photo"."area" and
-- "Photo"."freeTags".
--
-- Refactor audit 2, row D5 (`collection-08`), which closes audit 1 §4 #16.
-- The owner's answer to Q18, 2026-09-07: "delete all and stop writing info
-- except to [three named columns]". Neither of these is one of the three.
--
-- Idempotent, per CLAUDE.md: never `prisma db push` against this database.
--
-- *** DO NOT RUN THIS UNTIL THE CODE CHANGE IS DEPLOYED. ***
-- Running it LATE is free; running it EARLY is an outage. Prisma names every
-- column of a model in its SELECT list, so while any build that still knows
-- about "area"/"freeTags" is serving traffic, dropping them makes every
-- Collection query fail. The build that stopped naming them is the commit
-- this file ships in. Deploy first, then run this, then the demo.
--
-- Apply:
--   node scripts/dev/run-sql.mjs prisma/migrations-manual/2026-09-07-drop-collection-legacy-tags.sql
--   node scripts/dev/run-sql.mjs --env .env.demo prisma/migrations-manual/2026-09-07-drop-collection-legacy-tags.sql
-- Production and the demo are SEPARATE Supabase projects. Both, or the demo
-- drifts (docs/TRAPS.md).
--
-- THE EVIDENCE. Counted 2026-09-07, on both databases:
--
--   SELECT count(*) FILTER (WHERE area IS NOT NULL AND area <> '')     AS areas,
--          count(*) FILTER (WHERE "freeTags" IS NOT NULL
--                             AND "freeTags" <> '')                    AS tags,
--          count(*)                                                    AS total
--     FROM "Photo";
--
--   production -> areas 0, tags 0, total 1749
--   demo       -> areas 0, tags 0, total 0
--
-- Nothing has written "freeTags" since the 2026-07-18 rework took the
-- bird/species field off the form; photoRowData wrote a literal NULL into it.
-- Nothing has written "area" since 2026-08-28, when the "Part of school" box
-- left the contribute form; the last two rows holding one were cleared by
-- prisma/migrations-manual/2026-08-28-clear-legacy-where.sql. Both columns are
-- nullable with no default, so no insert anywhere depends on them.
--
-- THE TWO TRIGRAM INDEXES GO WITH THE COLUMNS, automatically -- Postgres drops
-- an index when its only column is dropped. They are named here so that the
-- eleven-index census in prisma/schema.prisma's header and in docs/TRAPS.md
-- can be corrected to NINE the day this runs:
--
--   Photo_area_trgm_idx      GIN (area gin_trgm_ops)
--   Photo_freeTags_trgm_idx  GIN ("freeTags" gin_trgm_ops)
--
-- Both were created by 2026-08-28-collection-river.sql to serve the search's
-- ILIKE arms over these two columns. Those arms are gone; search now reads the
-- caption and the uploader's name, both of which keep their own indexes
-- (Photo_caption_trgm_idx, User_name_trgm_idx). Neither doomed index had been
-- scanned once: idx_scan = 0 for both on production, over a statistics window
-- open since 2026-05-22.

-- A guard, not a formality. If a row has picked up a value between this file
-- being written and being run, stop rather than delete it silently.
DO $$
DECLARE n bigint;
BEGIN
  SELECT count(*) INTO n
    FROM "Photo"
   WHERE ("area" IS NOT NULL AND "area" <> '')
      OR ("freeTags" IS NOT NULL AND "freeTags" <> '');
  IF n > 0 THEN
    RAISE EXCEPTION 'Refusing to drop: % Photo row(s) still carry an area or a freeTags value', n;
  END IF;
EXCEPTION
  -- Second run: the columns are already gone, which is the success case.
  WHEN undefined_column THEN
    RAISE NOTICE 'area/freeTags already dropped; nothing to do.';
END $$;

ALTER TABLE "Photo" DROP COLUMN IF EXISTS "area";
ALTER TABLE "Photo" DROP COLUMN IF EXISTS "freeTags";

-- Belt and braces: named explicitly in case a future index on these columns
-- were ever created outside the column's own dependency chain.
DROP INDEX IF EXISTS "Photo_area_trgm_idx";
DROP INDEX IF EXISTS "Photo_freeTags_trgm_idx";
