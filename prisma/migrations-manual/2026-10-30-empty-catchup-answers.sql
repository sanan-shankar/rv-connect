-- =============================================================================
-- The blank Catch-up answers from before the withdrawal rule go (2026-10-30).
--
-- Bug audit 3, unit H3, row T2b-12; the owner's answer to Q28, 2026-10-29
-- ("deleting one blank answer from August that nobody can see" is authorised,
-- in a dated file, applied to production and the demo).
--
-- Clearing every field of an answer withdraws it (audit Low 36): `submitEntry`
-- deletes the row once nothing is left in it. One row predates that rule. It
-- sits in a published Edition with nothing in it, which the reader never
-- draws, and the Catch-ups export counted it as an answer. Counted on
-- production when this was written: 1 of 194 answers, created 2026-08-08, last
-- changed 2026-08-14, in an Edition published 2026-08-15; no comment under it,
-- and one heart, given while empty answers were still drawn, which goes with
-- it by the relation's cascade. The demo held no answers at all.
--
-- WHAT IT DELETES, and only that: an answer with every content column null,
-- and no comment under it (a comment is somebody's words). The content columns
-- are named as the table has them when this runs, because the song columns and
-- `pollOptionId` are waiting to be dropped (2026-10-09 and 2026-10-11 files):
-- before those land the predicate covers them, after them it covers what is
-- left, so a second run, on either side of the drops, deletes nothing new and
-- never fails on a missing column.
--
-- It refuses, rolling everything back, if more than five rows match: one is
-- expected, and a larger number is a fault somebody should look at first.
--
-- Idempotent, safe to run twice. `lock_timeout`: five seconds for the rows'
-- locks, then fail and roll back rather than queue behind a long transaction.
-- SET LOCAL is a statement inside the transaction, not the startup parameter
-- Supavisor drops (docs/TRAPS.md).
--
-- Apply to BOTH databases (docs/TRAPS.md: the demo drifts):
--   node scripts/dev/run-sql.mjs prisma/migrations-manual/2026-10-30-empty-catchup-answers.sql
--   node scripts/dev/run-sql.mjs --env .env.demo prisma/migrations-manual/2026-10-30-empty-catchup-answers.sql
-- Read back on each:
--   SELECT count(*) FROM "CatchupEntry"
--    WHERE body IS NULL AND images IS NULL AND "audioUrl" IS NULL;   -- 0
-- =============================================================================

BEGIN;

SET LOCAL lock_timeout = '5s';

DO $$
DECLARE
  empty_test text;
  matched integer;
BEGIN
  SELECT string_agg(format('e.%I IS NULL', column_name), ' AND ' ORDER BY column_name)
    INTO empty_test
    FROM information_schema.columns
   WHERE table_schema = 'public'
     AND table_name = 'CatchupEntry'
     AND column_name IN ('body', 'images', 'audioUrl', 'songUrl', 'songTitle', 'songArt', 'pollOptionId');

  -- The three columns an answer is written in today must all be there, or the
  -- test above would be narrower than it reads.
  IF empty_test NOT LIKE '%"audioUrl" IS NULL%' OR empty_test NOT LIKE '%e.body IS NULL%' OR empty_test NOT LIKE '%e.images IS NULL%' THEN
    RAISE EXCEPTION 'CatchupEntry is missing a content column (%); nothing deleted', empty_test;
  END IF;

  EXECUTE format(
    'SELECT count(*) FROM "CatchupEntry" e WHERE %s AND NOT EXISTS (SELECT 1 FROM "Comment" c WHERE c."entryId" = e.id)',
    empty_test
  ) INTO matched;

  IF matched > 5 THEN
    RAISE EXCEPTION '% blank answers match, more than the one expected; nothing deleted', matched;
  END IF;

  EXECUTE format(
    'DELETE FROM "CatchupEntry" e WHERE %s AND NOT EXISTS (SELECT 1 FROM "Comment" c WHERE c."entryId" = e.id)',
    empty_test
  );
  RAISE NOTICE 'blank answers deleted: %', matched;
END
$$;

COMMIT;
