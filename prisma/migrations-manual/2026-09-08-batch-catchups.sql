-- The batch Catch-up exists by default (spec 3.5 and 3.5b, architecture 6).
--
-- His, brief 4 and 51: "anyone in that batch is automatically added to that
-- catch-up, can see the history of rounds ... can participate in any future
-- rounds ... This batch catch-up should exist by default", and "the batch
-- catch up can't edit people in and out it's just people in that batch and
-- they're all automatically added and have access to previous issues if they
-- join later."
--
-- NO SCHEMA CHANGE. A batch is already a Group with `batchYear` set and a
-- Catch-up is already one row per Group (F6), so this file only writes rows.
-- Nothing is dropped, nothing is altered, and it can be applied before the
-- commit is pushed like any additive change.
--
-- APPLY TO BOTH PROJECTS:
--   node scripts/dev/run-sql.mjs prisma/migrations-manual/2026-09-08-batch-catchups.sql
--   node scripts/dev/run-sql.mjs --env .env.demo prisma/migrations-manual/2026-09-08-batch-catchups.sql
--
-- Every step is idempotent and every step is a no-op on the demo project,
-- which has no batch groups at all (counted 2026-09-08: 1 group, `demo-group`,
-- `batchYear` null). Sections 1 and 2 are keyed on structure, not on ids, so
-- they simply match nothing there.
--
-- WHAT THIS FILE DOES NOT DO: notify anybody. `ensureBatchCatchup` in
-- src/lib/batch-catchups.ts, which is the path every FUTURE batch Catch-up
-- takes, tells the batch its questions are open, because a batch reaching ten
-- is a real event at a real moment. This is not that. It is a backfill for two
-- batches that crossed the floor months ago, run at whatever hour the owner
-- happens to apply it, and 51 members' bells are not the place to say "a thing
-- that should always have existed now does". They will find it on their list
-- and in their sidebar, and the answer deadline's own reminders will reach
-- them on the schedule everything else uses.

BEGIN;

-- ── 1. Heal the batch memberships ──────────────────────────────────────────
--
-- `registerUser` calls `joinBatchGroup` inside a best-effort try/catch and the
-- comment beside it named this exact hole: "nothing re-checks 'an alumnus with
-- a batchYear and no batch-group row', so a pool timeout during a launch-day
-- burst left that member out of their batch permanently". It has happened
-- once. Counted 2026-09-08 on production: ONE row, Rukmini Rau, batchYear
-- 2024, absent from the Batch of 2024 group. Zero on the demo.
--
-- This is the one-time repair; `healBatchGroupMemberships` in
-- src/lib/batch-catchups.ts is the nightly one, and it also creates a missing
-- batch group. This file deliberately does not: creating groups is a decision
-- with a Catch-up behind it, and every batch that needs one already has one.
--
-- Role "member", like every other row in a batch group. That is load-bearing:
-- `isEffectiveKeeper` reads it, so a batch group in which nobody is "admin" or
-- "keeper" is a Catch-up nobody keeps, which is the whole design.
INSERT INTO "GroupMember" (id, "groupId", "userId", role, "joinedAt")
SELECT gen_random_uuid()::text, g.id, u.id, 'member', now()
  FROM "User" u
  JOIN "Group" g ON g."batchYear" = u."batchYear"
 WHERE u."batchYear" IS NOT NULL
   AND u."accountType" = 'alumnus'
ON CONFLICT ("groupId", "userId") DO NOTHING;

-- ── 2. Adopt the hand-made "Batch of 2024" ─────────────────────────────────
--
-- F17: a 2024 alumnus made a Catch-up through /catchups/new on 2026-08-23,
-- which always mints a NEW group, so it sits on a snapshot group with
-- `batchYear` null while the REAL Batch of 2024 group has no Catch-up at all.
-- Adopted rather than duplicated: it keeps its published Edition, its 8
-- answers and its 8 questions exactly where they are, and it hands the 2024
-- alumni who were not in the snapshot an Edition they were never in -- which
-- is brief 4's "access to previous issues if they join later", arriving for
-- the first people it was ever true of.
--
-- Identified STRUCTURALLY, not by id: a Catch-up whose group is named
-- "Batch of {year}" but carries no `batchYear`, where a real group for that
-- year exists and has no Catch-up of its own. That matches exactly one row on
-- production and none anywhere else, and it is the only shape this accident
-- can take (the /catchups/new form is where the name came from).
--
-- THE ASSERTION IS THE POINT. Re-pointing a Catch-up at a different group
-- changes who can read it. If anybody in the snapshot is NOT in the real batch
-- group, this whole file aborts rather than quietly taking somebody's access
-- away. Counted before it was written: snapshot 11, real group 11 (12 after
-- section 1), ten in both, and the one only-in-snapshot member is Rukmini,
-- whom section 1 has just added. So the subset holds by construction -- and it
-- is checked anyway, because "by construction" is what every silent data loss
-- was before it happened.
DO $$
DECLARE
  leftover int;
BEGIN
  SELECT count(*) INTO leftover
    FROM "CatchupSeries" c
    JOIN "Group" snap ON snap.id = c."groupId"
    JOIN "Group" real_g ON real_g."batchYear" = substring(snap.name from 'Batch of (\d{4})')::int
    JOIN "GroupMember" sm ON sm."groupId" = snap.id
   WHERE snap."batchYear" IS NULL
     AND snap.name ~ '^Batch of \d{4}$'
     AND NOT EXISTS (
           SELECT 1 FROM "GroupMember" rm
            WHERE rm."groupId" = real_g.id AND rm."userId" = sm."userId");

  IF leftover > 0 THEN
    RAISE EXCEPTION
      'Refusing to adopt: % snapshot member(s) are not in the real batch group. Section 1 was meant to have healed this.',
      leftover;
  END IF;
END $$;

-- Re-point, and strip the two things a batch Catch-up must not carry.
--
--   `createdById` -> NULL. Nobody keeps a batch Catch-up (architecture 6, his
--   correction N30). Its previous holder stays an ordinary member of the batch,
--   as everyone in a batch group is.
--
--   `inviteToken` -> NULL. There is nobody to invite: the membership is the
--   batch. This is what closes `joinCatchupByToken` on it, and it is why the
--   home shows no invite link.
--
-- The orphaned snapshot group is left standing on purpose and is deleted in
-- build phase 11, after the re-point has been confirmed in the running app.
-- A group with no Catch-up and no reader is inert; a group deleted in the same
-- breath as the thing that pointed at it is unrecoverable.
UPDATE "CatchupSeries" c
   SET "groupId" = real_g.id,
       "createdById" = NULL,
       "inviteToken" = NULL,
       "updatedAt" = now()
  FROM "Group" snap, "Group" real_g
 WHERE snap.id = c."groupId"
   AND snap."batchYear" IS NULL
   AND snap.name ~ '^Batch of \d{4}$'
   AND real_g."batchYear" = substring(snap.name from 'Batch of (\d{4})')::int
   AND NOT EXISTS (SELECT 1 FROM "CatchupSeries" x WHERE x."groupId" = real_g.id);

-- ── 3. The backfill: a Catch-up for every batch at or over the floor ───────
--
-- TEN is his number, 2026-09-08: "for people whose batches have less than ten
-- people, let's not even show the catch ups things in the sidebar. it won't be
-- reachble to them. once there's ten it appears and the catch up would be
-- created for that batch." It is `BATCH_CATCHUP_FLOOR` in catchups-core.ts.
--
-- SO THIS CREATES TWO CATCH-UPS TODAY, NOT ELEVEN. Counted 2026-09-08: eleven
-- batch groups, of which 2023 holds 39 members and 2024 holds 11 (12 after
-- section 1). The other nine hold four or fewer and six hold exactly one, so
-- under any smaller floor most batch Catch-ups would be a newsletter to
-- yourself, with reminders. And after section 2, Batch of 2024 already has its
-- Catch-up, so this file mints exactly ONE row here: Batch of 2023.
--
-- The picture is deterministic in the group id, the same property (though not
-- the same hash) that `pictureFor` gives the TypeScript paths: a re-applied
-- migration lands on the same photograph rather than shuffling the app under
-- somebody. `hashtext` is masked to positive first because it returns a signed
-- int4 and Postgres's `%` keeps the sign of the dividend. Every row of the
-- list below must be in CATCHUP_PICTURES with the same focus, and the modulo
-- must be its length; catchup-pictures.test.mjs fails otherwise. It was the
-- six stand-ins until 2026-09-10, when his first three replaced them; the row
-- this minted was moved by 2026-09-10-catchup-pictures-his-three.sql, not by
-- editing this.
WITH pool AS (
  SELECT * FROM (VALUES
    (1, '/images/catchups/shaded-path.webp',   'center 66%'),
    (2, '/images/catchups/stone-benches.webp', 'center 68%'),
    (3, '/images/catchups/boulder-hill.webp',  'center 48%')
  ) AS t(n, src, focus)
),
eligible AS (
  SELECT g.id
    FROM "Group" g
   WHERE g."batchYear" IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM "CatchupSeries" c WHERE c."groupId" = g.id)
     AND (SELECT count(*) FROM "GroupMember" m WHERE m."groupId" = g.id) >= 10
)
INSERT INTO "CatchupSeries"
  (id, "groupId", "createdById", cadence, status, "inviteToken", "nextOpensAt",
   "pictureSrc", "pictureFocus", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, e.id, NULL, 'monthly', 'active', NULL, NULL,
       pool.src, pool.focus, now(), now()
  FROM eligible e
  JOIN pool ON pool.n = ((hashtext(e.id) & 2147483647) % 3) + 1;

-- Edition 1, open and collecting, for any batch Catch-up that has no Edition
-- at all. Scoped to batch Catch-ups (`batchYear` not null) so it can never
-- touch a people Catch-up, and to ones with zero Editions so re-applying this
-- file cannot mint a second.
--
-- `questionsCloseAt` is `deadlineIn(now, QUESTION_WINDOW_DAYS)`, transcribed:
-- three days out, snapped FORWARD to the next 07:00 IST, which is 01:30 UTC on
-- every day of the year (India has kept one fixed offset since 1945). 5400 is
-- that offset in seconds and 86400 is a day, so this is the same
-- `ceil((t - 5400) / 86400) * 86400 + 5400` that snapToDeadlineHour computes in
-- milliseconds. 07:00 IST is the hour vercel.json's 02:00 UTC tick catches
-- within thirty minutes (spec 3.3).
INSERT INTO "CatchupEdition"
  (id, "catchupId", number, status, "questionsCloseAt", "remindersSent", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, c.id, 1, 'collecting',
       (to_timestamp(
          ceil((extract(epoch FROM now() + interval '3 days') - 5400) / 86400.0) * 86400 + 5400
        ) AT TIME ZONE 'UTC'),
       0, now(), now()
  FROM "CatchupSeries" c
  JOIN "Group" g ON g.id = c."groupId"
 WHERE g."batchYear" IS NOT NULL
   AND NOT EXISTS (SELECT 1 FROM "CatchupEdition" e WHERE e."catchupId" = c.id);

COMMIT;
