-- The verification queues need a timestamp that means what they say it means.
--
-- /admin's worklist orders "X asked to be verified" by `User.updatedAt` ascending
-- ("waited longest first") and prints that same value as when they asked. But
-- `updatedAt` is Prisma's `@updatedAt`, and it moves on EVERY write to the row --
-- including `touchLastSeen`, which stamps `lastSeenAt` from the (main) layout
-- every fifteen minutes of ordinary browsing. So the queue really ordered by
-- "least recently active" and every row read "3m ago" for as long as the person
-- kept the site open, no matter when they actually asked (bug audit M04).
--
-- `verifyStateAt` records when `verifyState` last changed. NOT NULL with a
-- default of now(), so:
--   * a brand-new account is stamped at signup, which is when its state
--     ("unverified") genuinely began;
--   * the queues can never meet a NULL and never need a fallback ordering;
--   * there is one rule for every writer to keep -- stamp it whenever you write
--     verifyState -- and the schema comment says so at the column.
--
-- Backfill: verifiedAt where we have it (that IS when the state changed),
-- otherwise updatedAt, otherwise createdAt. At apply time every live row is
-- "verified" with a verifiedAt, so the first branch covers all 52 of them.
--
-- Idempotent, per CLAUDE.md: never `prisma db push` against this database.
-- Apply: node scripts/dev/run-sql.mjs prisma/migrations-manual/2026-08-21-verify-state-at.sql
--   and: node scripts/dev/run-sql.mjs --env .env.demo prisma/migrations-manual/2026-08-21-verify-state-at.sql

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "verifyStateAt" TIMESTAMP(3);

UPDATE "User"
   SET "verifyStateAt" = COALESCE("verifiedAt", "updatedAt", "createdAt")
 WHERE "verifyStateAt" IS NULL;

ALTER TABLE "User" ALTER COLUMN "verifyStateAt" SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "User" ALTER COLUMN "verifyStateAt" SET NOT NULL;

DO $$
DECLARE blank int;
BEGIN
  -- Re-checked at apply time rather than trusted from the paragraph above.
  SELECT count(*) INTO blank FROM "User" WHERE "verifyStateAt" IS NULL;
  IF blank > 0 THEN
    RAISE EXCEPTION 'Refusing: % member row(s) still have no verifyStateAt.', blank;
  END IF;
END $$;
