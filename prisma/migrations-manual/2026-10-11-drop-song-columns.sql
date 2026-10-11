-- The dead song columns, dropped. **NOT APPLIED. DO NOT RUN THIS YET.**
--
-- WHEN IT MAY RUN: only once the commit that stopped reading these columns is
-- LIVE on both Vercel projects, which needs a push, which is his. One Supabase
-- database serves production and local dev, so dropping a column while the
-- deployed build still selects it breaks Catch-ups for everybody. That is the
-- whole reason this is a second file and not part of the code change.
--
-- WHAT IS DROPPED, and why each is dead:
--   CatchupEntry.songUrl / songTitle / songArt
--     Null on every row in the database. The songs question used to resolve a
--     Spotify link into these three; since build phase 10 a pasted link becomes
--     a LinkPreview card instead, wherever it is pasted, which is what he asked
--     for in brief 50. His word, 2026-10-09: "remove songs."
--   CatchupReminderPref.deletedAt
--     The 30-day bin, deleted in build phase 5 when deleting a Catch-up became
--     LEAVING it. The column has been unread since; the model dropped it then.
--
-- NOT DROPPED, and it must not be: `CatchupEdition.publishAt`. A time capsule
-- is exactly a scheduled publish date and it is that column (spec 3.12). It was
-- on phase 11's original list and was taken off on 2026-09-09.
--
-- IDEMPOTENT: IF EXISTS throughout. Safe to re-run.
--
-- APPLY TO BOTH PROJECTS, production and the demo:
--   node scripts/dev/run-sql.mjs prisma/migrations-manual/2026-10-11-drop-song-columns.sql
--   node scripts/dev/run-sql.mjs --env .env.demo prisma/migrations-manual/2026-10-11-drop-song-columns.sql
--
-- BEFORE IT RUNS: re-run the Catch-ups export (spec 3.1), as every migration
-- in this campaign does. These columns are null everywhere, so the export loses
-- nothing, but the habit is the point.

DO $$
DECLARE
  with_song int;
BEGIN
  -- A row carrying a song would mean something started writing these again,
  -- and dropping them would destroy it. Refuse instead.
  SELECT count(*) INTO with_song
    FROM "CatchupEntry"
   WHERE "songUrl" IS NOT NULL OR "songTitle" IS NOT NULL OR "songArt" IS NOT NULL;
  IF with_song > 0 THEN
    RAISE EXCEPTION '% answer(s) still carry a song. Refusing: these columns are not dead after all.', with_song;
  END IF;
END $$;

ALTER TABLE "CatchupEntry"        DROP COLUMN IF EXISTS "songUrl";
ALTER TABLE "CatchupEntry"        DROP COLUMN IF EXISTS "songTitle";
ALTER TABLE "CatchupEntry"        DROP COLUMN IF EXISTS "songArt";
ALTER TABLE "CatchupReminderPref" DROP COLUMN IF EXISTS "deletedAt";

SELECT count(*) FILTER (WHERE table_name = 'CatchupEntry'        AND column_name LIKE 'song%')  AS song_columns_left,
       count(*) FILTER (WHERE table_name = 'CatchupReminderPref' AND column_name = 'deletedAt') AS deleted_at_left
  FROM information_schema.columns
 WHERE table_name IN ('CatchupEntry', 'CatchupReminderPref');
