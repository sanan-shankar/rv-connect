-- A staged upload can be contributed once.
--
-- The direct-upload path PUTs a full-resolution original under a fresh key and
-- then calls `contributePhotoDirect` with that key. The action reads the
-- original, re-encodes it, stores a display copy and a thumbnail, creates the
-- Photo row, and only THEN deletes the staged original.
--
-- Two of those calls landing together -- a double tap, a retried request, two
-- tabs -- both read the original before either delete runs, so both re-encode
-- it, both store a fresh pair of objects and both create a row. One
-- contribution becomes two Collection photos and four stored objects, and the
-- per-account ceiling was checked before either insert, so it can be exceeded
-- by however many raced.
--
-- Sequential resubmission was already safe (the second read finds the original
-- gone); this closes the concurrent case, which application code cannot under
-- READ COMMITTED (audit C-129).
--
-- NULLABLE and unique together: Postgres treats NULLs as distinct, so every
-- pre-existing row and every row from the proxied path -- which has no staged
-- key of its own -- coexists happily. Nothing has to be backfilled.
--
-- Idempotent, per CLAUDE.md: never `prisma db push` against this database.
-- Apply: node scripts/dev/run-sql.mjs prisma/migrations-manual/2026-08-25-photo-source-key.sql
--   and: node scripts/dev/run-sql.mjs --env .env.demo prisma/migrations-manual/2026-08-25-photo-source-key.sql

ALTER TABLE "Photo" ADD COLUMN IF NOT EXISTS "sourceKey" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "Photo_sourceKey_key" ON "Photo" ("sourceKey");
