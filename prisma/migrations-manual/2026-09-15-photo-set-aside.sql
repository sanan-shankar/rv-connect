-- Photo.heldAt: the review room's "Set aside" pile.
--
-- Owner, 2026-09-15: "keep certain photos aside. not approve not decline and
-- I don't want it to show as pending. just keep it for later maybe I need for
-- info for it". A set-aside photograph stays unapproved and stays invisible
-- to members, exactly as it was; the column only takes it off the Waiting pile
-- and the admin's waiting counts.
--
-- No index: the pile is a handful of rows out of the unapproved few, and every
-- query that reads it already filters `approved = false`.
--
-- WHEN TO APPLY: SAFE BEFORE THE DEPLOY. One nullable column nothing on the
-- running build selects. Purely additive.
--
-- IDEMPOTENT: ADD COLUMN IF NOT EXISTS.
--
-- APPLY TO BOTH PROJECTS: the demo reads the same review queries.
--   node scripts/dev/run-sql.mjs prisma/migrations-manual/2026-09-15-photo-set-aside.sql
--   node scripts/dev/run-sql.mjs --env .env.demo prisma/migrations-manual/2026-09-15-photo-set-aside.sql

ALTER TABLE "Photo" ADD COLUMN IF NOT EXISTS "heldAt" TIMESTAMP(3);

SELECT count(*) FILTER (WHERE "heldAt" IS NOT NULL) AS set_aside,
       count(*) FILTER (WHERE approved = false AND "isHidden" = false) AS unapproved
  FROM "Photo";
