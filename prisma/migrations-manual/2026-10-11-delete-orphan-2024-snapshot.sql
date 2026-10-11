-- The orphaned "Batch of 2024" snapshot group, deleted.
--
-- WHERE IT CAME FROM. A 2024 alumnus made their batch's Catch-up by hand
-- through /catchups/new on 2026-08-23, which always mints a NEW group, so the
-- Catch-up sat on a snapshot of the batch while the real batch group had none.
-- Build phase 4 (2026-09-08-batch-catchups.sql) healed the memberships,
-- asserted the subset relation and re-pointed `CatchupSeries.groupId` at the
-- real group. This is the second half of that migration, left until the
-- re-point had been live for a month.
--
-- HIS WORD, 2026-10-09, answering question 45 ("the leftover group ... delete
-- it or not"): "45 figure out what it's like now. it might be gone already.
-- tidy up if not."
--
-- MEASURED THE SAME DAY, immediately before this ran: 11 members, 0 Catch-ups,
-- and 0 of those members missing from the real batchYear=2024 group. So this
-- deletes 11 duplicate membership rows and nobody loses access to anything.
--
-- WHAT IT CANNOT DO. Only `GroupMember` and `CatchupSeries` carry a foreign key
-- to `Group`, so a group with no Catch-up has nothing but memberships hanging
-- off it, and `GroupMember` cascades. Nothing else in the schema points here.
--
-- IDEMPOTENT: a second run finds no row and says so. It REFUSES rather than
-- deletes if the group has since acquired a Catch-up, a batch year, or a member
-- who is not in the real batch -- any of which would mean it is no longer the
-- inert leftover this was authorised for.
--
-- SAFE BEFORE OR AFTER ANY DEPLOY: no code names this id.
--   node scripts/dev/run-sql.mjs prisma/migrations-manual/2026-10-11-delete-orphan-2024-snapshot.sql
-- The demo is a separate project and has no batch groups; running it there is a
-- no-op by the same guard.

DO $$
DECLARE
  snapshot_id CONSTANT text := 'cmt5ru8bb000004lausdv5vvl';
  strays int;
  series int;
  year int;
  gone int;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM "Group" WHERE id = snapshot_id) THEN
    RAISE NOTICE 'The snapshot group is already gone. Nothing to do.';
    RETURN;
  END IF;

  SELECT count(*) INTO series FROM "CatchupSeries" WHERE "groupId" = snapshot_id;
  IF series > 0 THEN
    RAISE EXCEPTION 'The snapshot group now has % Catch-up(s). Refusing: it is not the leftover any more.', series;
  END IF;

  SELECT "batchYear" INTO year FROM "Group" WHERE id = snapshot_id;
  IF year IS NOT NULL THEN
    RAISE EXCEPTION 'The snapshot group now carries batchYear %. Refusing: it has become a real batch group.', year;
  END IF;

  SELECT count(*) INTO strays
    FROM "GroupMember" s
   WHERE s."groupId" = snapshot_id
     AND NOT EXISTS (
           SELECT 1 FROM "GroupMember" r
             JOIN "Group" rg ON rg.id = r."groupId"
            WHERE rg."batchYear" = 2024 AND r."userId" = s."userId"
         );
  IF strays > 0 THEN
    RAISE EXCEPTION '% member(s) of the snapshot are not in the real Batch of 2024. Refusing: deleting it would cut them off.', strays;
  END IF;

  DELETE FROM "Group" WHERE id = snapshot_id;
  GET DIAGNOSTICS gone = ROW_COUNT;
  RAISE NOTICE 'Deleted % snapshot group and its duplicate memberships.', gone;
END $$;

SELECT (SELECT count(*) FROM "Group" WHERE id = 'cmt5ru8bb000004lausdv5vvl') AS snapshot_left,
       (SELECT count(*) FROM "Group" WHERE "batchYear" = 2024)               AS real_2024_groups,
       (SELECT count(*) FROM "GroupMember" m JOIN "Group" g ON g.id = m."groupId" WHERE g."batchYear" = 2024) AS real_2024_members;
