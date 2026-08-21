-- A member can hide their email from their profile, or show a different one.
--
-- The profile printed `displayEmail?.trim() || user.email`, so a NULL
-- displayEmail meant "fall back to the sign-in address". That gave the column
-- one value for two different intentions, and the second one had no way to be
-- expressed: removing the email row from the contact sheet wrote NULL, and the
-- profile answered by showing the member's PRIVATE LOGIN ADDRESS to every
-- verified alumnus instead. The X on that row was a privacy control that did
-- the opposite of what it looked like (bug audit B-050). Re-opening the editor
-- then re-seeded the row from the account address, so the removal did not even
-- appear to have stuck.
--
-- `showEmail` separates the two: it says whether to print an address at all,
-- and `displayEmail` says which one when there is one. Default TRUE, so every
-- existing member's profile reads exactly as it does today; this only adds the
-- ability to say no. The sign-in address itself is untouched and stays the
-- login credential.
--
-- Idempotent, per CLAUDE.md: never `prisma db push` against this database.
-- Apply: node scripts/dev/run-sql.mjs prisma/migrations-manual/2026-08-21-profile-show-email.sql

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "showEmail" BOOLEAN NOT NULL DEFAULT true;

DO $$
DECLARE hidden int;
BEGIN
  -- Every existing row must read as it did before: showing an address.
  SELECT count(*) INTO hidden FROM "User" WHERE "showEmail" IS NOT TRUE;
  IF hidden > 0 THEN
    RAISE EXCEPTION
      'Refusing: % existing member(s) would have their email hidden by this migration.', hidden;
  END IF;
END $$;
