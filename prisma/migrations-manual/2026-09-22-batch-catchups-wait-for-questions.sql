-- A batch Catch-up's first Edition waits for three questions before its clock starts.
--
-- Owner, 2026-09-22: "don't let it send notifications. just have questions
-- indefinitely open. when 3 questions have been asked, then start the 3 day
-- window." From this commit, ensureBatchCatchup creates Edition 1 with no
-- deadline and tells nobody, and submitPrompt starts the three days on the
-- third question (BATCH_QUESTIONS_TO_START in src/lib/catchups-core.ts).
--
-- This moves the batches already waiting onto the same rule. Measured before
-- writing: 2021, 2022, 2023 and 2026 each had Edition 1 collecting with no
-- questions, on a running or already-spent window; 2024 had published and is
-- not touched. Their "questions are open" notifications went out when they
-- were created and cannot be recalled.
--
-- remindersSent loses bit 8 (REMINDER_QUESTIONS_EXTENDED), the record of the
-- one empty-window extension, so that once the three questions arrive the
-- batch gets the same single extension a fresh one would.
--
-- WHEN TO APPLY: SAFE BEFORE THE DEPLOY. The running build reads a null
-- deadline as "still collecting"; it just cannot start the clock until the new
-- build is live.
--
-- IDEMPOTENT: a second run matches nothing, because the deadline is already null.
--
-- MAIN DATABASE ONLY. It changes data, not schema, and the demo's batches are seeded.
--   node scripts/dev/run-sql.mjs prisma/migrations-manual/2026-09-22-batch-catchups-wait-for-questions.sql

UPDATE "CatchupEdition" e
   SET "questionsCloseAt" = NULL,
       "remindersSent" = e."remindersSent" & ~8
  FROM "CatchupSeries" c
  JOIN "Group" g ON g.id = c."groupId"
 WHERE e."catchupId" = c.id
   AND g."batchYear" IS NOT NULL
   AND e.number = 1
   AND e.status = 'collecting'
   AND e."questionsCloseAt" IS NOT NULL
   AND (SELECT count(*) FROM "CatchupPrompt" p WHERE p."editionId" = e.id AND p.accepted) < 3;

SELECT g.name, e.status, e."questionsCloseAt", e."remindersSent"
  FROM "CatchupEdition" e
  JOIN "CatchupSeries" c ON c.id = e."catchupId"
  JOIN "Group" g ON g.id = c."groupId"
 WHERE g."batchYear" IS NOT NULL
 ORDER BY g.name, e.number;
