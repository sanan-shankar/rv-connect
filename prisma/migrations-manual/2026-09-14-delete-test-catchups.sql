-- Delete the three test Catch-ups (build phase 11, the safe half; spec.md 3.2
-- and 9 row 11).
--
-- His, 2026-09-14, answering question 28: "I'm happy for you to simply delete
-- test catch ups." The three are the ones spec.md 3.2 names as throwaways:
--
--   [Recon] the happy path   CatchupSeries cmtomcnwd003zy0sgder33rrl   Group cmtomcnrn003wy0sgif2b7l7z
--   Test                     CatchupSeries cmtqw4vl0000304latsq4fyt4   Group cmtqw4vka000104la4gwix48h
--   testest                  CatchupSeries cmtrg1gqo000204lad871ntq1   Group cmtrg1gpd000004lav8u00rb7
--
-- NOT "test" (lowercase, ended, one member). spec.md 3.2: "`test` ... is his
-- own and stays unless he says otherwise." NOT the orphaned "Batch of 2024"
-- snapshot group (cmt5ru8bb000004lausdv5vvl) either: he authorised the test
-- Catch-ups only, so that one is still a question for him.
--
-- ID-PINNED, not matched by name. A name is something a member can type, and
-- "Test" is exactly the name somebody else might give a real Catch-up.
--
-- WHAT GOES, and how:
--   * The GROUP rows. Each group existed only as this Catch-up's membership
--     container; the only foreign keys into "Group" are GroupMember and
--     CatchupSeries (both ON DELETE CASCADE, measured from
--     information_schema 2026-09-14). Deleting the group takes, by cascade:
--     GroupMember, CatchupSeries -> CatchupEdition, CatchupReminderPref;
--     CatchupEdition -> CatchupPrompt, CatchupEntry, CatchupEditionRead;
--     CatchupEntry -> CatchupEntryLove, Comment (entryId); Comment ->
--     CommentLike.
--   * Notification rows linking at them. `link` is a stored string with no
--     foreign key, so the cascade cannot see it. Matched by PREFIX, the same
--     two shapes `clearCatchupNotifications` in catchups/actions.ts uses:
--     `/catchups/<catchupId>` (the home, and the retired `/answer` path) and
--     `/catchups/edition/<editionId>` (the reader, and `#entry-<id>` anchors on
--     it). The Edition ids are pinned below because after the first run they
--     can no longer be derived from anything.
--   * ContentView rows for their Editions. No foreign key on `targetId`; the
--     schema's reason ("a view of something later deleted is still a true
--     fact") is about real members' interest, and these are the owner's and
--     Jerry's test views of test content, which would otherwise sit in the
--     admin room's Edition view total for ever.
--
-- WHAT STAYS:
--   * LinkPreview. Shared by url, and the one url these answers pasted is also
--     pasted by a second, real answer.
--   * AuditLog. Nothing there names these ids (checked 2026-09-14).
--   * R2 objects. None of these answers carried a photograph (every `images`
--     is NULL), so there is nothing in the bucket to leave behind.
--
-- THE GUARD. Before deleting, the file refuses (RAISE, whole transaction rolls
-- back) if anyone other than the owner or Jerry Maguire holds any row under
-- any of the three: a membership, a question, an answer, a heart, a comment,
-- a comment like, a read mark, a preference or a notification. Those are the
-- only two accounts spec F14 allowed into a throwaway.
--
-- IDEMPOTENT. A second run finds no groups and no matching links and deletes
-- nothing. No DDL.
--
-- APPLY TO BOTH PROJECTS (the demo held none of these on 2026-09-14; it is a
-- no-op there):
--   node scripts/dev/run-sql.mjs prisma/migrations-manual/2026-09-14-delete-test-catchups.sql
--   node scripts/dev/run-sql.mjs --env .env.demo prisma/migrations-manual/2026-09-14-delete-test-catchups.sql

BEGIN;

CREATE TEMP TABLE p11_groups (id text PRIMARY KEY) ON COMMIT DROP;
INSERT INTO p11_groups VALUES
  ('cmtomcnrn003wy0sgif2b7l7z'),
  ('cmtqw4vka000104la4gwix48h'),
  ('cmtrg1gpd000004lav8u00rb7');

CREATE TEMP TABLE p11_links (prefix text PRIMARY KEY) ON COMMIT DROP;
INSERT INTO p11_links VALUES
  ('/catchups/cmtomcnwd003zy0sgder33rrl'),
  ('/catchups/cmtqw4vl0000304latsq4fyt4'),
  ('/catchups/cmtrg1gqo000204lad871ntq1'),
  ('/catchups/edition/cmtsd3iof0004sesg2210saug'),
  ('/catchups/edition/cmtomcnxf0040y0sgqm7iywb1'),
  ('/catchups/edition/cmtqw4vla000404la9wuvg24u'),
  ('/catchups/edition/cmtrg1gr0000304laosunasx7');

CREATE TEMP TABLE p11_editions (id text PRIMARY KEY) ON COMMIT DROP;
INSERT INTO p11_editions VALUES
  ('cmtsd3iof0004sesg2210saug'),
  ('cmtomcnxf0040y0sgqm7iywb1'),
  ('cmtqw4vla000404la9wuvg24u'),
  ('cmtrg1gr0000304laosunasx7');

DO $$
DECLARE
  allowed CONSTANT text[] := ARRAY[
    'cmr1uahuj000004jx4dc4p8co',  -- the owner, sanan.v.shankar@gmail.com
    'cmseq4ys6000t04jr8068e1qs'   -- Jerry Maguire, sanan.shankar@gmail.com
  ];
  strangers text[];
BEGIN
  -- The ids must still mean the Catch-ups they meant when this was written.
  IF EXISTS (
    SELECT 1 FROM "Group" g JOIN p11_groups p ON p.id = g.id
     WHERE g.name NOT IN ('[Recon] the happy path', 'Test', 'testest')
        OR g."batchYear" IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'A pinned group no longer carries its test name, or is a batch group; refusing.';
  END IF;

  SELECT array_agg(DISTINCT u) INTO strangers FROM (
    SELECT m."userId" AS u FROM "GroupMember" m JOIN p11_groups p ON p.id = m."groupId"
    UNION ALL
    SELECT c."createdById" FROM "CatchupSeries" c JOIN p11_groups p ON p.id = c."groupId"
    UNION ALL
    SELECT pr."userId" FROM "CatchupReminderPref" pr
      JOIN "CatchupSeries" c ON c.id = pr."catchupId" JOIN p11_groups p ON p.id = c."groupId"
    UNION ALL
    SELECT q."authorId" FROM "CatchupPrompt" q
      JOIN "CatchupEdition" e ON e.id = q."editionId"
      JOIN "CatchupSeries" c ON c.id = e."catchupId" JOIN p11_groups p ON p.id = c."groupId"
    UNION ALL
    SELECT x."authorId" FROM "CatchupEntry" x
      JOIN "CatchupEdition" e ON e.id = x."editionId"
      JOIN "CatchupSeries" c ON c.id = e."catchupId" JOIN p11_groups p ON p.id = c."groupId"
    UNION ALL
    SELECT r."userId" FROM "CatchupEditionRead" r
      JOIN "CatchupEdition" e ON e.id = r."editionId"
      JOIN "CatchupSeries" c ON c.id = e."catchupId" JOIN p11_groups p ON p.id = c."groupId"
    UNION ALL
    SELECT l."userId" FROM "CatchupEntryLove" l
      JOIN "CatchupEntry" x ON x.id = l."entryId"
      JOIN "CatchupEdition" e ON e.id = x."editionId"
      JOIN "CatchupSeries" c ON c.id = e."catchupId" JOIN p11_groups p ON p.id = c."groupId"
    UNION ALL
    SELECT k."authorId" FROM "Comment" k
      JOIN "CatchupEntry" x ON x.id = k."entryId"
      JOIN "CatchupEdition" e ON e.id = x."editionId"
      JOIN "CatchupSeries" c ON c.id = e."catchupId" JOIN p11_groups p ON p.id = c."groupId"
    UNION ALL
    SELECT kl."userId" FROM "CommentLike" kl
      JOIN "Comment" k ON k.id = kl."commentId"
      JOIN "CatchupEntry" x ON x.id = k."entryId"
      JOIN "CatchupEdition" e ON e.id = x."editionId"
      JOIN "CatchupSeries" c ON c.id = e."catchupId" JOIN p11_groups p ON p.id = c."groupId"
    UNION ALL
    SELECT n."userId" FROM "Notification" n
      WHERE EXISTS (SELECT 1 FROM p11_links pl WHERE n.link LIKE pl.prefix || '%')
    UNION ALL
    SELECT v."viewerId" FROM "ContentView" v
      WHERE v.kind = 'edition' AND v."targetId" IN (SELECT id FROM p11_editions)
  ) s
  WHERE u IS NOT NULL AND NOT (u = ANY (allowed));

  IF strangers IS NOT NULL THEN
    RAISE EXCEPTION 'A test Catch-up holds rows from someone other than the owner or Jerry (%); refusing.', strangers;
  END IF;
END $$;

DELETE FROM "Notification" n
 WHERE EXISTS (SELECT 1 FROM p11_links pl WHERE n.link LIKE pl.prefix || '%');

DELETE FROM "ContentView"
 WHERE kind = 'edition' AND "targetId" IN (SELECT id FROM p11_editions);

DELETE FROM "Group" WHERE id IN (SELECT id FROM p11_groups);

SELECT
  (SELECT count(*) FROM "Group"          WHERE id IN (SELECT id FROM p11_groups))   AS groups_left,
  (SELECT count(*) FROM "CatchupEdition" WHERE id IN (SELECT id FROM p11_editions)) AS editions_left,
  (SELECT count(*) FROM "Notification" n
    WHERE EXISTS (SELECT 1 FROM p11_links pl WHERE n.link LIKE pl.prefix || '%'))   AS bell_links_left;

COMMIT;
