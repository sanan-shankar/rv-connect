-- =============================================================================
-- A report outlives the member who filed it (2026-10-30).
--
-- Bug audit 3, T7a-01; the owner's answers to Q1 and Q28, 2026-10-29.
--
-- "Report"."reporterId" was NOT NULL with a foreign key ON DELETE RESTRICT, so
-- a member who had ever filed a report could not be deleted while those rows
-- existed. The account purge and the admin merge therefore deleted every
-- report the member had filed, pending ones included, before deleting them:
-- a complaint left the queue the day its author left, and a reported member's
-- history shrank, while the privacy page promises that reports outlive
-- deletion. This makes the column nullable and the key ON DELETE SET NULL,
-- the shape "Comment"."authorId" and "AdminMessage"."authorId" already have.
-- A null reporter is drawn as "A member who has since left".
--
-- No row changes and nothing is removed. Every reporterId names a live
-- account today (the RESTRICT guaranteed it), so the new key validates. Both
-- unique indexes on the table, "Report_reporterId_reportedUserId_key" and the
-- partial "Report_open_post_per_reporter_key", treat NULLs as distinct
-- (neither is NULLS NOT DISTINCT; read live on both databases 2026-10-30), so
-- a SET NULL can never collide on either.
--
-- Idempotent, safe to run twice. DROP NOT NULL is a no-op on a nullable
-- column. The key is found by what it IS, the one-column foreign key from
-- "reporterId" to "User", not by its name, and then recreated under Prisma's
-- name: both databases call it "Report_reporterId_fkey" today (ON UPDATE
-- CASCADE ON DELETE RESTRICT, read 2026-10-30), but a database that had
-- drifted to another name would otherwise keep its RESTRICT key beside the
-- new one, and the RESTRICT would still win.
--
-- `lock_timeout`: the key's triggers live on "User" too, so this briefly
-- locks it. Waiting behind a long writer would queue every sign-in behind
-- this statement; five seconds, then fail and roll back, is the better
-- trade. SET LOCAL is a statement inside the transaction, not the startup
-- parameter Supavisor drops (docs/TRAPS.md).
--
-- Apply to BOTH databases (docs/TRAPS.md: the demo drifts):
--   node scripts/dev/run-sql.mjs prisma/migrations-manual/2026-10-30-report-outlives-reporter.sql
--   node scripts/dev/run-sql.mjs --env .env.demo prisma/migrations-manual/2026-10-30-report-outlives-reporter.sql
-- Read back on each: reporterId is_nullable = YES in information_schema.columns,
-- and the one foreign key from "reporterId" says ON DELETE SET NULL.
-- =============================================================================

BEGIN;

SET LOCAL lock_timeout = '5s';

ALTER TABLE "Report" ALTER COLUMN "reporterId" DROP NOT NULL;

DO $$
DECLARE
  fk record;
BEGIN
  FOR fk IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_attribute att
      ON att.attrelid = con.conrelid AND att.attnum = con.conkey[1]
    WHERE con.conrelid = '"Report"'::regclass
      AND con.contype = 'f'
      AND con.confrelid = '"User"'::regclass
      AND array_length(con.conkey, 1) = 1
      AND att.attname = 'reporterId'
  LOOP
    EXECUTE format('ALTER TABLE "Report" DROP CONSTRAINT %I', fk.conname);
  END LOOP;
END $$;

ALTER TABLE "Report"
  ADD CONSTRAINT "Report_reporterId_fkey"
  FOREIGN KEY ("reporterId") REFERENCES "User"("id")
  ON UPDATE CASCADE ON DELETE SET NULL;

COMMIT;
