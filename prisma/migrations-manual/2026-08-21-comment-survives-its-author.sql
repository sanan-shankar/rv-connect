-- A purged account must not break other members' threads.
--
-- `Comment.authorId` was `ON DELETE CASCADE`, so deleting an account removed
-- every comment that member had ever written. The self-referencing `parentId`
-- FK is `ON DELETE SET NULL`, so every reply anybody ELSE had written under one
-- of those comments lost its parent and was silently promoted to a top-level
-- comment -- a stray sentence with no question above it, in somebody else's
-- thread. That is exactly the corruption the soft delete on `deletedAt` was
-- built to prevent, and the schema comment there says so in as many words; the
-- purge path re-introduced it wholesale (bug audit M34).
--
-- The fix is the same shape `AdminMessage.authorId` already uses: nullable, and
-- SET NULL rather than CASCADE. `purgeUserAccount` now deletes every comment
-- nothing hangs off and blanks the few that are still holding somebody else's
-- reply, and those survive the account row as authorless anchors -- which is
-- precisely what the reader already renders for a deleted parent with living
-- replies. No personal data survives either way: the words are blanked and the
-- authorship is detached.
--
-- The column is only made NULLABLE here. No existing row becomes null, because
-- nothing writes a null author: the value arrives only from a future purge.
--
-- Idempotent, per CLAUDE.md: never `prisma db push` against this database.
-- Apply: node scripts/dev/run-sql.mjs prisma/migrations-manual/2026-08-21-comment-survives-its-author.sql
--   and: node scripts/dev/run-sql.mjs --env .env.demo prisma/migrations-manual/2026-08-21-comment-survives-its-author.sql

ALTER TABLE "Comment" ALTER COLUMN "authorId" DROP NOT NULL;

-- Prisma names this constraint `Comment_authorId_fkey`. Dropping and recreating
-- is the only way to change ON DELETE, and IF EXISTS makes the pair idempotent.
ALTER TABLE "Comment" DROP CONSTRAINT IF EXISTS "Comment_authorId_fkey";

ALTER TABLE "Comment"
  ADD CONSTRAINT "Comment_authorId_fkey"
  FOREIGN KEY ("authorId") REFERENCES "User"(id)
  ON DELETE SET NULL ON UPDATE CASCADE;

DO $$
DECLARE rule text;
DECLARE orphans int;
BEGIN
  -- Re-checked at apply time rather than trusted from the paragraph above.
  SELECT confdeltype INTO rule
    FROM pg_constraint
   WHERE conname = 'Comment_authorId_fkey' AND conrelid = '"Comment"'::regclass;
  IF rule IS DISTINCT FROM 'n' THEN
    RAISE EXCEPTION 'Comment_authorId_fkey is not ON DELETE SET NULL (confdeltype=%).', rule;
  END IF;

  -- Nothing should have become authorless by running this.
  SELECT count(*) INTO orphans FROM "Comment" WHERE "authorId" IS NULL;
  IF orphans > 0 THEN
    RAISE EXCEPTION 'Refusing: % comment(s) already have no author.', orphans;
  END IF;
END $$;
