-- Remove the GroupInvite table. The Groups feature it served is gone
-- (refactor audit 1, data-layer-02): zero readers and zero writers in src and
-- scripts, no invite UI anywhere, and the only code that named it was the demo
-- reset wiping a table nothing fills.
--
-- IT IS NOT EMPTY, AND THAT IS THE POINT OF THIS PARAGRAPH. Two rows, both
-- `pending`, both sent by the owner on 2026-07-21 a minute apart, to two
-- different members, in one group. They can never be accepted -- there is no
-- surface that accepts an invite -- so what is lost is two rows recording an
-- intention, not two invitations anyone is waiting on. The owner approved the
-- removal on 2026-08-27 ("these are all useless you can drop") with the count
-- in front of him, and both rows are in
-- .backups/2026-08-27-phase6-pre-drop-snapshot.json (gitignored, real member
-- data, kept until he says otherwise).
--
-- ORDER MATTERS AND THIS FILE IS THE SECOND HALF: the model came out of the
-- schema first, and this may only run once a build without it is live. See
-- 2026-08-27-drop-nextauth-adapter-tables.sql for why that is an outage and not
-- a warning.
--
-- Its three indexes (pkey, groupId+inviteeId unique, inviteeId+status) go with
-- the table; they need no separate statement.
--
-- Idempotent, per CLAUDE.md: never `prisma db push` against this database.
-- Apply: node scripts/dev/run-sql.mjs prisma/migrations-manual/2026-08-27-drop-group-invite.sql
--   and: node scripts/dev/run-sql.mjs --env .env.demo prisma/migrations-manual/2026-08-27-drop-group-invite.sql

-- Refuse if the table has grown since the census: two known rows is a decision
-- the owner made, an unexplained third is not.
DO $$
DECLARE n bigint;
BEGIN
  SELECT count(*) INTO n FROM "GroupInvite";
  IF n > 2 THEN
    RAISE EXCEPTION
      'Refusing: GroupInvite holds % rows, and the owner approved removing 2. Something is writing invites again.', n;
  END IF;
EXCEPTION
  WHEN undefined_table THEN
    RAISE NOTICE 'Already applied; nothing left to count.';
END $$;

DROP TABLE IF EXISTS "GroupInvite";
