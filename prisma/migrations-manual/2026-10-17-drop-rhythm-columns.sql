-- The rhythm and the hold, dropped: `cadence`, `nextOpensAt`, `pausedAt`, and
-- the index that served the clock's "is anything due to open" read.
--
-- Out of schema.prisma and every reader since 2026-10-17
-- (docs/planning/catchups-rework/editions-on-demand.md). Prisma tolerates
-- columns it does not know, so they could stay; they go so nobody reading the
-- table believes a Catch-up still has a rhythm or a hold.
--
-- NOT APPLIED. Two conditions, both checked below rather than trusted:
--   - the code that stopped reading them has deployed, because one database
--     serves production and local dev and a column dropped under a running
--     build that still selects it breaks that build;
--   - 2026-10-17-editions-start-by-hand.sql has run, so no row is still
--     paused or booked when the columns that said so disappear.
--   node scripts/dev/run-sql.mjs prisma/migrations-manual/2026-10-17-drop-rhythm-columns.sql
-- Then the demo, with `--env .env.demo`.

DO $$
DECLARE
  unsettled int;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_name = 'CatchupSeries' AND column_name IN ('cadence', 'nextOpensAt', 'pausedAt')
  ) THEN
    RAISE NOTICE 'The rhythm columns are already gone. Nothing to do.';
    RETURN;
  END IF;

  SELECT count(*) INTO unsettled FROM "CatchupSeries"
   WHERE status = 'paused' OR "nextOpensAt" IS NOT NULL;
  IF unsettled > 0 THEN
    RAISE EXCEPTION '% Catch-up(s) still paused or booked. Run 2026-10-17-editions-start-by-hand.sql first.', unsettled;
  END IF;

  DROP INDEX IF EXISTS "CatchupSeries_status_nextOpensAt_idx";
  ALTER TABLE "CatchupSeries"
    DROP COLUMN IF EXISTS "cadence",
    DROP COLUMN IF EXISTS "nextOpensAt",
    DROP COLUMN IF EXISTS "pausedAt";
  RAISE NOTICE 'Dropped cadence, nextOpensAt, pausedAt and their index.';
END $$;
