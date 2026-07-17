-- =============================================================================
-- Comment moderation flag (2026-07-18, admin-city lane). Idempotent; safe to
-- run twice. Run via: node scripts/dev/run-sql.mjs prisma/migrations-manual/2026-07-18-comment-hidden.sql
-- (`prisma db push` is still blocked by the legacy Catchup* tables, bugs.md #11.)
-- =============================================================================

-- Soft-hide flag so admins can remove a comment without a hard delete (matches
-- Post.isHidden / Photo.isHidden). Comment had no such flag before this.
ALTER TABLE "Comment" ADD COLUMN IF NOT EXISTS "isHidden" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS "Comment_postId_isHidden_idx" ON "Comment" ("postId", "isHidden");
