-- User.announcementSeenAt: when this member's account saw the announcement window that opens once
-- over the Feed (the new birds, the ask for support, the site on a phone). docs/spec/announcement.md.
--
-- The owner asked for it to show once, as the guide's first-run tour does, and never to become a
-- nuisance (2026-10-29). So it is recorded on the account, for the guide's reason (guideSeenAt):
-- once, not once per device. Null means not yet, which is every existing row. A timestamp rather
-- than a flag so a later announcement can reuse the column: the window is due while this is older
-- than the announcement's own date (src/lib/announcement.ts).
--
-- WHEN TO APPLY: BEFORE THE DEPLOY, and before `npx prisma generate` runs against the shared dev
-- server, on BOTH databases. The new build selects the column; the running build never mentions
-- it, so adding it early is harmless.
--
-- IDEMPOTENT: IF NOT EXISTS.
--   node scripts/dev/run-sql.mjs prisma/migrations-manual/2026-10-29-announcement-seen.sql
--   node scripts/dev/run-sql.mjs --env .env.demo prisma/migrations-manual/2026-10-29-announcement-seen.sql

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "announcementSeenAt" TIMESTAMP(3);
