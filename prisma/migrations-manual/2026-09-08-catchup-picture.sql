-- Every Catch-up gets a photograph (spec 3.4, drawn in architecture 1b), and
-- it is never optional. His diagnosis, review-2026-09-07 N19: "Catch-ups is
-- the only one that has like nothing, no images, no media. It's just all text
-- and organization and very functional and very corporate." And his reason for
-- it being compulsory rather than an upload people may or may not do, N23:
-- "then we'd have to have 2 different architectures."
--
-- TWO COLUMNS, NOT A TABLE. `pictureSrc` is a path into the shipped pool or an
-- https url on our own image host -- one column, because the two are the same
-- thing to every reader of it -- and `pictureFocus` is the `object-position`
-- its crop is taken at. The pool is src/lib/catchup-pictures.ts.
--
-- WHEN TO APPLY THIS: before the commit is pushed, like any additive change,
-- and the DEFAULT on `pictureSrc` is what makes that safe in both directions.
-- One Supabase project serves production and local dev, so a NOT NULL column
-- with no default breaks the RUNNING build's `catchup.create` the second it
-- lands, and applying it after the deploy breaks the NEW build instead, which
-- writes a column that would not yet exist. With a default, either ordering
-- works and nothing has to be timed. Nothing is dropped here; there is nothing
-- to drop.
--
-- APPLY TO BOTH PROJECTS:
--   node scripts/dev/run-sql.mjs prisma/migrations-manual/2026-09-08-catchup-picture.sql
--   node scripts/dev/run-sql.mjs --env .env.demo prisma/migrations-manual/2026-09-08-catchup-picture.sql
--
-- Idempotent: the ADDs are IF NOT EXISTS, the backfill is scoped to rows that
-- have no picture yet, and SET NOT NULL on an already-NOT NULL column is a
-- no-op. Counted before this was written, 2026-09-08: 6 Catch-ups on
-- production, and the demo project seeds its one from src/lib/demo-seed.

ALTER TABLE "CatchupSeries" ADD COLUMN IF NOT EXISTS "pictureSrc" text;
ALTER TABLE "CatchupSeries"
  ALTER COLUMN "pictureSrc" SET DEFAULT '/images/catchups/shaded-path.webp';

ALTER TABLE "CatchupSeries"
  ADD COLUMN IF NOT EXISTS "pictureFocus" text NOT NULL DEFAULT 'center 85%';

-- The backfill. Deterministic, so a re-run assigns the same photograph to the
-- same Catch-up and the app does not shuffle under anybody: `hashtext` is
-- stable for a given string in a given Postgres major version, and the id is
-- the one thing about a Catch-up that never changes. Masked to positive before
-- the modulo, because hashtext returns a signed int4 and Postgres's `%` keeps
-- the sign of the dividend -- an unmasked negative would index off the front of
-- the array and leave the row NULL, which the SET NOT NULL below would then
-- refuse.
--
-- The FOCUS is backfilled from the same pick rather than left on the column
-- default: three of the six pool photographs are aimed at 88, 90 and 92 per
-- cent rather than 85, and taking the picture without its aim is what produces
-- a band of green canopy where a horizon should be.
--
-- Every row of this list must be in CATCHUP_PICTURES with the same focus, and
-- catchup-pictures.test.mjs fails if one leaves the pool. It was the whole
-- pool of six stand-ins until 2026-09-10, when his first three replaced them;
-- the rows it backfilled were moved by 2026-09-10-catchup-pictures-his-three.sql,
-- not by editing this.
WITH pool AS (
  SELECT * FROM (VALUES
    (1, '/images/catchups/shaded-path.webp',   'center 66%'),
    (2, '/images/catchups/stone-benches.webp', 'center 68%'),
    (3, '/images/catchups/boulder-hill.webp',  'center 48%')
  ) AS t(n, src, focus)
)
UPDATE "CatchupSeries" c
   SET "pictureSrc" = pool.src,
       "pictureFocus" = pool.focus
  FROM pool
 WHERE c."pictureSrc" IS NULL
   AND pool.n = ((hashtext(c.id) & 2147483647) % (SELECT count(*) FROM pool)) + 1;

ALTER TABLE "CatchupSeries" ALTER COLUMN "pictureSrc" SET NOT NULL;
