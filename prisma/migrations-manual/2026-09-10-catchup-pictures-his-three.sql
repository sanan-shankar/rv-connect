-- His first three photographs replace the six stand-ins on every Catch-up
-- that was carrying one.
--
-- His, 2026-09-10: "use them for the default catch up header photos in all
-- the places it should be", and of the stand-ins, "I don't wanna see any of
-- those." The pool itself is one edit (src/lib/catchup-pictures.ts); this is
-- the half an edit cannot reach, because every existing row stores its
-- picture's path and six of them still point at a retired one.
--
-- WHEN TO APPLY THIS: AFTER the commit that adds public/images/catchups/ has
-- DEPLOYED, not before -- the opposite of an additive column. One Supabase
-- project serves production and local dev, and until the deploy lands the
-- running build has no /images/catchups/ at all, so moving a row early is a
-- broken header on production for however long the gap is. The other order
-- is safe: the stand-in files stay in public/images/collection/ (the demo's
-- Collection uses them), so a row still on one keeps drawing until this runs.
--
-- APPLY TO BOTH PROJECTS:
--   node scripts/dev/run-sql.mjs prisma/migrations-manual/2026-09-10-catchup-pictures-his-three.sql
--   node scripts/dev/run-sql.mjs --env .env.demo prisma/migrations-manual/2026-09-10-catchup-pictures-his-three.sql
--
-- Counted before it was written, 2026-09-10: seven Catch-ups on production,
-- six on a stand-in and one on an upload, which is left alone; none on the
-- demo, where this only moves the column default.
--
-- Idempotent, and safe to re-run after the pool grows: it selects rows by the
-- six RETIRED paths, named below, and never by "not in the pool", so a row on
-- a photograph added later can never be pulled back onto these three.

BEGIN;

-- The column default is the pool's first entry, pinned by
-- catchup-pictures.test.mjs. Nothing takes it (every creation path writes
-- the value); it is the backstop that keeps a NOT NULL column safe.
ALTER TABLE "CatchupSeries"
  ALTER COLUMN "pictureSrc" SET DEFAULT '/images/catchups/shaded-path.webp';

-- The three, with the focus each is aimed at. Every row here must be in
-- CATCHUP_PICTURES with the same focus; catchup-pictures.test.mjs checks it.
CREATE TEMP TABLE pool ON COMMIT DROP AS
  SELECT * FROM (VALUES
    (1, '/images/catchups/shaded-path.webp',   'center 66%'),
    (2, '/images/catchups/stone-benches.webp', 'center 68%'),
    (3, '/images/catchups/boulder-hill.webp',  'center 48%')
  ) AS t(n, src, focus);

-- The same rule `pictureAvoiding` applies to a new Catch-up, in SQL: each
-- row gets the photograph its members already see least on their OTHER
-- Catch-ups, counted as (member, Catch-up) pairs, so nobody gets a repeat
-- while a picture they do not have is still free. Ties go round the pool
-- from a hash of the id, masked positive before the modulo because
-- `hashtext` is a signed int4 and Postgres's `%` keeps the dividend's sign.
--
-- ONE ROW AT A TIME, oldest first, because the rule is greedy: each pick has
-- to see the ones before it. A row not yet moved is still on a stand-in and
-- counts against nothing, since no stand-in is in `pool`.
--
-- `updatedAt` is NOT touched. An ended Catch-up shows it as the day it ended
-- (catchups-core.ts), and this is not an edit anybody made.
DO $$
DECLARE
  c      record;
  size   int;
  start  int;
  k      int;
  held   bigint;
  best   int;
  fewest bigint;
BEGIN
  SELECT count(*) INTO size FROM pool;

  FOR c IN
    SELECT id, "groupId"
      FROM "CatchupSeries"
     WHERE "pictureSrc" IN (
             '/images/collection/demo-banyan-benches.webp',
             '/images/collection/demo-banyan-pillar.webp',
             '/images/collection/demo-banyan-canopy.webp',
             '/images/collection/demo-banyan-arch.webp',
             '/images/collection/demo-banyan-trunk.webp',
             '/images/collection/c3.webp')
     ORDER BY "createdAt", id
  LOOP
    start := (hashtext(c.id) & 2147483647) % size;
    best := NULL;

    FOR i IN 0 .. size - 1 LOOP
      k := ((start + i) % size) + 1;
      SELECT count(*) INTO held
        FROM "GroupMember" mine
        JOIN "GroupMember" theirs
          ON theirs."userId" = mine."userId"
         AND theirs."groupId" <> mine."groupId"
        JOIN "CatchupSeries" other ON other."groupId" = theirs."groupId"
        JOIN pool ON pool.src = other."pictureSrc"
       WHERE mine."groupId" = c."groupId"
         AND pool.n = k;
      IF best IS NULL OR held < fewest THEN
        best := k;
        fewest := held;
      END IF;
    END LOOP;

    UPDATE "CatchupSeries" s
       SET "pictureSrc" = pool.src,
           "pictureFocus" = pool.focus
      FROM pool
     WHERE s.id = c.id
       AND pool.n = best;
  END LOOP;
END $$;

COMMIT;
