-- Delivery state on OutboundEmail, as the provider saw it.
--
-- Until now `status` topped out at "sent", which only ever meant Resend
-- accepted the message from us. Whether it reached a human was invisible.
-- That gap matters most at launch: a few hundred invitations go out at once,
-- and "400 sent" with half of them bouncing off stale addresses or landing in
-- spam looks identical to a clean run.
--
-- Written only by src/app/api/resend/webhook/route.ts. The send path never
-- touches these, except providerId which it fills in at send time so a webhook
-- event has something to join on.
--
-- Idempotent, per CLAUDE.md: never `prisma db push` against this database.
-- Apply with: node scripts/dev/run-sql.mjs prisma/migrations-manual/2026-08-19-email-delivery.sql

ALTER TABLE "OutboundEmail" ADD COLUMN IF NOT EXISTS "providerId"   TEXT;
ALTER TABLE "OutboundEmail" ADD COLUMN IF NOT EXISTS "deliveredAt"  TIMESTAMP(3);
ALTER TABLE "OutboundEmail" ADD COLUMN IF NOT EXISTS "bouncedAt"    TIMESTAMP(3);
ALTER TABLE "OutboundEmail" ADD COLUMN IF NOT EXISTS "bounceKind"   TEXT;
ALTER TABLE "OutboundEmail" ADD COLUMN IF NOT EXISTS "complainedAt" TIMESTAMP(3);

-- The webhook's only read: find the row an event belongs to.
CREATE INDEX IF NOT EXISTS "OutboundEmail_providerId_idx"
  ON "OutboundEmail" ("providerId");
