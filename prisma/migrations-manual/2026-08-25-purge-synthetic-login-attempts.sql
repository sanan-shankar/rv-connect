-- Remove the sign-in attempts left behind by security and audit probes.
--
-- Data only: no schema change.
--
-- WHY. The owner opened /admin/analytics -> Joining on 2026-08-25 and read
-- "Still locked out: 1" in red, over a panel that says "worth emailing them
-- directly". Nobody was locked out. The address was
-- phase2-probe-1787166205085@example.invalid: a throwaway the Phase 2 security
-- probe created on 2026-08-19, signed in as, blocked on purpose to prove audit
-- H4 held, and then deleted. The User row went; the LoginAttempt rows stayed,
-- because account-purge.ts clears neither this table nor the userId on it. The
-- "Why sign-ins fail" chart alongside it was counting the same two refusals as
-- real members being turned away.
--
-- Nine rows, five addresses, from three probe runs on 19 and 21 August. All on
-- @example.invalid -- the RFC 2606 reserved domain that can never resolve, so
-- no row deleted here was ever a person and none can be recreated by one.
--
-- The RULE that stops this reading wrong again is in code, not here:
-- loadJourney's locked-out query now LEFT JOINs "User" and drops any address
-- whose attempts point at an account that no longer exists, so a purged
-- member stops being counted as somebody who cannot get in
-- (src/lib/admin-analytics.ts, pinned by src/lib/login-attempt-rule.test.mjs).
-- With that fix in place the tile already reads zero and this file is
-- housekeeping: it takes the noise out of the three totals the join does not
-- touch -- "Sign-in attempts recorded", "Failed this week", and the reason
-- breakdown -- so the numbers on that page are all attempts by real people.
--
-- Retention would not have done it: LoginAttempt is kept 365 days
-- (KEEP_DAYS.securityLogs), so these rows were due to clear in August 2027.
--
-- Idempotent, per CLAUDE.md: never `prisma db push` against this database.
-- Applied to the main database 2026-08-25; a second run is a clean no-op.
-- Apply: node scripts/dev/run-sql.mjs prisma/migrations-manual/2026-08-25-purge-synthetic-login-attempts.sql
--
-- Deliberately NOT run against .env.demo, and this is the one file where that
-- is the right answer rather than the drift CLAUDE.md warns about. The usual
-- reason both databases get every manual file is SCHEMA drift; this one
-- changes no schema, and the demo's "LoginAttempt" table is empty -- zero rows
-- of any kind, checked 2026-08-25 -- because nothing has ever probed it. There
-- is nothing there to delete.

DO $$
DECLARE
  live    int;
  removed int;
BEGIN
  -- The guard, not a formality. This deletes by address pattern, and the one
  -- way that could ever reach a member is if somebody genuinely signed up on
  -- the reserved domain. Refuse rather than guess.
  SELECT count(*) INTO live
  FROM "User"
  WHERE lower(email) LIKE '%@example.invalid';

  IF live > 0 THEN
    RAISE EXCEPTION
      'Refusing: % account(s) exist on @example.invalid, so these attempts are not all synthetic.', live;
  END IF;

  DELETE FROM "LoginAttempt"
  WHERE email LIKE '%@example.invalid';
  GET DIAGNOSTICS removed = ROW_COUNT;

  RAISE NOTICE 'Removed % synthetic sign-in attempt(s).', removed;
END $$;
