-- =============================================================================
-- Contribution table for the Razorpay checkout on /support (2026-08-05),
-- replacing the static UPI QR panel.
--
-- One row per attempt to chip in, written before the payer sees the Razorpay
-- modal. "razorpayOrderId" is UNIQUE because it is the idempotency key: the
-- browser success callback and the webhook both confirm the same order, and
-- exactly one of them may win.
--
-- Additive, idempotent; safe to run twice. Run via:
--   node scripts/dev/run-sql.mjs prisma/migrations-manual/2026-08-05-contributions.sql
-- (`prisma db push` is still blocked by the legacy Catchup* tables, bugs.md #11.)
-- =============================================================================

CREATE TABLE IF NOT EXISTS "Contribution" (
  "id"                TEXT PRIMARY KEY,
  "userId"            TEXT,
  "amount"            INTEGER NOT NULL,               -- paise
  "currency"          TEXT NOT NULL DEFAULT 'INR',
  "status"            TEXT NOT NULL DEFAULT 'created',-- created | paid | failed
  "razorpayOrderId"   TEXT NOT NULL,
  "razorpayPaymentId" TEXT,
  "method"            TEXT,
  "failureReason"     TEXT,
  "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "paidAt"            TIMESTAMP(3),
  "updatedAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "Contribution_razorpayOrderId_key"
  ON "Contribution" ("razorpayOrderId");
CREATE INDEX IF NOT EXISTS "Contribution_status_createdAt_idx"
  ON "Contribution" ("status", "createdAt");
CREATE INDEX IF NOT EXISTS "Contribution_userId_idx"
  ON "Contribution" ("userId");

-- ON DELETE SET NULL: closing an account must never delete the record of its
-- money. Guarded because ADD CONSTRAINT has no IF NOT EXISTS in Postgres.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Contribution_userId_fkey'
  ) THEN
    ALTER TABLE "Contribution"
      ADD CONSTRAINT "Contribution_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
