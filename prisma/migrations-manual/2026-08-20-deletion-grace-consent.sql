-- Phase 8 (audit H9, M35, H12): the 60-day deletion grace period and the
-- signup consent record. Forward-only and idempotent; run against BOTH
-- databases (the demo's directory queries filter on deletionRequestedAt, so a
-- missing column there is a P2022 crash -- the Phase 3 lesson).
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "deletionRequestedAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "consentAt" TIMESTAMP(3);
