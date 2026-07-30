-- =============================================================================
-- LabRoomState: per-room archive state for /lab (2026-07-30, Wave-6 lab lane).
-- Replaces src/app/lab/archive-overrides.json, which was written with
-- fs.writeFile at request time; a deployed Vercel filesystem is read-only, so
-- archiving could never work on the owner's domain. Additive, idempotent;
-- safe to run twice. Run via:
--   node scripts/dev/run-sql.mjs prisma/migrations-manual/2026-07-30-lab-archive.sql
-- (`prisma db push` is still blocked by the legacy Catchup* tables, bugs.md #11.)
--
-- One row per room whose archived state differs from its registry default
-- (src/app/lab/_registry.ts); no row means the default applies. No seed rows
-- are needed: the six rooms the owner had archived via the JSON file were
-- folded into the registry defaults in the same change that added this table.
-- Until this runs, reads fall back to those defaults (P2021 guard in
-- src/app/lab/_archive-state.ts) and archiving reports a friendly error.
-- =============================================================================

CREATE TABLE IF NOT EXISTS "LabRoomState" (
  "href"      TEXT PRIMARY KEY,
  "archived"  BOOLEAN NOT NULL DEFAULT false,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
