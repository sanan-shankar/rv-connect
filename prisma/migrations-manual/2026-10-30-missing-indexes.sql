-- =============================================================================
-- Five indexes for lookups that real queries make and nothing served
-- (2026-10-30).
--
-- Bug audit 3: T1-20, T1-21, T1-22, L5-09, L5-10 (phase L and B Lows); the
-- owner's answer to Q28 (additive schema changes, "be very careful").
--
--   "PollOption_postId_idx"       every feed, letters and Saved page loads
--                                 its posts' poll options by postId IN (...)
--                                 (24,977 calls since July in
--                                 pg_stat_statements); a post's delete
--                                 cascades by it too.                 T1-20
--   "Notification_link_idx"       a post's delete, hide or report takedown
--                                 clears its bells by link alone; a Catch-up
--                                 clears its reminders by type + link, or by
--                                 link over a userId list. Five live shapes;
--                                 the link-only ones scan every bell. T1-21
--   "User_createdAt_idx"          the feed rail's "New in the directory",
--                                 newest seven members, on every feed render
--                                 (16,116 calls since July, a scan and a sort
--                                 of every member each time).         T1-22
--   "Comment_authorId_idx"        a member's data export, the account purge,
--                                 the admin merge and the admin person page
--                                 all read comments by author.        L5-09
--   "CatchupEntry_authorId_idx"   the same four for Catch-up answers; authorId
--                                 was only the SECOND column of the
--                                 (promptId, authorId) unique.        L5-10
--
-- Measured before, 2026-10-30, read-only. All five tables are small today, so
-- these are sub-millisecond either way; the indexes are for the size the
-- community is heading to, which is why each one was checked against a query
-- that actually runs. Building each inside a rolled-back transaction first,
-- the planner took four of the five at today's sizes (the rail query went
-- from 0.53 to 0.14 ms); Comment, at 36 rows on one page, still scans, as it
-- should until it grows.
--
-- WHAT THIS FILE DOES *NOT* CREATE, and why.
--   "Visit" ("startedAt") (T7b-10). The planner would use it, but it saves
--   about 0.6 ms of a 3 ms query on an admin-only page, and every presence
--   beat updates its Visit row without HOT (endedAt is indexed: 48,549
--   updates, 5 HOT, since July), so each beat would write one more btree
--   entry. The room's real cost is the per-step regexp the verdict names.
--   "CatchupEntry" ("audioUrl") (T2b-10). Its one reader is a count in
--   submitEntry that the verdict would rather delete, since finalize mints a
--   fresh key per recording; that is track 1's file. If the count stays, the
--   index can follow in a later file.
--
-- One transaction per index, deliberately. run-sql.mjs sends the file as one
-- simple query, which Postgres would otherwise run as ONE implicit
-- transaction holding every table's lock until the last index is built; a
-- writer holding one of these tables and wanting another could then deadlock
-- against it. Plain CREATE INDEX, not CONCURRENTLY, which cannot run inside a
-- transaction at all (docs/TRAPS.md); every table here is a few hundred rows.
-- `lock_timeout`: rather than queue every write to the table behind a long
-- writer, give up after five seconds; run it again later. SET LOCAL is a
-- statement inside the transaction, not the startup parameter Supavisor
-- drops (docs/TRAPS.md).
--
-- Idempotent, safe to run twice. None of the five names exists on either
-- database today, under these or any other names on these columns (read
-- 2026-10-30), and all five are plain btrees matching their @@index lines in
-- schema.prisma exactly -- none is one of the eleven the schema header warns
-- about.
--
-- Apply to BOTH databases (docs/TRAPS.md: the demo drifts):
--   node scripts/dev/run-sql.mjs prisma/migrations-manual/2026-10-30-missing-indexes.sql
--   node scripts/dev/run-sql.mjs --env .env.demo prisma/migrations-manual/2026-10-30-missing-indexes.sql
-- Read back on each: the five names in pg_indexes, valid in pg_index.
-- =============================================================================

BEGIN;
SET LOCAL lock_timeout = '5s';
CREATE INDEX IF NOT EXISTS "PollOption_postId_idx" ON "PollOption" ("postId");
COMMIT;

BEGIN;
SET LOCAL lock_timeout = '5s';
CREATE INDEX IF NOT EXISTS "Notification_link_idx" ON "Notification" ("link");
COMMIT;

BEGIN;
SET LOCAL lock_timeout = '5s';
CREATE INDEX IF NOT EXISTS "Comment_authorId_idx" ON "Comment" ("authorId");
COMMIT;

BEGIN;
SET LOCAL lock_timeout = '5s';
CREATE INDEX IF NOT EXISTS "CatchupEntry_authorId_idx" ON "CatchupEntry" ("authorId");
COMMIT;

BEGIN;
SET LOCAL lock_timeout = '5s';
CREATE INDEX IF NOT EXISTS "User_createdAt_idx" ON "User" ("createdAt");
COMMIT;
