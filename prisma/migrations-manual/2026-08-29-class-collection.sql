-- The Class Collection: a second, class-scoped half of the Collection.
--
-- docs/planning/class-collection/spec.md sec. 3.
--
-- Idempotent, per CLAUDE.md: never `prisma db push` against this database.
-- Apply: node scripts/dev/run-sql.mjs prisma/migrations-manual/2026-08-29-class-collection.sql
--   and: node scripts/dev/run-sql.mjs --env .env.demo prisma/migrations-manual/2026-08-29-class-collection.sql
--
-- Purely ADDITIVE. Nothing is renamed, nothing is dropped, and no existing
-- value is rewritten: one Supabase database serves production and local dev,
-- so the currently deployed build has to keep working unchanged while this
-- sits in front of it. It does -- every row it can see is scope='valley',
-- which is what it already believes about all of them.
--
-- DO NOT go near "takenKey". It is GENERATED ALWAYS ... STORED; Prisma reads
-- it and never writes it, and touching it broke every contribution once
-- already (see the column's comment in schema.prisma).

-- ------------------------------------------------------------------
-- 1. The scope discriminator.
--
-- NOT NULL DEFAULT 'valley', so every existing row is correct the instant the
-- column exists and there is no backfill pass to get half-way through.
--
-- Explicit rather than "classYears IS NULL means everyone": a null that reads
-- as public is the shape of a default-open leak, and this column is the one
-- thing standing between a private class photograph and the whole membership.
-- ------------------------------------------------------------------

ALTER TABLE "Photo" ADD COLUMN IF NOT EXISTS "scope" TEXT NOT NULL DEFAULT 'valley';

-- ------------------------------------------------------------------
-- 2. The audience.
--
-- A comma list of batch years, null for valley rows. Exactly one year is ever
-- written today; it is a list so that letting an uploader name the class above
-- is a later flag flip rather than a migration on a large table (spec 2.2).
-- ------------------------------------------------------------------

ALTER TABLE "Photo" ADD COLUMN IF NOT EXISTS "classYears" TEXT;

-- ------------------------------------------------------------------
-- 3. The Class Collection's river index.
--
-- Mirrors Photo_river_taken_idx and keeps the property that one depends on:
-- it ends in the tiebreak that makes the ordering TOTAL. A keyset page over a
-- partial ordering can repeat a row across pages and skip another entirely
-- (audit B-122), which is exactly the bug the river was rewritten to fix.
--
-- CONCURRENTLY is deliberately NOT used: it cannot run inside the transaction
-- run-sql.mjs wraps a file in, and Photo is small enough that the brief lock
-- costs less than the operational care of a non-transactional migration.
-- ------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS "Photo_class_river_idx"
  ON "Photo" ("scope", "classYears", "approved", "isHidden", "takenKey" DESC, "id" DESC);
