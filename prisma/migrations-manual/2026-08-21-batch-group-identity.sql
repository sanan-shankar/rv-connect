-- One "Batch of {year}" group per batch, enforced rather than hoped for.
--
-- joinBatchGroup was a findFirst-by-name then create, with nothing unique
-- behind it: two members of the same batch registering concurrently both missed
-- the read and both created the group. Every later signup then landed in
-- whichever one the unordered findFirst happened to return, so the batch was
-- permanently split into two groups whose members could not see each other --
-- and launch day is precisely the concurrency spike this needs (bug audit
-- B-121). Live check before writing this: 9 batch groups, no duplicates yet.
--
-- A dedicated column rather than a partial unique on the name: the name is
-- display text, and identity should not be a string somebody could rename.
--
-- The creator is nulled at the same time. A batch group has no keeper -- every
-- member joins as a plain "member", including the first -- so creatorId only
-- ever recorded who happened to sign up first, while making that person's
-- account deletion look like it owned the group.
--
-- Idempotent, per CLAUDE.md: never `prisma db push` against this database.
-- Apply: node scripts/dev/run-sql.mjs prisma/migrations-manual/2026-08-21-batch-group-identity.sql

ALTER TABLE "Group" ADD COLUMN IF NOT EXISTS "batchYear" INTEGER;

UPDATE "Group"
   SET "batchYear" = substring(name from '^Batch of ([0-9]{4})$')::int
 WHERE "batchYear" IS NULL
   AND name ~ '^Batch of [0-9]{4}$';

UPDATE "Group"
   SET "creatorId" = NULL
 WHERE "batchYear" IS NOT NULL
   AND "creatorId" IS NOT NULL;

DO $$
DECLARE dupes int;
BEGIN
  SELECT count(*) INTO dupes FROM (
    SELECT "batchYear" FROM "Group" WHERE "batchYear" IS NOT NULL
     GROUP BY 1 HAVING count(*) > 1
  ) d;
  IF dupes > 0 THEN
    RAISE EXCEPTION
      'Refusing to add the unique: % batch year(s) already have two groups. Merge them first.',
      dupes;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "Group_batchYear_key" ON "Group" ("batchYear");
