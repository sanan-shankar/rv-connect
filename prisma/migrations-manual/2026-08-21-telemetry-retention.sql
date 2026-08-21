-- Presence telemetry stops accumulating forever.
--
-- Visit and SearchLog were added on 2026-08-19, AFTER scripts/ops/prune.mjs was
-- written, and nothing anywhere deleted a row from either: absent from the
-- retention sweep, absent from prune.mjs, absent from the owner's retention
-- table in docs/SECURITY.md. Both carry a userId, so both are identifiable
-- presence data with no expiry (bug audit B-093).
--
-- The sweep needs an index it can lead with. Visit already has @@index([endedAt]);
-- SearchLog's only date index is ([scope, createdAt]), which leads on scope and
-- so cannot serve a bare `createdAt < cutoff`.
--
-- Idempotent, per CLAUDE.md: never `prisma db push` against this database.
-- Apply: node scripts/dev/run-sql.mjs prisma/migrations-manual/2026-08-21-telemetry-retention.sql

CREATE INDEX IF NOT EXISTS "SearchLog_createdAt_idx" ON "SearchLog" ("createdAt");
