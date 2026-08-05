-- =============================================================================
-- Real-money flag on Contribution (2026-08-05), added before the first live
-- Razorpay key was used.
--
-- This database serves production AND local dev, and a Razorpay test order is
-- indistinguishable from a live one by its ids alone. Without this column a
-- developer clicking Contribute on localhost writes a row that looks exactly
-- like a real contribution. Set from the key prefix ("rzp_live_" vs
-- "rzp_test_") server-side, never from the client.
--
-- Defaults to false, which is the safe direction: the table was empty when
-- this ran, and a test row miscounted as real would inflate a public figure.
--
-- Additive, idempotent; safe to run twice. Run via:
--   node scripts/dev/run-sql.mjs prisma/migrations-manual/2026-08-05-contribution-livemode.sql
-- (`prisma db push` is still blocked by the legacy Catchup* tables, bugs.md #11.)
-- =============================================================================

ALTER TABLE "Contribution"
  ADD COLUMN IF NOT EXISTS "livemode" BOOLEAN NOT NULL DEFAULT false;
