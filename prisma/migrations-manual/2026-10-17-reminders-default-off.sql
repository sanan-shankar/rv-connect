-- A member's Catch-up reminders are off unless they turn them on.
--
-- HIS ANSWER, 2026-10-17, to how many bells an Edition may ring for somebody
-- who is not taking part: "Only 'a round started' and 'it's published'. No
-- reminders unless you've turned them on yourself." The code reads a missing
-- pref row as off (`DEFAULT_REMINDER_MODE`) and writes "off" explicitly when it
-- makes a row for any other reason (archiving). This moves the column default
-- to match, so nothing that inserts a row without naming the mode -- a hand-run
-- fix, a future path -- quietly opts somebody into a daily reminder.
--
-- Existing rows are LEFT ALONE: 10 say daily and 4 say last day, and a row
-- with a mode in it is somebody's choice.
--
-- SAFE ON EITHER SIDE OF THE DEPLOY: the old code's archive path then makes
-- "off" rows, which only means a member who filed a Catch-up away is not
-- nudged about it. Idempotent.
--   node scripts/dev/run-sql.mjs prisma/migrations-manual/2026-10-17-reminders-default-off.sql
--   node scripts/dev/run-sql.mjs --env .env.demo prisma/migrations-manual/2026-10-17-reminders-default-off.sql

ALTER TABLE "CatchupReminderPref" ALTER COLUMN "reminderMode" SET DEFAULT 'off';

SELECT column_default FROM information_schema.columns
 WHERE table_name = 'CatchupReminderPref' AND column_name = 'reminderMode';
