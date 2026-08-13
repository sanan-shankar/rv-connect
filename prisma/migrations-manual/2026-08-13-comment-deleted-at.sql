-- Comment.deletedAt: author's own soft delete (2026-08-13).
-- A deleted comment keeps its row so replies keep their parent; content is
-- blanked by the action at delete time. Idempotent.
ALTER TABLE "Comment" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);
