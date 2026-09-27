-- Batch Catch-ups run every three months.
--
-- Owner, 2026-09-27, on learning they were monthly: "if it's monthly now, make
-- it quarterly". From this commit ensureBatchCatchup writes BATCH_CADENCE
-- ("quarterly", src/lib/catchups-core.ts) on every batch Catch-up it creates;
-- before, it wrote nothing and the column default made them monthly. A batch
-- has no Keeper, so nobody could change it in the app.
--
-- This moves the ones that already exist. Measured before writing: nine batch
-- Catch-ups (1989, 2016, 2018, 2019, 2021, 2022, 2023, 2024, 2026), all
-- monthly. Eight are in Edition 1, collecting, with nothing booked
-- (nextOpensAt null): only the word changes, and the gap applies when each
-- publishes. 2024 published Edition 1 at 2026-09-06 02:53:35.048 and had its
-- next Edition booked for 2026-10-06 02:53:35.048; it moves to 2026-12-06
-- 02:53:35.048. To undo 2024: set cadence 'monthly' and nextOpensAt back to
-- that October value.
--
-- The booked date is re-anchored exactly as updateCatchupCadence re-anchors a
-- Keeper's change (audit M08): three months after the newest closed Edition,
-- a capsule's seal before its publish, and never earlier than now. Postgres
-- clamps a month step to the end of a short month, as addMonths does.
--
-- WHEN TO APPLY: SAFE BEFORE THE DEPLOY. "quarterly" is a cadence the running
-- build already knows.
--
-- IDEMPOTENT: a second run matches nothing, because no batch row is monthly.
--
-- MAIN DATABASE ONLY. It changes data, not schema, and the demo's batches are seeded.
--   node scripts/dev/run-sql.mjs prisma/migrations-manual/2026-09-27-batch-catchups-quarterly.sql

UPDATE "CatchupSeries" c
   SET cadence = 'quarterly',
       "nextOpensAt" = CASE
         WHEN c."nextOpensAt" IS NULL THEN NULL
         ELSE GREATEST(
           now() AT TIME ZONE 'UTC',
           COALESCE(
             (SELECT COALESCE(e."sealedAt", e."publishedAt") + interval '3 months'
                FROM "CatchupEdition" e
               WHERE e."catchupId" = c.id AND e.status IN ('published', 'sealed')
               ORDER BY e.number DESC
               LIMIT 1),
             c."nextOpensAt"))
       END
  FROM "Group" g
 WHERE g.id = c."groupId"
   AND g."batchYear" IS NOT NULL
   AND c.cadence = 'monthly';
