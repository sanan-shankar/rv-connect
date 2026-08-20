-- Phase 7 (audit log and admin accountability): the AuditLog table (H10/H14/M36)
-- and the per-pair unique on Report (H5). Idempotent, forward-only.

-- An append-only accountability record. No foreign keys on purpose: a row must
-- outlive the accounts it names ("admin X deleted member Y" survives both).
CREATE TABLE IF NOT EXISTS "AuditLog" (
  "id"         TEXT NOT NULL PRIMARY KEY,
  "actorId"    TEXT,
  "action"     TEXT NOT NULL,
  "targetType" TEXT,
  "targetId"   TEXT,
  "ip"         TEXT,
  "detail"     TEXT,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");
CREATE INDEX IF NOT EXISTS "AuditLog_actorId_createdAt_idx" ON "AuditLog"("actorId", "createdAt");
CREATE INDEX IF NOT EXISTS "AuditLog_targetId_idx" ON "AuditLog"("targetId");
CREATE INDEX IF NOT EXISTS "AuditLog_action_createdAt_idx" ON "AuditLog"("action", "createdAt");

-- One report per (reporter, reported member). Post reports have
-- reportedUserId NULL and Postgres keeps NULLs distinct, so this constrains
-- only user-to-user reports. Safe to create: a pre-check found 0 duplicate
-- pairs in the live data.
CREATE UNIQUE INDEX IF NOT EXISTS "Report_reporterId_reportedUserId_key"
  ON "Report"("reporterId", "reportedUserId");

-- RLS: match the posture set for every other table on 2026-08-20 (enabled with
-- no policies, so PostgREST's anon/authenticated roles get nothing while the
-- owner connection Prisma uses is exempt).
ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;
