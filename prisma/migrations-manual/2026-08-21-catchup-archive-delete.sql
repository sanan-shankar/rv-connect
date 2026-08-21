-- A member can file a Catch-up away, or throw their own copy of it away.
--
-- Until now the only way out of a Catch-up was to ask a Keeper to remove you:
-- createCatchupWithPeople and addCatchupMembers enrol up to 100 people without
-- anyone accepting anything, and the reminder pref silences only the daily
-- nudge -- questions-open, answers-open and published went to every member,
-- every cycle, forever (bug audit B-063).
--
-- The owner's decision, 2026-08-21: both of these are PERSONAL. Archiving and
-- deleting change only the acting member's own view. Nobody else's Catch-up
-- moves, and a leaver's published answers stay in the Rounds they were
-- published in, because a published Round is a keepsake the whole group has
-- read. The Keeper-only variant that would soft-delete the shared Catch-up for
-- everyone was offered and declined.
--
-- Two nullable columns on the row that already exists for exactly this pair:
-- CatchupReminderPref is unique on (catchupId, userId) and cascades from both
-- Catchup and User, so one member's state cannot leak into another's by
-- construction, and neither column needs a backfill -- NULL means "not filed"
-- and "not deleted", which is true of every row written before today.
--
-- The index is for the nightly retention sweep, whose whole query is "which
-- deleted copies are more than 30 days old". Without it that is a sequential
-- scan of the table every night forever.
--
-- Idempotent, per CLAUDE.md: never `prisma db push` against this database.
-- Apply: node scripts/dev/run-sql.mjs prisma/migrations-manual/2026-08-21-catchup-archive-delete.sql

ALTER TABLE "CatchupReminderPref" ADD COLUMN IF NOT EXISTS "archivedAt" TIMESTAMP(3);
ALTER TABLE "CatchupReminderPref" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "CatchupReminderPref_deletedAt_idx"
  ON "CatchupReminderPref" ("deletedAt");

DO $$
DECLARE cols int; idx int;
BEGIN
  SELECT count(*) INTO cols
    FROM information_schema.columns
   WHERE table_name = 'CatchupReminderPref'
     AND column_name IN ('archivedAt', 'deletedAt');
  IF cols <> 2 THEN
    RAISE EXCEPTION 'CatchupReminderPref archivedAt/deletedAt missing (found %); refusing to report success.', cols;
  END IF;

  SELECT count(*) INTO idx
    FROM pg_indexes
   WHERE tablename = 'CatchupReminderPref'
     AND indexname = 'CatchupReminderPref_deletedAt_idx';
  IF idx <> 1 THEN
    RAISE EXCEPTION 'CatchupReminderPref_deletedAt_idx was not created; refusing to report success.';
  END IF;
END $$;
