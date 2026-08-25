-- One OPEN report per person per post, held by the database.
--
-- `Report` already carries a unique on (reporterId, reportedUserId), which was
-- meant to be this rule. It is not: a POST report leaves reportedUserId NULL,
-- and Postgres treats NULLs as distinct, so that index constrains
-- member-to-member reports and nothing else.
--
-- reportPost enforced the rule in application code instead -- a findFirst for
-- an existing pending report, then a create. Under READ COMMITTED neither
-- transaction sees the other's uncommitted insert, so two submissions landing
-- together (a double tap, a retried request, two tabs) both pass the check and
-- both write: two Report rows, two AdminThreads, two admin notifications. One
-- person repeating themselves looks like a pattern of them, which is the exact
-- effect audit M29 set out to stop and which survived it (audit C-060).
--
-- PARTIAL, and that is the whole reason this is possible. The M29 comment
-- declined a unique index because the live table already holds duplicate rows
-- from before the rule existed, and adding a full constraint would mean
-- deleting moderation records to make room. This one covers only PENDING post
-- reports, so history is untouched: a dismissed or acted-on duplicate stays
-- exactly where it is, and the post going wrong again is genuinely new
-- information that files a fresh report.
--
-- Checked live before writing: zero (reporterId, postId) duplicates exist
-- among pending post reports in either database, so nothing is broken by
-- adding it.
--
-- NOT expressible in schema.prisma, which has no partial-index syntax. It is
-- therefore invisible to `prisma migrate diff`, and `prisma db push` -- already
-- forbidden against this database -- would drop it. A note beside the Report
-- model says so.
--
-- Idempotent, per CLAUDE.md: never `prisma db push` against this database.
-- Apply: node scripts/dev/run-sql.mjs prisma/migrations-manual/2026-08-25-report-one-open-per-post.sql
--   and: node scripts/dev/run-sql.mjs --env .env.demo prisma/migrations-manual/2026-08-25-report-one-open-per-post.sql

DO $$
DECLARE dupes int;
BEGIN
  -- Re-checked at apply time rather than trusted from the paragraph above: the
  -- CREATE would fail anyway, but it would fail without saying why.
  SELECT count(*) INTO dupes FROM (
    SELECT 1 FROM "Report"
    WHERE "targetType" = 'post' AND status = 'pending' AND "postId" IS NOT NULL
    GROUP BY "reporterId", "postId" HAVING count(*) > 1
  ) d;
  IF dupes > 0 THEN
    RAISE EXCEPTION
      'Refusing: % (reporter, post) pair(s) already hold two OPEN reports. Resolve those first.', dupes;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "Report_open_post_per_reporter_key"
  ON "Report" ("reporterId", "postId")
  WHERE "targetType" = 'post' AND status = 'pending' AND "postId" IS NOT NULL;
