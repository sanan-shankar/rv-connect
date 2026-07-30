-- =============================================================================
-- UI theme preference column for the dark-mode groundwork (2026-07-30).
-- Values: 'light' | 'dark'; NULL = light, so existing rows need no backfill.
-- Additive, idempotent; safe to run twice. Run via:
--   node scripts/dev/run-sql.mjs prisma/migrations-manual/2026-07-30-theme.sql
-- (`prisma db push` is still blocked by the legacy Catchup* tables, bugs.md #11.)
-- =============================================================================

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "theme" TEXT;
