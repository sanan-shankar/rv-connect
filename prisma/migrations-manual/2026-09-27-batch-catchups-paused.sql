-- Batch Catch-ups start paused, and the nine that already exist pause now.
--
-- Owner, 2026-09-27: "instead of having the keeper for the batch catch ups,
-- make everyone a keeper ... and have all of them paused by default." From
-- this commit `ensureBatchCatchup` writes `status: "paused"`, `pausedAt: now`
-- on every batch Catch-up it creates, and any member -- not a designated
-- Keeper, there has never been one -- may resume it (`pauseCatchup` /
-- `resumeCatchup` take an `allowBatch` opt-in now). This moves the ones that
-- already exist to the same state, so nothing that ships today is running
-- unpaused only because it predates the change.
--
-- Measured before writing: nine batch Catch-ups (1989, 2016, 2018, 2019,
-- 2021, 2022, 2023, 2024, 2026), all "active". Eight are Edition 1,
-- collecting, 0 answers, most with 0 or 1 of the 3 opening questions asked
-- (2022 has 1) -- pausing one freezes nothing new, since `questionsCloseAt`
-- is already null on every one of them and the clock was never running.
-- 2024 is published, with its next Edition booked (`nextOpensAt`) for
-- 2026-12-06 after the same day's cadence move; `resumeCatchup`'s existing
-- shift-by-the-freeze logic (`shiftPausedInstant`) carries that date forward
-- by however long this leaves it paused, the same way it already does for a
-- Keeper's manual hold. Nothing here loses an answer, a question, or a
-- booked date -- only `status` and `pausedAt` move, and resuming un-moves
-- `pausedAt` and restores or shifts every deadline exactly as a hand-driven
-- pause and resume already would.
--
-- WHEN TO APPLY: AFTER THE DEPLOY, not before, unlike the cadence move
-- earlier today. That one was safe early because the running build already
-- understood "quarterly"; this one is not, because the running build (pre-
-- deploy) still refuses `resumeCatchup` to every batch member outright, so a
-- batch paused by this file before the code ships has no one who can start
-- it again until the code catches up. Applying it after leaves that window
-- at zero.
--
-- IDEMPOTENT: a second run matches nothing, because no batch row is "active".
--
-- MAIN DATABASE ONLY. It changes data, not schema; the demo's seed does not
-- currently write a batch Catch-up row at all (checked 2026-09-14, spec §14).
--   node scripts/dev/run-sql.mjs prisma/migrations-manual/2026-09-27-batch-catchups-paused.sql

UPDATE "CatchupSeries" c
   SET status = 'paused',
       "pausedAt" = now() AT TIME ZONE 'UTC'
  FROM "Group" g
 WHERE g.id = c."groupId"
   AND g."batchYear" IS NOT NULL
   AND c.status = 'active';
