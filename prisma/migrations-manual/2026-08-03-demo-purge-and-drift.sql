-- 2026-08-03: purge the demo groups, and close the last real schema drift.
-- Owner-authorised on 2026-08-03 ("delete the demo groups", and the standing
-- ask to unblock `prisma db push`).
--
-- Context: the six legacy Catch-ups tables that section 3 of
-- prisma/migrations-manual/2026-07-05-secondary-city.sql was written to drop (Catchup, CatchupPref,
-- CatchupAnswer, CatchupAnswerLove, CatchupIssue, CatchupQuestion) were
-- already gone when this ran; information_schema showed only the six live
-- ones (CatchupSeries, CatchupEdition, CatchupPrompt, CatchupEntry,
-- CatchupEntryLove, CatchupReminderPref). So nothing is dropped here.

-- 1. The [Demo] groups ---------------------------------------------------
-- Three rows: "[Demo] Answering", "[Demo] Catch-up", "[Demo] Collecting",
-- seeded by scripts/dev/seed-catchup.mjs. Group is invisible plumbing under
-- Catch-ups now, so this cascades through CatchupSeries -> CatchupEdition ->
-- CatchupPrompt / CatchupEntry (2 series, 2 editions, 7 prompts, 4 entries)
-- and through GroupMember (3 rows). No Post anywhere references them
-- (verified: posts = 0 on all three). The real Batch of * groups and
-- "Testing Newsletter" are deliberately untouched.
DELETE FROM "Group" WHERE name LIKE '[Demo]%';

-- 2. LabRoomState.updatedAt ----------------------------------------------
-- 2026-07-30-lab-archive.sql created this as timestamptz(6); Prisma's
-- DateTime is timestamp(3), so `migrate diff` reported it as drift forever.
-- Converting AT TIME ZONE 'UTC' stores the UTC wall clock, which is what
-- Prisma reads a naive timestamp as. The table has 0 rows, so no value is
-- actually rewritten; this only settles the column type.
ALTER TABLE "LabRoomState"
  ALTER COLUMN "updatedAt" TYPE TIMESTAMP(3) USING ("updatedAt" AT TIME ZONE 'UTC');

-- After this, the ONLY remaining `migrate diff` output is the three lower()
-- expression indexes on Place/UserPlace, which is the permanent, documented
-- false positive (see the note on model Place in schema.prisma). `db push`
-- must still never be run unattended, because it would replace those with
-- plain column indexes and silently slow directory search.
