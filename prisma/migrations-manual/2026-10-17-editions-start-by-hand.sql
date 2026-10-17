-- Editions start by hand: every legacy row settled into the idle model.
--
-- HIS WORD, 2026-10-17: "You should just be able to start it whenever you
-- want. And then it ends when it ends. And then it just doesn't go until you
-- start it again." There is no rhythm and nothing to hold any more
-- (docs/planning/catchups-rework/editions-on-demand.md). The code reads a
-- `paused` row as active and ignores `nextOpensAt`, so this file only makes
-- the data say what the code already assumes.
--
-- WHAT IT DOES, measured the same day before it was written:
--   1. Paused -> active. Eight batch Catch-ups (made paused on 2026-09-27 so
--      nobody was bothered by one they had not asked for; being idle does that
--      now) and one people Catch-up, "in the loop". `pausedAt` cleared.
--
-- APPLIED to main on 2026-10-17, right after the push deployed: 9 paused rows
-- made active, 0 booked, 0 left to reopen. NOT YET on the demo (its run needs
-- the owner's go-ahead); the demo's code already reads paused as active.
--   2. `nextOpensAt` cleared everywhere. Nothing reads it; this is so nobody
--      reading the table thinks something is booked.
--   3. A `collecting` Edition whose question window closed with nothing asked
--      is FIZZLED: its question deadline is cleared, which is what idle means
--      (`isEditionRunning`), so the next Start reuses the row rather than the
--      first page view after this reopening it for three days. The clock does
--      the same to an Edition that closes empty twice from now on. Exactly one
--      row today: "in the loop" Edition 2, empty since 2026-09-08.
--      THIS STEP ALREADY RAN, alone, on 2026-10-17, before the code was even
--      committed: the dev server runs the working tree against this same
--      database, read that paused Catch-up as active, and the next page view
--      by any of its 23 members would have reopened the Edition and told all
--      of them. (It first ran as "mark the extension spent", the earlier shape
--      of fizzled, then as this.) Harmless under the old code, where the row
--      was still paused. A no-op when the rest of this file runs.
--
-- WHEN: after the push that ships the code. Before it, step 1 would hand the
-- old code nine batch Catch-ups it treats as running. It is harmless either
-- way and idempotent: a second run finds nothing to change.
--   node scripts/dev/run-sql.mjs prisma/migrations-manual/2026-10-17-editions-start-by-hand.sql
-- Then the demo, which has no paused rows and no booked dates; a no-op there:
--   node scripts/dev/run-sql.mjs --env .env.demo prisma/migrations-manual/2026-10-17-editions-start-by-hand.sql
--
-- The three columns themselves go in 2026-10-17-drop-rhythm-columns.sql, which
-- refuses to run until this one has.

BEGIN;

UPDATE "CatchupSeries"
   SET status = 'active', "pausedAt" = NULL
 WHERE status = 'paused';

UPDATE "CatchupSeries"
   SET "nextOpensAt" = NULL
 WHERE "nextOpensAt" IS NOT NULL;

UPDATE "CatchupEdition" e
   SET "questionsCloseAt" = NULL
 WHERE e.status = 'collecting'
   AND e."questionsCloseAt" < now()
   AND NOT EXISTS (SELECT 1 FROM "CatchupPrompt" p WHERE p."editionId" = e.id AND p.accepted);

COMMIT;

SELECT (SELECT count(*) FROM "CatchupSeries" WHERE status = 'paused')            AS paused_left,
       (SELECT count(*) FROM "CatchupSeries" WHERE "nextOpensAt" IS NOT NULL)    AS booked_left,
       (SELECT count(*) FROM "CatchupEdition" e
         WHERE e.status = 'collecting' AND e."questionsCloseAt" < now()
           AND NOT EXISTS (SELECT 1 FROM "CatchupPrompt" p WHERE p."editionId" = e.id AND p.accepted)) AS reopenable_left;
