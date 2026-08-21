-- Deleting one member must not destroy everybody else's writing.
--
-- Two foreign keys were `ON DELETE CASCADE` on a column that records who
-- happened to START something communal:
--
--   Group.creatorId       -- the first alumnus of a batch to sign up owns
--                            "Batch of 2010"; whoever starts a Catch-up owns
--                            its hidden Group. Deleting that one account took
--                            the Group, and the Group took CatchupSeries ->
--                            CatchupEdition -> CatchupPrompt -> CatchupEntry,
--                            i.e. every Round and every other member's answers.
--   CatchupPrompt.authorId -- deleting the person who ASKED a question deleted
--                            the question, and every answer under it.
--
-- Both become nullable with ON DELETE SET NULL, mirroring what
-- CatchupSeries.createdById already does (and what its schema comment already
-- claimed the behaviour was: "nullable so the Catch-up survives if they
-- leave"). A null creator is a group nobody owns; a null asker renders as a
-- member who left. src/lib/account-purge.ts promotes a remaining member to
-- group admin in the same breath, so Keeper powers are never unreachable.
--
-- Idempotent, per CLAUDE.md: never `prisma db push` against this database.
-- Apply: node scripts/dev/run-sql.mjs prisma/migrations-manual/2026-08-21-ownership-survives-deletion.sql

-- ─── Group.creatorId ────────────────────────────────────────────────────────

ALTER TABLE "Group" ALTER COLUMN "creatorId" DROP NOT NULL;

DO $$
BEGIN
  -- Rebuild the constraint only when it is not already SET NULL ('n'), so a
  -- re-run is a no-op rather than a needless table rewrite and lock.
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'Group_creatorId_fkey' AND confdeltype <> 'n'
  ) THEN
    ALTER TABLE "Group" DROP CONSTRAINT "Group_creatorId_fkey";
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Group_creatorId_fkey') THEN
    ALTER TABLE "Group"
      ADD CONSTRAINT "Group_creatorId_fkey"
      FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- ─── CatchupPrompt.authorId ─────────────────────────────────────────────────

ALTER TABLE "CatchupPrompt" ALTER COLUMN "authorId" DROP NOT NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'CatchupPrompt_authorId_fkey' AND confdeltype <> 'n'
  ) THEN
    ALTER TABLE "CatchupPrompt" DROP CONSTRAINT "CatchupPrompt_authorId_fkey";
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CatchupPrompt_authorId_fkey') THEN
    ALTER TABLE "CatchupPrompt"
      ADD CONSTRAINT "CatchupPrompt_authorId_fkey"
      FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
