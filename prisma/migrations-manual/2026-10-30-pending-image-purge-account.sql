-- =============================================================================
-- Each queued file of an erased account says whose it was (2026-10-30).
--
-- Bug audit 3, unit B4, the follow-up to B3b; the owner's answers to Q10 and
-- Q28, 2026-10-29 (he does not want to lose what the admin panel shows him).
--
-- An erasure's audit line used to say how many of the account's stored files
-- storage had removed, because the purge deleted them before writing it.
-- Since B3b the purge only queues them in "PendingImagePurge", the line is
-- written, and the drain removes them after: seconds later for an admin's
-- delete, that night for the sweep, the next night for anything storage
-- refused. So the line can only say "queued", and nothing told the owner when
-- an account's last file was gone. This column names the account each queued
-- row belongs to, so the audit log can read what is left of it from the
-- worklist itself, where a row leaves only once storage has confirmed its
-- object gone.
--
-- A plain nullable text column, not a foreign key: the account row is deleted
-- in the same transaction that queues its files. No row changes: the worklist
-- was empty on production when this was written, and a row queued for any
-- other reason (a post's delete, a merge, the retention sweep) has no account
-- to name and stays as it is.
--
-- Idempotent, safe to run twice (ADD COLUMN IF NOT EXISTS). A nullable column
-- with no default rewrites no stored row. `lock_timeout`: the statement needs
-- the table's lock for a moment; five seconds, then fail and roll back, rather
-- than queue the drain behind a long transaction. SET LOCAL is a statement
-- inside the transaction, not the startup parameter Supavisor drops
-- (docs/TRAPS.md).
--
-- Apply to BOTH databases (docs/TRAPS.md: the demo drifts):
--   node scripts/dev/run-sql.mjs prisma/migrations-manual/2026-10-30-pending-image-purge-account.sql
--   node scripts/dev/run-sql.mjs --env .env.demo prisma/migrations-manual/2026-10-30-pending-image-purge-account.sql
-- Read back on each: "accountId" in information_schema.columns for
-- "PendingImagePurge", data_type text, is_nullable YES.
-- =============================================================================

BEGIN;

SET LOCAL lock_timeout = '5s';

ALTER TABLE "PendingImagePurge" ADD COLUMN IF NOT EXISTS "accountId" TEXT;

COMMIT;
