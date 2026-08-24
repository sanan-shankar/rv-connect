-- A refund is not always the whole gift.
--
-- The webhook's refund branch moved the WHOLE row to status='refunded' on any
-- refund.processed, and nothing anywhere read the refund's own amount: the
-- WebhookPayment type modelled only the payment entity. Since every money sum
-- in the app filters status='paid', ₹100 handed back on a ₹5,000 contribution
-- erased the entire ₹5,000 -- from the public recovery bar on /support, from
-- "Given, all time", from the month tile, and from the member's own perk
-- ledger, where the paid sum could drop below the ₹500 floor over a token
-- partial refund (audit C-087). One text field in the Razorpay dashboard.
--
-- Two columns:
--
--   refundedAmount  paise handed back so far. A partial refund leaves the row
--                   on 'paid' and lands here; every sum now reads
--                   amount - refundedAmount. Only a refund covering the whole
--                   amount still moves the row to 'refunded'.
--
--   reversalIds     the Razorpay refund/dispute ids already folded into
--                   refundedAmount. Razorpay retries any delivery it did not
--                   2xx and the dashboard has a Resend button, so without this
--                   a re-delivered refund.processed would subtract the same
--                   paise twice.
--
-- Backfill: rows already reversed carry their full amount, so the record is
-- complete rather than only correct going forward. They are excluded from
-- every sum by status anyway, so this changes no total.
--
-- Idempotent, per CLAUDE.md: never `prisma db push` against this database.
-- Apply: node scripts/dev/run-sql.mjs prisma/migrations-manual/2026-08-24-contribution-partial-refund.sql
--   and: node scripts/dev/run-sql.mjs --env .env.demo prisma/migrations-manual/2026-08-24-contribution-partial-refund.sql

DO $$
DECLARE
  backfilled int;
BEGIN
  ALTER TABLE "Contribution"
    ADD COLUMN IF NOT EXISTS "refundedAmount" INTEGER NOT NULL DEFAULT 0;

  ALTER TABLE "Contribution"
    ADD COLUMN IF NOT EXISTS "reversalIds" TEXT[] NOT NULL DEFAULT '{}';

  UPDATE "Contribution"
     SET "refundedAmount" = amount
   WHERE status IN ('refunded', 'disputed')
     AND "refundedAmount" = 0;
  GET DIAGNOSTICS backfilled = ROW_COUNT;

  RAISE NOTICE 'Contribution: partial-refund columns present; % already-reversed row(s) backfilled.', backfilled;

  -- Re-checked at apply time rather than trusted from the paragraph above: no
  -- row may claim more money back than it ever took.
  IF EXISTS (SELECT 1 FROM "Contribution" WHERE "refundedAmount" > amount) THEN
    RAISE EXCEPTION 'Refusing: a Contribution has refundedAmount greater than its amount.';
  END IF;
END $$;
