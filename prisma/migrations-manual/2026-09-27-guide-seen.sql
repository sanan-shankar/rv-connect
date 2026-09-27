-- User.guideSeenAt: when this member finished (or closed) the first-run tour of the guide.
--
-- Owner, 2026-09-27: members are taken through the guide once, new ones after signing up and the
-- ones already here "the next time they open the URL [...] But only once, make sure that it
-- doesn't happen again and again." On the account rather than in the browser, which is his rule
-- for the Feed's "New since you were last here" marker (feedSeenAt, 2026-08-20). Null means the
-- tour has not run, which is every existing row: that is what sends the ~270 members through it.
-- See docs/spec/guide.md section 5.
--
-- WHEN TO APPLY: BEFORE THE DEPLOY, and before `npx prisma generate` runs against the shared dev
-- server, on BOTH databases. The new build selects the column; the running build never mentions
-- it, so adding it early is harmless.
--
-- IDEMPOTENT: IF NOT EXISTS.
--   node scripts/dev/run-sql.mjs prisma/migrations-manual/2026-09-27-guide-seen.sql
--   node scripts/dev/run-sql.mjs --env .env.demo prisma/migrations-manual/2026-09-27-guide-seen.sql

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "guideSeenAt" TIMESTAMP(3);
