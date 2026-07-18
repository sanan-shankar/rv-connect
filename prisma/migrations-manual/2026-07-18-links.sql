-- =============================================================================
-- Facebook + user-defined "Other links" columns for the settings Contact
-- section (2026-07-18, settings-consolidation lane). Additive, idempotent;
-- safe to run twice. Run via:
--   node scripts/dev/run-sql.mjs prisma/migrations-manual/2026-07-18-links.sql
-- (`prisma db push` is still blocked by the legacy Catchup* tables, bugs.md #11.)
-- =============================================================================

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "facebook" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "links" TEXT;
