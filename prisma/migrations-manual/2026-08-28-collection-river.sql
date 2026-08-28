-- The Collection's river: the six buckets, one sortable time key, and a
-- search that stays fast at twenty thousand photographs.
--
-- docs/planning/collection-rework/spec.md sec. 6, 7.1 and 10.
--
-- Idempotent, per CLAUDE.md: never `prisma db push` against this database.
-- Apply: node scripts/dev/run-sql.mjs prisma/migrations-manual/2026-08-28-collection-river.sql
--   and: node scripts/dev/run-sql.mjs --env .env.demo prisma/migrations-manual/2026-08-28-collection-river.sql
--
-- Every statement here is ADDITIVE or a value rewrite. Nothing is renamed and
-- no column is dropped, deliberately: one Supabase database serves production
-- and local dev, so anything the deployed build still reads has to keep
-- working until the deploy that stops reading it has landed.

-- ------------------------------------------------------------------
-- 1. The taxonomy, remapped.
--
-- `Photo.subject` used to hold fourteen values drawn up under the old
-- "the place, not people" frame, which had nowhere to file a class
-- photograph. Six buckets replace them (src/lib/collection.ts). The column
-- keeps its name; only the vocabulary changed.
--
-- The app does this same mapping on read (`bucketsOf`), so this statement
-- is a tidy-up rather than a load-bearing step -- which is what makes it
-- safe to run against a live database while the old build is still up.
-- ------------------------------------------------------------------

UPDATE "Photo" SET "subject" = sub.mapped
FROM (
  SELECT
    p.id,
    -- Comma-joined, de-duplicated, order preserved: four of the old values
    -- collapse onto Nature, so "hills,flora" must not become "nature,nature".
    (
      SELECT string_agg(DISTINCT m.bucket, ',')
      FROM unnest(string_to_array(p."subject", ',')) AS old(value)
      CROSS JOIN LATERAL (
        SELECT CASE btrim(old.value)
          WHEN 'birds'            THEN 'birds'
          WHEN 'wildlife'         THEN 'nature'
          WHEN 'landscape'        THEN 'nature'
          WHEN 'flora'            THEN 'nature'
          WHEN 'weather-sky'      THEN 'nature'
          WHEN 'hills'            THEN 'nature'
          WHEN 'rishi-konda'      THEN 'nature'
          WHEN 'campus'           THEN 'campus'
          WHEN 'buildings'        THEN 'campus'
          WHEN 'banyan'           THEN 'campus'
          WHEN 'assembly-dining'  THEN 'school-life'
          WHEN 'arts-music'       THEN 'school-life'
          WHEN 'sport-outdoors'   THEN 'school-life'
          WHEN 'historical'       THEN 'other'
          -- Already one of the six, or something nobody has seen: Other is
          -- the sensor, so an unrecognised value lands there rather than
          -- vanishing out of every bucket.
          WHEN 'people'           THEN 'people'
          WHEN 'nature'           THEN 'nature'
          WHEN 'school-life'      THEN 'school-life'
          WHEN 'other'            THEN 'other'
          ELSE 'other'
        END AS bucket
      ) AS m
      WHERE btrim(old.value) <> ''
    ) AS mapped
  FROM "Photo" p
  WHERE coalesce(p."subject", '') <> ''
) AS sub
WHERE "Photo".id = sub.id
  AND coalesce(sub.mapped, '') <> ''
  AND "Photo"."subject" IS DISTINCT FROM sub.mapped;

-- ------------------------------------------------------------------
-- 2. One integer that says when the photograph was taken.
--
-- The archive's real spine is when a photograph was TAKEN, and that fact
-- lives across three columns at three precisions: an exact year with an
-- optional month, or only the decade the contributor was willing to commit
-- to. Nothing can be ordered by three columns of differing precision, so
-- this collapses them into one sortable integer:
--
--     takenKey = year * 100 + month      1978 March  -> 197803
--                                        1978        -> 197800
--                                        "the 1970s" -> 197000
--                                        no date     ->      0
--
-- Zero rather than NULL, so undated photographs sort last under DESC with
-- no NULLS-LAST clause anywhere and, more importantly, so the keyset cursor
-- in loadPhotos is a plain two-column comparison instead of a three-branch
-- OR with a null case in it. Undated is a real answer here, not a missing one.
--
-- GENERATED ALWAYS: it is derived, so it cannot drift from the columns it is
-- derived from, and nothing in the app may write it. Prisma only sends the
-- fields you hand it, and no write path hands it this one.
--
-- The decade years below are the SAME mapping as ERA_START_YEAR in
-- src/lib/collection.ts. If one changes so must the other; a test says so.
-- pre-1960s takes 1926, the year the school was founded, rather than a
-- sentinel -- so a photograph that later gets an exact 1931 lands beside the
-- ones that could only say "before 1960".
-- ------------------------------------------------------------------

ALTER TABLE "Photo" ADD COLUMN IF NOT EXISTS "takenKey" INTEGER
  GENERATED ALWAYS AS (
    (
      COALESCE(
        "photoYear",
        CASE "era"
          WHEN 'pre-1960s' THEN 1926
          WHEN '1960s'     THEN 1960
          WHEN '1970s'     THEN 1970
          WHEN '1980s'     THEN 1980
          WHEN '1990s'     THEN 1990
          WHEN '2000s'     THEN 2000
          WHEN '2010s'     THEN 2010
          WHEN '2020s'     THEN 2020
          ELSE NULL
        END,
        0
      ) * 100
    ) + COALESCE("photoMonth", 0)
  ) STORED;

-- The river in time order, and its cursor. `id` is in the index because it is
-- the tiebreak that makes the ordering total: without it two photographs of
-- the same month have no defined order, and a keyset page can then repeat one
-- row and skip another (the same class of bug audit B-122 found on "most
-- loved").
CREATE INDEX IF NOT EXISTS "Photo_river_taken_idx"
  ON "Photo" ("approved", "isHidden", "takenKey" DESC, "id" DESC);

-- The river in added order, cursored the same way. The existing
-- (approved,isHidden,createdAt) index stops one column short of the tiebreak.
CREATE INDEX IF NOT EXISTS "Photo_river_added_idx"
  ON "Photo" ("approved", "isHidden", "createdAt" DESC, "id" DESC);

-- The decade rail counts every decade in one grouped query on every page load.
CREATE INDEX IF NOT EXISTS "Photo_river_era_idx"
  ON "Photo" ("approved", "isHidden", "era");

-- ------------------------------------------------------------------
-- 3. Search that survives the archive growing.
--
-- Everything a contributor writes in prose is searchable and none of it is
-- ever offered as a dropdown (spec sec. 7.2 -- the one absolute rule in this
-- area, and the bug in the filter being replaced). That means the search is
-- an unanchored ILIKE '%term%' across three text columns, which no B-tree
-- index can serve: a leading wildcard is exactly what a B-tree cannot do.
--
-- Trigram GIN indexes can. Postgres breaks each string into three-character
-- shingles and indexes those, so '%banyan%' becomes a lookup rather than a
-- scan of every row. Three indexes and a BitmapOr, which is what the query
-- already asks for.
--
-- This is a departure from spec sec. 10, which proposed a tsvector column and
-- full-text search. Trigram is the better fit and the reason is the copy:
-- full-text search stems and tokenises, so it answers "banyan" and not "bany"
-- -- and someone half-remembering a caption types the fragment. It also needs
-- no new column, no trigger, and no change to a single line of the query.
-- pg_trgm is already installed in this database, in the `extensions` schema.
-- ------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS "Photo_caption_trgm_idx"
  ON "Photo" USING gin ("caption" extensions.gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "Photo_area_trgm_idx"
  ON "Photo" USING gin ("area" extensions.gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "Photo_freeTags_trgm_idx"
  ON "Photo" USING gin ("freeTags" extensions.gin_trgm_ops);

-- The contributor's name is searched too (spec sec. 7.2), and that lives on
-- the other side of a join, so it is a relation filter rather than a column
-- here. Same shape of index, on the column it actually reads.
CREATE INDEX IF NOT EXISTS "User_name_trgm_idx"
  ON "User" USING gin ("name" extensions.gin_trgm_ops);
