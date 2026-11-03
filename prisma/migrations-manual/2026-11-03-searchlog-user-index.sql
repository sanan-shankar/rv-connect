-- =============================================================================
-- One index for the search log's per-member daily ceiling (2026-11-03).
--
-- Bug audit 3, C6-04 (an O-09 instance); the owner's answer to Q28 (additive
-- schema changes, "be very careful").
--
--   "SearchLog_userId_createdAt_idx"   logSearch now counts the member's own
--                                      rows of the last 24 hours before it
--                                      writes a new one (the searchRows
--                                      budget, src/lib/daily-budget.ts, 200
--                                      a day). The two indexes the table has
--                                      lead on scope and on createdAt, so
--                                      without this the count would read
--                                      every row of the day.
--
-- Read before, 2026-11-03, both databases: SearchLog carries SearchLog_pkey,
-- SearchLog_scope_createdAt_idx and SearchLog_createdAt_idx and nothing on
-- userId, under this or any other name. 1,004 rows in production (400 kB);
-- the most any member has searched in one day is 13.
--
-- Plain btree, matching its @@index([userId, createdAt]) line in
-- schema.prisma exactly; not one of the expression or partial indexes the
-- schema header warns about. Plain CREATE INDEX, not CONCURRENTLY, which
-- cannot run inside run-sql.mjs's implicit transaction (docs/TRAPS.md); the
-- table is a thousand rows. `lock_timeout` so it gives up rather than queue
-- the search box's writes behind a long one; SET LOCAL is a statement, not
-- the startup parameter Supavisor drops (docs/TRAPS.md).
--
-- Idempotent, safe to run twice. Creates one index and changes no row.
--
-- Apply to BOTH databases (docs/TRAPS.md: the demo drifts):
--   node scripts/dev/run-sql.mjs prisma/migrations-manual/2026-11-03-searchlog-user-index.sql
--   node scripts/dev/run-sql.mjs --env .env.demo prisma/migrations-manual/2026-11-03-searchlog-user-index.sql
-- Read back on each: the name in pg_indexes, valid and ready in pg_index.
-- =============================================================================

BEGIN;
SET LOCAL lock_timeout = '5s';
CREATE INDEX IF NOT EXISTS "SearchLog_userId_createdAt_idx" ON "SearchLog" ("userId", "createdAt");
COMMIT;
