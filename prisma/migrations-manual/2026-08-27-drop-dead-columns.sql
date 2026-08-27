-- Five columns nothing reads, and the index that existed only for one of them
-- (refactor audit 1, data-layer-03 + data-layer-07). Two of them have carried a
-- schema comment promising "a future cleanup migration" since July; this is it.
--
-- What each one is, and what removing it costs:
--
--   User.openTo       0 non-NULL. Retired by owner call 2026-07-30.
--   Photo.blurhash    0 non-NULL. An LQIP slot; nothing ever generated one.
--   Photo.originalUrl 0 non-NULL, and NOT the full-size download. The Collection
--                     viewer's Download button saves Photo.url, which is the
--                     stored original -- src/lib/image-cdn.ts says so in its
--                     header. This column was a second, always-empty promise of
--                     the same thing, read only by three defensive purge sites
--                     that could never see a value.
--   Post.tag          5 rows, all 'campus-memory'. Post types were abandoned by
--                     owner call 2026-08-02 and no surface has shown a tag
--                     since. The five were written by
--                     scripts/dev/seed-curated-content.ts, which no longer sets
--                     the field.
--   Group.visibility  13 rows: 9 'public', 4 'private'. Written with three
--                     constants and read by NOTHING -- no select, no where, no
--                     orderBy. Groups are no longer user-facing; a Group row now
--                     survives only as the membership container under a
--                     Catch-up, so the public/private distinction describes a
--                     browsing experience that does not exist.
--
-- The owner approved all five on 2026-08-27 with these counts in front of him
-- ("these are all useless you can drop"), and every doomed row is in
-- .backups/2026-08-27-phase6-pre-drop-snapshot.json (gitignored, real member
-- data, kept until he says otherwise).
--
-- Group_visibility_createdAt_idx goes with the column it leads on; Postgres
-- would refuse to leave a btree pointing at a dropped column anyway, but naming
-- it here is what stops a later reader wondering where it went.
--
-- ORDER MATTERS AND THIS FILE IS THE SECOND HALF: the fields came out of
-- schema.prisma first, and this may only run once a build without them is live.
-- See 2026-08-27-drop-nextauth-adapter-tables.sql for why that is an outage and
-- not a warning.
--
-- Idempotent, per CLAUDE.md: never `prisma db push` against this database.
-- Apply: node scripts/dev/run-sql.mjs prisma/migrations-manual/2026-08-27-drop-dead-columns.sql
--   and: node scripts/dev/run-sql.mjs --env .env.demo prisma/migrations-manual/2026-08-27-drop-dead-columns.sql

ALTER TABLE "User"  DROP COLUMN IF EXISTS "openTo";
ALTER TABLE "Photo" DROP COLUMN IF EXISTS "blurhash";
ALTER TABLE "Photo" DROP COLUMN IF EXISTS "originalUrl";
ALTER TABLE "Post"  DROP COLUMN IF EXISTS "tag";

DROP INDEX IF EXISTS "Group_visibility_createdAt_idx";
ALTER TABLE "Group" DROP COLUMN IF EXISTS "visibility";
