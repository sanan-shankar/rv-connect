-- The child-side foreign-key indexes Postgres does not create for you.
--
-- Every "one row per user per thing" rule in this schema is a
-- @@unique([userId, thingId]), which leads with userId -- so it cannot serve
-- the predicate every one of these paths actually runs, which is by thingId.
-- Counting likes on a post, tallying a poll, opening a comment thread, loading
-- a profile's posts, listing a member's photographs: each was a sequential scan
-- of its whole table. Invisible at today's 17 posts; a table scan per request
-- at 2,000 members (bug audit B-090, dossier 4.2).
--
-- Plain CREATE INDEX rather than CONCURRENTLY: run-sql.mjs sends the file as
-- one simple query, which Postgres wraps in an implicit transaction, and
-- CONCURRENTLY cannot run inside one. Every table here is small enough that
-- the brief lock is not worth the ceremony -- the largest is Notification at
-- a few hundred rows.
--
-- Idempotent, per CLAUDE.md: never `prisma db push` against this database.
-- Apply: node scripts/dev/run-sql.mjs prisma/migrations-manual/2026-08-21-hot-fk-indexes.sql

CREATE INDEX IF NOT EXISTS "Like_postId_idx"                 ON "Like" ("postId");
CREATE INDEX IF NOT EXISTS "Comment_parentId_idx"            ON "Comment" ("parentId");
CREATE INDEX IF NOT EXISTS "PollVote_pollOptionId_idx"       ON "PollVote" ("pollOptionId");
CREATE INDEX IF NOT EXISTS "PollVote_postId_idx"             ON "PollVote" ("postId");
CREATE INDEX IF NOT EXISTS "CommentLike_commentId_idx"       ON "CommentLike" ("commentId");
CREATE INDEX IF NOT EXISTS "PhotoLove_photoId_idx"           ON "PhotoLove" ("photoId");
CREATE INDEX IF NOT EXISTS "Bookmark_postId_idx"             ON "Bookmark" ("postId");
CREATE INDEX IF NOT EXISTS "CatchupEntryLove_entryId_idx"    ON "CatchupEntryLove" ("entryId");
CREATE INDEX IF NOT EXISTS "Post_authorId_createdAt_idx"     ON "Post" ("authorId", "createdAt");
CREATE INDEX IF NOT EXISTS "Photo_uploaderId_idx"            ON "Photo" ("uploaderId");
