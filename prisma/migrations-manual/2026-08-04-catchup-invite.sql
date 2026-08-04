-- =============================================================================
-- Shareable invite links for a Catch-up (2026-08-04).
--
-- One stable bearer token per Catch-up: the Keeper copies the link and sends it
-- however they already talk to these people. Anyone holding it can join, which
-- is what a share link IS; the token is the secret, so it must not be derivable
-- from the Catch-up id (which is already in the URL of every page).
--
-- Physical table is "CatchupSeries": the Prisma model is `Catchup` but it is
-- @@map-ed away from the dead legacy "Catchup" table left by the reverted build
-- (see the collision note in prisma/schema.prisma).
--
-- Additive, idempotent; safe to run twice. Run via:
--   node scripts/dev/run-sql.mjs prisma/migrations-manual/2026-08-04-catchup-invite.sql
-- (`prisma db push` is still blocked by the legacy Catchup* tables, bugs.md #11.)
-- =============================================================================

ALTER TABLE "CatchupSeries" ADD COLUMN IF NOT EXISTS "inviteToken" TEXT;

-- Backfill every existing Catch-up with its own token. md5 of random() plus the
-- statement clock rather than anything derived from the row: a token you can
-- work out from the id would let any member of any Catch-up mint a link to
-- someone else's. The unique index below is the real guarantee against a
-- collision; at 32 hex characters one is not going to happen.
UPDATE "CatchupSeries"
   SET "inviteToken" = md5(random()::text || clock_timestamp()::text || id)
 WHERE "inviteToken" IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "CatchupSeries_inviteToken_key"
    ON "CatchupSeries" ("inviteToken");
