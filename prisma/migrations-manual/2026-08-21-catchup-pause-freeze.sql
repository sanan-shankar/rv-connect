-- Pausing a Catch-up freezes its live Round, and resuming hands the time back.
--
-- Before this, pause/end wrote only CatchupSeries.status: the in-flight Round
-- kept advancing on the clock, kept firing a DAILY reminder to every
-- non-answerer for the whole 7-day window, and published itself -- all while
-- the home page replaced the console with "This Catch-up is paused" and no
-- Answer button, so nobody could actually answer the questions they were being
-- nudged about (bug audit B-061). The spec's paused state is "a calm banner and,
-- for the Keeper, Resume" (docs/spec/catchups.md:250), which only makes sense if
-- the clock stops with it.
--
-- Freezing alone would be unfair: pause with two days left in the answer window
-- and resume a month later, and the window is simply gone. So the moment the
-- freeze begins is recorded here, and resumeCatchup shifts every unreached
-- deadline of the live Round forward by exactly the paused duration. The group
-- gets back the time it had, not a fresh window and not nothing.
--
-- Nullable with no backfill on purpose: NULL means "not paused", which is true
-- of every existing row including the ones already sitting at status='paused'
-- (they were paused under the old semantics, where nothing froze, so there is no
-- honest duration to credit them -- their deadlines already ran out in real
-- time). Those rows resume with no shift, which is exactly what happened to
-- them anyway.
--
-- Idempotent, per CLAUDE.md: never `prisma db push` against this database.
-- Apply: node scripts/dev/run-sql.mjs prisma/migrations-manual/2026-08-21-catchup-pause-freeze.sql

ALTER TABLE "CatchupSeries" ADD COLUMN IF NOT EXISTS "pausedAt" TIMESTAMP(3);

DO $$
DECLARE missing int;
BEGIN
  SELECT count(*) INTO missing
    FROM information_schema.columns
   WHERE table_name = 'CatchupSeries' AND column_name = 'pausedAt';
  IF missing <> 1 THEN
    RAISE EXCEPTION 'CatchupSeries."pausedAt" was not created; refusing to report success.';
  END IF;
END $$;
