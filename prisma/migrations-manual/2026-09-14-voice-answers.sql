-- A question you answer out loud (build phase 12, spec.md 3.10).
--
-- His, 2026-09-09: "You can just answer your question by talking and it plays
-- back ... the audio." And 2026-09-14, answer 32: "32 is 2 minutes."
--
-- THREE COLUMNS ON CatchupEntry. An out-loud answer is an ordinary answer with
-- a recording attached, so the magazine, the export and every read path keep
-- working with no branch:
--
--   audioUrl      the recording, `audio/<authorId>/<yyyy>/<mm>/<cuid>.<ext>` in
--                 the bucket, stored exactly as the browser made it
--   audioSeconds  its length, so the player can draw before the file loads
--   audioIsAuto   the body was transcribed by the browser, not typed
--
-- ONE CHECK: a url and a length arrive together or not at all. A recording with
-- no length draws a player that does not know how long it is, and a length with
-- no recording is a number describing nothing. `audioSeconds > 0` rides along.
-- The two-minute cap is NOT in the database: it is one constant in
-- src/lib/voice-answer-rule.ts, and a second copy here would drift from it.
--
-- WHEN TO APPLY: SAFE BEFORE THE DEPLOY. Nullable columns and a false default
-- that nothing on the running build reads or writes; the check holds on every
-- existing row, where both are NULL. Purely additive, nothing dropped.
--
-- IDEMPOTENT: ADD COLUMN IF NOT EXISTS, and the constraint is added only when
-- it is missing.
--
-- APPLY TO BOTH PROJECTS: production and the demo are separate Supabase
-- projects, and the demo's reader selects from this table too.
--   node scripts/dev/export-catchups.mjs --write        (spec 3.1, first)
--   node scripts/dev/run-sql.mjs prisma/migrations-manual/2026-09-14-voice-answers.sql
--   node scripts/dev/run-sql.mjs --env .env.demo prisma/migrations-manual/2026-09-14-voice-answers.sql

ALTER TABLE "CatchupEntry" ADD COLUMN IF NOT EXISTS "audioUrl"     TEXT;
ALTER TABLE "CatchupEntry" ADD COLUMN IF NOT EXISTS "audioSeconds" INTEGER;
ALTER TABLE "CatchupEntry" ADD COLUMN IF NOT EXISTS "audioIsAuto"  BOOLEAN NOT NULL DEFAULT false;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'CatchupEntry_audio_pair'
       AND conrelid = '"CatchupEntry"'::regclass
  ) THEN
    ALTER TABLE "CatchupEntry"
      ADD CONSTRAINT "CatchupEntry_audio_pair" CHECK (
        ("audioUrl" IS NULL AND "audioSeconds" IS NULL)
        OR ("audioUrl" IS NOT NULL AND "audioSeconds" IS NOT NULL AND "audioSeconds" > 0)
      );
  END IF;
END $$;

DO $$
BEGIN
  IF (SELECT count(*) FROM information_schema.columns
       WHERE table_name = 'CatchupEntry'
         AND column_name IN ('audioUrl', 'audioSeconds', 'audioIsAuto')) <> 3 THEN
    RAISE EXCEPTION 'CatchupEntry is missing a recording column; refusing to report success.';
  END IF;
END $$;

SELECT count(*)                                   AS entries,
       count(*) FILTER (WHERE "audioUrl" IS NOT NULL) AS with_recording,
       count(*) FILTER (WHERE "audioIsAuto")      AS transcribed
  FROM "CatchupEntry";
