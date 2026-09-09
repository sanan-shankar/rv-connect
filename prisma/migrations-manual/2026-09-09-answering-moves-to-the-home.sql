-- Answering moved onto the Catch-up's own home (build phase 7), so the stored
-- links that point at the page it used to live on have to move with it.
--
-- His, review-2026-09-07 N77: "maybe we should just tie in the huge answering
-- UI we had with our home screen or whatever. Because it doesn't make sense to
-- have the collecting in the home screen and then the answering takes you away
-- from it."
--
-- ONE STORED STRING. `Notification.link` is a column, so no amount of renaming
-- in TypeScript reaches a value already sitting in a member's bell.
-- `catchups-notify.ts` wrote "/catchups/<id>/answer" on every answers-open
-- broadcast and on every daily reminder; there are twelve such rows on
-- production today, nine of them for one paused Catch-up.
--
-- The route ALSO survives permanently as a 308 in
-- src/app/(main)/catchups/[catchupId]/answer/page.tsx. BOTH, not either: this
-- file fixes the bell, the redirect fixes the reminder emails already sitting
-- in seventy inboxes, which cannot be recalled.
--
-- A SECOND REASON THIS IS NOT COSMETIC. `notifyReminder` de-duplicates the
-- daily nudge by deleting the previous one, matched on `link`. Now that it
-- writes the home's path, a row still carrying the old one would never be
-- matched and never deleted -- so a member with a stale reminder would collect
-- a second, permanent one beside every new nudge. Rewriting the rows is what
-- keeps that delete finding them.
--
-- WHEN TO APPLY THIS: AFTER the commit it belongs to has been pushed and both
-- Vercel projects have finished deploying -- not before. One database serves
-- production and local dev, so between the UPDATE and the deploy the RUNNING
-- build is still writing "/answer" links, and this would rewrite rows that the
-- old code then re-creates. Applying it late is harmless; applying it early
-- just means running it twice.
--
-- IDEMPOTENT: the WHERE clause matches only rows that still carry the old
-- suffix, so a second run updates nothing.
--
-- APPLY TO BOTH PROJECTS: production and the demo are separate Supabase
-- projects.
--   node scripts/dev/run-sql.mjs prisma/migrations-manual/2026-09-09-answering-moves-to-the-home.sql
--   node scripts/dev/run-sql.mjs prisma/migrations-manual/2026-09-09-answering-moves-to-the-home.sql --demo

BEGIN;

-- Count first, so the run says what it touched rather than reporting success
-- over a no-op nobody checked.
SELECT count(*) AS "notification links still pointing at /answer"
FROM "Notification"
WHERE link LIKE '/catchups/%/answer';

UPDATE "Notification"
SET link = left(link, length(link) - length('/answer'))
WHERE link LIKE '/catchups/%/answer';

SELECT count(*) AS "left over (must be 0)"
FROM "Notification"
WHERE link LIKE '/catchups/%/answer';

COMMIT;
