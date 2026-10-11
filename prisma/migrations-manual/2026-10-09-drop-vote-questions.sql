-- ╔═══════════════════════════════════════════════════════════════════════════╗
-- ║  NOT APPLIED. DO NOT RUN THIS YET.                                        ║
-- ╚═══════════════════════════════════════════════════════════════════════════╝
--
-- Drops the vote feature's table and column. The CODE that named them is gone
-- as of 2026-10-09, but the code that is gone is gone only in this checkout:
-- production is still running the deployed build that selects
-- "CatchupEntry"."pollOptionId" in submitEntry's upsert. Dropping the column
-- before that build is replaced makes every answer save fail.
--
-- SO THE ORDER IS, AND THERE IS NO SHORTCUT:
--
--   1. The owner pushes the removal commit. Both Vercel projects autodeploy.
--   2. The deploy goes green and /catchups is confirmed working.
--   3. THEN run this, against BOTH databases (TRAPS: the demo drifts):
--        node scripts/dev/run-sql.mjs prisma/migrations-manual/2026-10-09-drop-vote-questions.sql
--        node scripts/dev/run-sql.mjs --env .env.demo prisma/migrations-manual/2026-10-09-drop-vote-questions.sql
--
-- Dropping is the owner's call and the push is his. Nothing here is urgent:
-- an unread column costs nothing but a line in the schema.
--
-- WHY IT IS BEING DROPPED. The owner, 2026-10-09, verbatim: "no need to vote.
-- let's ditch that. I don't like it particularly cause it takes up real estate
-- in the UI and I don't think anyone's gonna use it." Build phase 13 was
-- plumbed and drawn and never wired to a screen, so nothing ever wrote a row.
-- Commits 6e663ba5 and 7f36fea9 hold the whole feature if it is wanted back,
-- and 2026-09-14-vote-questions.sql is the migration this one reverses.
--
-- MEASURED EMPTY, 2026-10-09, before this file was written:
--
--   production    CatchupPromptOption                 0 rows
--                 CatchupEntry.pollOptionId NOT NULL  0 of 141 answers
--                 CatchupPrompt.category = 'vote'     0 of 23 questions
--   demo          all three                           0
--
-- So there is no data to migrate and nothing to back up. If a count above is
-- no longer zero when this runs, STOP: somebody wired a screen to it after
-- all, and the guards below will refuse rather than destroy their rows.
--
-- Idempotent: every statement is IF EXISTS, so a second run is a no-op.

BEGIN;

-- ─── the guards ──────────────────────────────────────────────────────────────
-- Refuse rather than destroy. A vote cast between the measurement above and
-- this run means the feature came back, and this file is then wrong.
DO $$
DECLARE
  n bigint;
BEGIN
  IF to_regclass('"CatchupPromptOption"') IS NOT NULL THEN
    SELECT count(*) INTO n FROM "CatchupPromptOption";
    IF n > 0 THEN
      RAISE EXCEPTION
        'CatchupPromptOption holds % row(s); somebody is using votes. Not dropping.', n;
    END IF;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'CatchupEntry'
      AND column_name = 'pollOptionId'
  ) THEN
    EXECUTE 'SELECT count(*) FROM "CatchupEntry" WHERE "pollOptionId" IS NOT NULL' INTO n;
    IF n > 0 THEN
      RAISE EXCEPTION
        'CatchupEntry holds % vote(s). Not dropping.', n;
    END IF;
  END IF;
END $$;

-- ─── the drops ───────────────────────────────────────────────────────────────
-- The column first: it carries the composite foreign key INTO the table, so
-- taking it first means the table drop needs no CASCADE and cannot reach
-- anything it was not meant to. Its index goes with it.
ALTER TABLE "CatchupEntry" DROP COLUMN IF EXISTS "pollOptionId";

-- The table. Its own foreign key to CatchupPrompt, its two unique indexes and
-- its primary key go with it; nothing else references it.
DROP TABLE IF EXISTS "CatchupPromptOption";

-- ─── proof ───────────────────────────────────────────────────────────────────
SELECT
  to_regclass('"CatchupPromptOption"') IS NULL AS table_gone,
  NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'CatchupEntry'
      AND column_name = 'pollOptionId'
  ) AS column_gone;

COMMIT;
