-- The "🪇" Catch-up folded into the Batch of 2024 Catch-up, and removed.
--
-- WHERE IT CAME FROM. On 2026-10-15 a 2024 alumnus started a new Catch-up
-- through /catchups/new, pressed "everyone from my batch", and called it "🪇".
-- Its 42 members were exactly the 42 in the Batch of 2024 group (checked before
-- this ran), so every one of them was in two Catch-ups with the same people.
-- The batch one had run one round (published 2026-09-06, one person answered)
-- and its rhythm put the next one in December; the way to start one sooner sat
-- in its settings panel, where nobody found it. The SECOND time 2024 has done
-- this: 2026-09-08-batch-catchups.sql adopted the first hand-made one.
--
-- HIS WORD, 2026-10-17: "make it the batch catch-up that has everything and
-- remove this [one] ... port all the questions, all the settings, everything
-- like that, move it onto the batch catch-up."
--
-- WHAT MOVES. Its one Edition, still collecting, with its 9 questions, becomes
-- the batch's next Edition (number 2), so the round carries on with the same
-- deadline and every question where it was. The bell rows that announced it
-- are re-pointed at the batch Catch-up and renamed, so a tap still lands.
-- Its settings were the creation defaults (a pool picture, monthly) and the
-- name, and a batch keeps its own name and picture, so none of them move.
-- One reminder pref existed and the batch already holds the same one for
-- the same member; the cascade takes it.
--
-- WHAT GOES. The duplicate `CatchupSeries` row, its `Group` and the 42
-- `GroupMember` rows (all cascades, nothing else points at either id).
--
-- IDEMPOTENT: a second run finds no duplicate and says so. It REFUSES rather
-- than moves if the duplicate has gained a member outside the batch, a second
-- Edition, or if the batch has a round of its own running -- any of which
-- would mean this is no longer the situation it was written for.
--
-- SAFE BEFORE OR AFTER ANY DEPLOY: no code names these ids.
--   node scripts/dev/run-sql.mjs prisma/migrations-manual/2026-10-17-fold-2024-duplicate-into-batch.sql
-- The demo is a separate project and has neither row; there it is a no-op.

DO $$
DECLARE
  dup_id   CONSTANT text := 'cmv9mxkd9001906l8yvbp21b6';
  batch_id CONSTANT text := 'cmt5ru8c1000c04larumy3b0z';
  dup_group text;
  batch_group text;
  strays int;
  dup_editions int;
  running int;
  next_number int;
  moved int;
  bells int;
BEGIN
  SELECT "groupId" INTO dup_group FROM "CatchupSeries" WHERE id = dup_id;
  IF dup_group IS NULL THEN
    RAISE NOTICE 'The duplicate Catch-up is already gone. Nothing to do.';
    RETURN;
  END IF;

  SELECT c."groupId" INTO batch_group
    FROM "CatchupSeries" c JOIN "Group" g ON g.id = c."groupId"
   WHERE c.id = batch_id AND g."batchYear" = 2024;
  IF batch_group IS NULL THEN
    RAISE EXCEPTION 'The Batch of 2024 Catch-up is not where it was. Refusing.';
  END IF;

  SELECT count(*) INTO strays
    FROM "GroupMember" d
   WHERE d."groupId" = dup_group
     AND NOT EXISTS (SELECT 1 FROM "GroupMember" b
                      WHERE b."groupId" = batch_group AND b."userId" = d."userId");
  IF strays > 0 THEN
    RAISE EXCEPTION '% member(s) of the duplicate are not in the Batch of 2024. Refusing: folding it would cut them off.', strays;
  END IF;

  SELECT count(*) INTO dup_editions FROM "CatchupEdition" WHERE "catchupId" = dup_id;
  IF dup_editions <> 1 THEN
    RAISE EXCEPTION 'The duplicate has % Editions, not 1. Refusing.', dup_editions;
  END IF;

  SELECT count(*) INTO running FROM "CatchupEdition"
   WHERE "catchupId" = batch_id AND status NOT IN ('published', 'sealed');
  IF running > 0 THEN
    RAISE EXCEPTION 'The batch Catch-up has a round of its own running. Refusing: two would collide.';
  END IF;

  SELECT coalesce(max(number), 0) + 1 INTO next_number FROM "CatchupEdition" WHERE "catchupId" = batch_id;

  UPDATE "CatchupEdition" SET "catchupId" = batch_id, number = next_number WHERE "catchupId" = dup_id;
  GET DIAGNOSTICS moved = ROW_COUNT;

  -- A round is running now, so nothing is booked; the clock stamps the next
  -- date itself when this one comes out. `updatedAt` by hand, because raw SQL
  -- does not touch Prisma's @updatedAt and the admin list sorts by it: without
  -- it the batch sat 18th of 21 where the duplicate had been first, and read
  -- as gone (owner, the same morning: "are you sure 2024 exists?").
  UPDATE "CatchupSeries" SET "nextOpensAt" = NULL, "updatedAt" = now() WHERE id = batch_id;

  UPDATE "Notification"
     SET link = replace(link, dup_id, batch_id),
         message = replace(message, '🪇', 'Batch of 2024')
   WHERE link LIKE '%' || dup_id || '%';
  GET DIAGNOSTICS bells = ROW_COUNT;

  DELETE FROM "Group" WHERE id = dup_group;

  RAISE NOTICE 'Moved % Edition as number %, re-pointed % bell rows, removed the duplicate.', moved, next_number, bells;
END $$;

SELECT (SELECT count(*) FROM "CatchupSeries" WHERE id = 'cmv9mxkd9001906l8yvbp21b6') AS duplicate_left,
       (SELECT count(*) FROM "CatchupEdition" WHERE "catchupId" = 'cmt5ru8c1000c04larumy3b0z') AS batch_editions,
       (SELECT count(*) FROM "CatchupPrompt" p JOIN "CatchupEdition" e ON e.id = p."editionId"
         WHERE e."catchupId" = 'cmt5ru8c1000c04larumy3b0z' AND e.number = 2) AS round_2_questions,
       (SELECT count(*) FROM "Notification" WHERE link LIKE '%cmv9mxkd9001906l8yvbp21b6%') AS stale_bells;
