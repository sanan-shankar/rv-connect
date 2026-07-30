-- =============================================================================
-- Multiple phone numbers column for the settings Contact section (2026-07-30,
-- multi-phone lane). Additive, idempotent; safe to run twice. Run via:
--   node scripts/dev/run-sql.mjs prisma/migrations-manual/2026-07-30-phones.sql
-- (`prisma db push` is still blocked by the legacy Catchup* tables, bugs.md #11.)
-- =============================================================================

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "phones" TEXT;
