-- =============================================================================
-- Collection upload form rework (2026-07-18). Additive only; idempotent, safe
-- to run twice. Run via: node scripts/dev/run-sql.mjs prisma/migrations-manual/2026-07-18-collection-upload.sql
-- (`prisma db push` is still blocked by the legacy Catchup* tables, bugs.md #11.)
--
-- The contribute form (contribute-dialog.tsx) dropped subject tagging and the
-- bird/species free-tag field, and now collects "when" as either an exact
-- year (with an optional month) or, when the contributor isn't sure, a decade
-- fallback (still stored in the existing `era` column). These three columns
-- capture that.
-- =============================================================================

ALTER TABLE "Photo" ADD COLUMN IF NOT EXISTS "photoYear" INTEGER;
ALTER TABLE "Photo" ADD COLUMN IF NOT EXISTS "photoMonth" INTEGER;
ALTER TABLE "Photo" ADD COLUMN IF NOT EXISTS "datePrecision" TEXT;
