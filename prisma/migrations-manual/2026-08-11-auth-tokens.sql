-- =============================================================================
-- AuthToken: the links we email out (2026-08-11).
--
-- Backs two flows that had no server side at all before this: "I forgot my
-- password" and "confirm this address is yours". One row per link sent.
--
-- "tokenHash" is a SHA-256 of the random token and is the ONLY copy we keep;
-- the raw token lives solely in the URL in the person's inbox. A dumped
-- backup or a read-only injection therefore yields no usable reset links,
-- which a plaintext token column would hand over directly. It is UNIQUE
-- because it is also the lookup key: redeeming a link is one indexed read.
--
-- Additive, idempotent; safe to run twice. Run via:
--   node scripts/dev/run-sql.mjs prisma/migrations-manual/2026-08-11-auth-tokens.sql
-- (`prisma db push` stays blocked: the lower() expression indexes on Place /
-- UserPlace are a permanent migrate-diff false positive and a push would
-- silently replace them with plain column indexes. See prisma/schema.prisma.)
-- =============================================================================

CREATE TABLE IF NOT EXISTS "AuthToken" (
  "id"        TEXT PRIMARY KEY,
  "userId"    TEXT NOT NULL,
  "kind"      TEXT NOT NULL,                  -- reset | verify
  "tokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt"    TIMESTAMP(3),
  "sentTo"    TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "AuthToken_tokenHash_key"
  ON "AuthToken" ("tokenHash");
-- The rate-limit read: how many of this kind has this user asked for lately.
CREATE INDEX IF NOT EXISTS "AuthToken_userId_kind_createdAt_idx"
  ON "AuthToken" ("userId", "kind", "createdAt");
-- The sweep read: expired rows are cleared opportunistically when minting.
CREATE INDEX IF NOT EXISTS "AuthToken_expiresAt_idx"
  ON "AuthToken" ("expiresAt");

-- ON DELETE CASCADE: a closed account takes its pending links with it, so a
-- reset mailed minutes before deletion cannot resurrect anything.
-- Guarded because ADD CONSTRAINT has no IF NOT EXISTS in Postgres.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'AuthToken_userId_fkey'
  ) THEN
    ALTER TABLE "AuthToken"
      ADD CONSTRAINT "AuthToken_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- =============================================================================
-- OutboundEmail: the send queue.
--
-- Resend's free plan allows 100 messages a day and launch is expected to push
-- more than 100 signups through on day one, so nothing is mailed inline. Every
-- message is a row here; a drain pass sends what the day's budget allows,
-- lowest `priority` first, and the rest wait for tomorrow.
--
-- No token is stored. The drain mints the AuthToken at the moment it sends, so
-- a confirmation that sits in the queue for two days still arrives with its
-- full 24 hours ahead of it rather than already expired.
-- =============================================================================

CREATE TABLE IF NOT EXISTS "OutboundEmail" (
  "id"        TEXT PRIMARY KEY,
  "userId"    TEXT,
  "to"        TEXT NOT NULL,
  "kind"      TEXT NOT NULL,                    -- verify | reset | password-changed
  "payload"   TEXT,                             -- template inputs as JSON; never a secret
  "priority"  INTEGER NOT NULL DEFAULT 100,     -- lower sends first
  "status"    TEXT NOT NULL DEFAULT 'queued',   -- queued | sending | sent | failed
  "attempts"  INTEGER NOT NULL DEFAULT 0,
  "lastError" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "claimedAt" TIMESTAMP(3),
  "sentAt"    TIMESTAMP(3)
);

-- The drain read: what to send next.
CREATE INDEX IF NOT EXISTS "OutboundEmail_status_priority_createdAt_idx"
  ON "OutboundEmail" ("status", "priority", "createdAt");
-- The budget read: how many have gone out since midnight UTC.
CREATE INDEX IF NOT EXISTS "OutboundEmail_sentAt_idx"
  ON "OutboundEmail" ("sentAt");
-- "Has this person's confirmation actually left yet?"
CREATE INDEX IF NOT EXISTS "OutboundEmail_userId_kind_status_idx"
  ON "OutboundEmail" ("userId", "kind", "status");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'OutboundEmail_userId_fkey'
  ) THEN
    ALTER TABLE "OutboundEmail"
      ADD CONSTRAINT "OutboundEmail_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- Everyone who already has an account predates this feature and must not be
-- locked out of posting by it. Grandfather them as confirmed: the gate is for
-- addresses collected from here on, not a retroactive audit of the members who
-- signed up before it existed.
UPDATE "User"
   SET "emailVerified" = COALESCE("emailVerified", CURRENT_TIMESTAMP)
 WHERE "emailVerified" IS NULL;
