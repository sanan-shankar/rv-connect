-- The Groups feature's last schema residue: "Post"."groupId" and its index,
-- plus "Group"."description" and "Group"."coverImage".
--
-- Refactor audit 2, row D6 (`data-layer-01`). The owner's answer to Q18,
-- 2026-09-07: "delete all and stop writing info except to [three named
-- columns]", against a table row reading "Which group a post belongs to
-- (Groups was removed) | 0 of 20".
--
-- Idempotent, per CLAUDE.md: never `prisma db push` against this database.
--
-- *** DO NOT RUN THIS UNTIL THE CODE CHANGE IS DEPLOYED. ***
-- Prisma names every column of a model in its SELECT list, so dropping a
-- column while an older build is still serving traffic is an outage on every
-- feed, letter and profile query. The build that stopped naming these is the
-- commit this file ships in. Deploy first, then run this, then the demo.
-- Running it late costs nothing at all.
--
-- Apply:
--   node scripts/dev/run-sql.mjs prisma/migrations-manual/2026-09-07-drop-groups-residue.sql
--   node scripts/dev/run-sql.mjs --env .env.demo prisma/migrations-manual/2026-09-07-drop-groups-residue.sql
-- Production and the demo are SEPARATE Supabase projects. Both, or the demo
-- drifts (docs/TRAPS.md).
--
-- THE EVIDENCE. Counted 2026-09-07, on both databases:
--
--   SELECT count(*) FILTER (WHERE "groupId" IS NOT NULL) AS group_posts,
--          count(*) AS posts FROM "Post";
--   SELECT count(*) AS groups,
--          count(*) FILTER (WHERE description IS NOT NULL) AS with_description,
--          count(*) FILTER (WHERE "coverImage" IS NOT NULL) AS with_cover
--     FROM "Group";
--
--   production -> group_posts 0 of 20 posts; 18 groups, 11 with a description,
--                 0 with a cover
--   demo       -> group_posts 0 of 0 posts;   1 group,  1 with a description,
--                 0 with a cover
--
-- "Group" ITSELF STAYS, and so do GroupMember and Catchup.groupId. The Group
-- row is the membership container under every people-started Catch-up
-- (catchups/actions.ts) and the batch groups keyed on `batchYear @unique`.
-- Only the three columns below go.
--
-- THE ELEVEN DESCRIPTIONS ARE MACHINE-WRITTEN, which is why this drops them
-- rather than offering to keep them: every one is the sentence signup
-- generates, "Everyone from the batch of <year>.", plus the demo seed's
-- Catch-up intro. Nothing has ever read the column -- no select, no page, no
-- export. If you would rather keep them anyway, delete the two "Group"
-- statements at the foot of this file and leave the columns in place; the code
-- is already indifferent either way.
--
-- "Post_groupId_createdAt_idx" GOES WITH THE COLUMN, automatically. Its 889
-- recorded scans (window open since 2026-05-22) are the six read paths that
-- filtered `groupId: null` on every feed, letters and profile query -- a btree
-- over a column of NULLs, doing work for a predicate that matched every row.
-- Those filters left in the same commit as this file.

-- A guard, not a formality. If a row has picked up a groupId between this file
-- being written and being run, stop rather than delete a post's scoping.
DO $$
DECLARE n bigint;
BEGIN
  SELECT count(*) INTO n FROM "Post" WHERE "groupId" IS NOT NULL;
  IF n > 0 THEN
    RAISE EXCEPTION 'Refusing to drop: % Post row(s) still carry a groupId', n;
  END IF;
EXCEPTION
  -- Second run: the column is already gone, which is the success case.
  WHEN undefined_column THEN
    RAISE NOTICE 'Post.groupId already dropped; nothing to do.';
END $$;

DROP INDEX IF EXISTS "Post_groupId_createdAt_idx";
ALTER TABLE "Post" DROP COLUMN IF EXISTS "groupId";

ALTER TABLE "Group" DROP COLUMN IF EXISTS "description";
ALTER TABLE "Group" DROP COLUMN IF EXISTS "coverImage";
