-- Remove the three NextAuth adapter tables. They belong to the adapter, and the
-- adapter is gone (refactor audit 1, dependency-diet-04 = data-layer-01).
--
-- Why they were never used, written once so nobody re-derives it: src/lib/auth.ts
-- sets `strategy: "jwt"` explicitly and the only provider is Credentials.
-- @auth/core reaches an adapter from exactly four places -- OAuth account
-- linking, the email provider's VerificationToken flow, WebAuthn, and database
-- sessions -- and this app has none of them. The proof is in the data rather
-- than the reasoning: 63 members have been signing in for months and all three
-- tables hold ZERO rows. Revocation here is User.credentialVersion (audits
-- M4/M5/H4), never a Session row.
--
-- ORDER MATTERS AND THIS FILE IS THE SECOND HALF. The models and the adapter
-- came out of the code first; this may only run once a build without them is
-- LIVE. One Supabase database serves production and local dev, and Prisma names
-- every column of every model explicitly in its SELECT list, so a table removed
-- under a running old build is an outage rather than a warning. Prisma never
-- touches a table it has no model for, so the gap between the deploy and this
-- file is free safety margin -- take it.
--
-- Idempotent, per CLAUDE.md: never `prisma db push` against this database.
-- Apply: node scripts/dev/run-sql.mjs prisma/migrations-manual/2026-08-27-drop-nextauth-adapter-tables.sql
--   and: node scripts/dev/run-sql.mjs --env .env.demo prisma/migrations-manual/2026-08-27-drop-nextauth-adapter-tables.sql

-- Refuse rather than destroy. The census said empty, but the census was taken on
-- a different day; if a row has appeared since, something started using these and
-- this file's whole premise is wrong. The EXCEPTION arm is what keeps the file
-- idempotent: on a second run the tables are already gone and there is nothing
-- to count.
DO $$
DECLARE n bigint;
BEGIN
  SELECT
    (SELECT count(*) FROM "Account")
  + (SELECT count(*) FROM "Session")
  + (SELECT count(*) FROM "VerificationToken")
  INTO n;
  IF n > 0 THEN
    RAISE EXCEPTION
      'Refusing: the NextAuth adapter tables hold % row(s). They were empty when this was written; find out what wrote them before removing them.', n;
  END IF;
EXCEPTION
  WHEN undefined_table THEN
    RAISE NOTICE 'Already applied; nothing left to count.';
END $$;

DROP TABLE IF EXISTS "Account";
DROP TABLE IF EXISTS "Session";
DROP TABLE IF EXISTS "VerificationToken";
