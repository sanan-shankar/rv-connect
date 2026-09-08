-- Round became Edition (spec section 2). Two STORED strings still say "round"
-- and have to be rewritten, because no amount of renaming in TypeScript
-- reaches a value already sitting in a column.
--
-- His, 2026-09-07: "let's not use Round or Issue let's call them additions" --
-- then, a minute later, "Editions not additions."
--
--   1. Notification.link. catchups-notify.ts writes "/catchups/round/<id>" on
--      publish and on a heart, and those rows are in members' bells right now.
--      The route moved to /catchups/edition/<id>. The old path also survives
--      permanently as a 308 in
--      src/app/(main)/catchups/round/[editionId]/page.tsx -- BOTH, not either:
--      this file fixes the bell, the redirect fixes anything already shared,
--      bookmarked or sitting in somebody's email.
--
--   2. ContentView.kind. recordView(..., "round", editionId) counts reader
--      opens, and admin-analytics.ts reads them back with a raw
--      `WHERE kind = 'round'`. Rename the type without rewriting the rows and
--      the admin room's "Catch-up Edition opens" silently drops to whatever
--      has happened since the deploy.
--
-- WHEN TO APPLY THIS: AFTER the commit it belongs to has been pushed and both
-- Vercel projects have finished deploying -- not before. Same ordering rule as
-- a column drop (spec section 3), and for the same reason: one database serves
-- production and local dev, so between the UPDATE and the deploy the RUNNING
-- build has no /catchups/edition route and every rewritten bell link 404s for
-- seventy members. The redirect is what makes the reverse direction safe, so
-- doing nothing until the deploy costs nothing.
--
-- Idempotent, and safe to run twice or ten times: every statement is scoped to
-- rows that still carry the old value.
--
-- What it will actually touch, counted read-only on 2026-09-08:
--   production  61 Notification rows, 17 ContentView rows
--   demo         0 and 0 (its seed writes neither)
--
-- Apply (BOTH projects, production first):
--   node scripts/dev/run-sql.mjs prisma/migrations-manual/2026-09-08-round-becomes-edition.sql
--   node scripts/dev/run-sql.mjs --env .env.demo prisma/migrations-manual/2026-09-08-round-becomes-edition.sql

UPDATE "Notification"
   SET link = replace(link, '/catchups/round/', '/catchups/edition/')
 WHERE link LIKE '/catchups/round/%';

-- ContentView is unique on (viewerId, kind, targetId). Nothing has ever
-- written kind='edition', so a straight UPDATE cannot collide today -- but a
-- re-run after a partial failure could, so fold any row that would collide
-- into the one already there rather than letting the constraint abort the
-- whole file.
UPDATE "ContentView" e
   SET "count" = e."count" + r."count",
       "lastAt" = greatest(e."lastAt", r."lastAt")
  FROM "ContentView" r
 WHERE r.kind = 'round'
   AND e.kind = 'edition'
   AND e."viewerId" = r."viewerId"
   AND e."targetId" = r."targetId";

DELETE FROM "ContentView" r
 USING "ContentView" e
 WHERE r.kind = 'round'
   AND e.kind = 'edition'
   AND e."viewerId" = r."viewerId"
   AND e."targetId" = r."targetId";

UPDATE "ContentView" SET kind = 'edition' WHERE kind = 'round';

DO $$
DECLARE stale_links int; stale_views int;
BEGIN
  SELECT count(*) INTO stale_links
    FROM "Notification" WHERE link LIKE '/catchups/round/%';
  IF stale_links <> 0 THEN
    RAISE EXCEPTION 'Notification still holds % links to /catchups/round/; refusing to report success.', stale_links;
  END IF;

  SELECT count(*) INTO stale_views
    FROM "ContentView" WHERE kind = 'round';
  IF stale_views <> 0 THEN
    RAISE EXCEPTION 'ContentView still holds % rows with kind=round; refusing to report success.', stale_views;
  END IF;
END $$;
