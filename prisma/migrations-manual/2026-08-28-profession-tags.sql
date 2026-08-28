-- ------------------------------------------------------------------
-- Profession tags: the backend column behind the directory's
-- Profession filter.
--
-- WHY: the filter shipped provisional, matching a case-insensitive
-- `contains` over jobTitle then workplace against a fourteen-item
-- self-selection vocabulary written for an onboarding "Industry"
-- select that no longer exists. Measured on this database on
-- 2026-08-28: 63 live members, 34 with any work text, and the pair is
-- the only thing that says what someone does -- `workplace` holds the
-- ORGANISATION ("Tufts University") and `jobTitle` the ROLE
-- ("Student"), so no single column can be filtered on directly. The
-- tags are assigned by a hand-run pass (scripts/dev/tag-professions-*)
-- and nobody types them.
--
-- TEXT[] WITH NO ENUM AND NO CHECK CONSTRAINT, deliberately. The
-- vocabulary lives in src/lib/profession-tags.ts and is meant to
-- change: a tag added, split into two, merged, or dropped. One
-- database serves production and local dev, so a constraint here would
-- turn every vocabulary edit into a migration with an outage window
-- while the deploy catches up. The database holds strings; the
-- TypeScript is what says which strings mean anything, and `tagsOf()`
-- maps any value from a dead vocabulary on the way through -- the same
-- arrangement the Collection's buckets use (src/lib/collection.ts).
--
-- GIN on the array because the filter is a `has` (Postgres `@>`) and
-- the facet counts are an `unnest`. A B-tree would index the whole
-- array as one opaque value and answer neither.
--
-- Idempotent: IF NOT EXISTS throughout, so a re-run is a no-op.
-- Apply with `node scripts/dev/run-sql.mjs`, then again with
-- `--env .env.demo` for the demo database.
-- ------------------------------------------------------------------

BEGIN;

-- NOT NULL DEFAULT '{}' rather than a nullable column: "no tags" and
-- "not yet looked at" are the same state to every reader, and an empty
-- array lets `has` and `unnest` work without a null guard at each site.
-- Which people still need looking at is answered by professionTagSource
-- below, not by a null here.
ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "professionTags" TEXT[] NOT NULL DEFAULT '{}';

-- The (jobTitle, workplace) pair the tags were judged from, as JSON.
-- Lets the pick script find people whose text has CHANGED since they
-- were tagged. Not a vocabulary version stamp: that would mark the
-- whole membership stale every time one tag is added.
ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "professionTagSource" TEXT;

CREATE INDEX IF NOT EXISTS "User_professionTags_idx"
  ON "User" USING GIN ("professionTags");

COMMIT;
