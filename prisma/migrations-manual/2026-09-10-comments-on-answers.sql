-- Comments on a Catch-up answer (build phase 9, spec.md 3.7).
--
-- His, review-2026-09-07 N1: "I feel like the comment section can be done the
-- same way that we do it in feed. I don't know why we're trying to do it in a
-- different way ... I think we can just copy that comment section."
--
-- ONE TABLE, WIDENED, NOT A TWIN. `Comment` already carries CommentLike, the
-- soft-delete-that-keeps-replies rule, the admin hide, the SetNull purge
-- behaviour that stops a purged account taking other members' replies down,
-- and a 700-line reading surface. A CatchupEntryComment twin would need a twin
-- of every one of them. So `postId` relaxes to nullable, a nullable `entryId`
-- arrives beside it, and a CHECK says exactly one of the two is set.
--
-- WHY THE CHECK IS SEPARATE FROM PRISMA: Prisma cannot express it, so this
-- file is the only place it exists. `comment-target-rule.test.mjs` fails if
-- the pair of columns ever appears in the schema without this file enforcing
-- it -- otherwise the day someone widens the model again, a comment with two
-- targets, or none, becomes writable and every count on both features drifts.
--
-- WHEN TO APPLY THIS: SAFE BEFORE THE DEPLOY, and that is the whole reason it
-- is shaped this way. Everything here is additive or a relaxation:
--   * a new nullable column nothing reads yet,
--   * NOT NULL dropped from a column every line of the running build still
--     writes, so the constraint that just went away is one nothing was
--     relying on,
--   * a CHECK that every existing row already satisfies (postId set, entryId
--     null), validated in a second statement so the table is not held under
--     an ACCESS EXCLUSIVE lock while Postgres reads all 200-odd rows.
-- There is no ordering hazard in either direction. Run it whenever.
--
-- IDEMPOTENT: every statement is IF NOT EXISTS or a no-op on a second run.
-- The constraint is guarded by a catalogue lookup because Postgres has no
-- ADD CONSTRAINT IF NOT EXISTS.
--
-- APPLY TO BOTH PROJECTS: production and the demo are separate Supabase
-- projects.
--   node scripts/dev/run-sql.mjs prisma/migrations-manual/2026-09-10-comments-on-answers.sql
--   node scripts/dev/run-sql.mjs --env .env.demo prisma/migrations-manual/2026-09-10-comments-on-answers.sql

ALTER TABLE "Comment" ADD COLUMN IF NOT EXISTS "entryId" text;

ALTER TABLE "Comment" ALTER COLUMN "postId" DROP NOT NULL;

-- The foreign key, matching Prisma's own naming so `prisma migrate diff` sees
-- no drift. Cascade for the same reason `Comment_postId_fkey` cascades: an
-- answer that is gone has nothing left to hang a thread under.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Comment_entryId_fkey'
  ) THEN
    ALTER TABLE "Comment"
      ADD CONSTRAINT "Comment_entryId_fkey"
      FOREIGN KEY ("entryId") REFERENCES "CatchupEntry"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- Exactly one target. NOT VALID first so the ADD takes a brief lock and does
-- not scan; VALIDATE afterwards scans under a weaker lock. Both are no-ops on
-- a second run.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Comment_one_target'
  ) THEN
    ALTER TABLE "Comment"
      ADD CONSTRAINT "Comment_one_target"
      CHECK (("postId" IS NULL) <> ("entryId" IS NULL)) NOT VALID;
  END IF;
END $$;

ALTER TABLE "Comment" VALIDATE CONSTRAINT "Comment_one_target";

CREATE INDEX IF NOT EXISTS "Comment_entryId_createdAt_idx"
  ON "Comment" ("entryId", "createdAt");
