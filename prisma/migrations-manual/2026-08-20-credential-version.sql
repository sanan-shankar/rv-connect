-- Audit M4 / H4 / M6: a revocation primitive for JWT sessions.
--
-- Sessions are JWTs with no server-side store, so nothing could end one early.
-- This column is copied into the token at sign-in and compared on every session
-- read; bumping it invalidates every token already issued for that account.
--
-- Idempotent, and safe to run against the live database: adding a NOT NULL
-- column WITH a default is a metadata-only change in Postgres 11+, so it does
-- not rewrite the table or take a long lock. Existing rows read 0, and every
-- token in the wild was minted without the claim, which the session callback
-- treats as 0 -- so nobody is signed out by this migration landing.
ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "credentialVersion" INTEGER NOT NULL DEFAULT 0;
