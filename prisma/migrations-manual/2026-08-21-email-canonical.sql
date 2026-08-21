-- One canonical form of an email address, in the data as well as the code.
--
-- User.email is a case-sensitive unique column, and three code paths disagreed
-- about what to put in it: signup stored the address exactly as typed, login
-- looked the raw string up, the reset flow lowercased (bug audit B-020). The
-- code side is fixed in src/lib/email-address.ts; this is the data side.
--
-- Checked read-only before writing this file, on 2026-08-21 against the live
-- database: 52 members, 1 with a capital letter in their stored address
-- (Mishka Katyayan, who consequently could never receive a password reset),
-- and ZERO addresses that collide once lowercased. The guard below re-checks
-- that at apply time rather than trusting this paragraph.
--
-- The unique index on lower(email) is the part that lasts: with it, a future
-- path that forgets to normalize gets a clean unique violation -- which
-- registerUser already answers with "an account with this email already
-- exists" -- instead of quietly creating a second account for one mailbox.
--
-- Idempotent, per CLAUDE.md: never `prisma db push` against this database.
-- Apply: node scripts/dev/run-sql.mjs prisma/migrations-manual/2026-08-21-email-canonical.sql

DO $$
DECLARE collisions int;
BEGIN
  SELECT count(*) INTO collisions FROM (
    SELECT lower(btrim(email)) FROM "User" GROUP BY 1 HAVING count(*) > 1
  ) dup;
  IF collisions > 0 THEN
    RAISE EXCEPTION
      'Refusing to normalize: % address(es) would collide once lowercased. Merge those accounts first.',
      collisions;
  END IF;
END $$;

UPDATE "User"
   SET email = lower(btrim(email))
 WHERE email <> lower(btrim(email));

CREATE UNIQUE INDEX IF NOT EXISTS "User_email_lower_key" ON "User" (lower(email));
