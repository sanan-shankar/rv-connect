-- A question the group votes on (build phase 13, spec.md 3.11).
--
-- His, 2026-09-09: "F2. Yes, sure." And 2026-09-14, answer 37, the default:
-- whoever writes the question writes two to six choices; members pick one and
-- cannot add their own.
--
-- ONE TABLE AND ONE COLUMN.
--
--   CatchupPromptOption   a vote's fixed choices, written in the same
--                         transaction as the question and never afterwards
--   CatchupEntry.pollOptionId
--                         the pick. A vote IS an answer, so the existing
--                         unique on ("promptId", "authorId") is one vote per
--                         member per question, with no new constraint
--
-- THE GUARD THAT MATTERS IS A COMPOSITE FOREIGN KEY. The pick references
-- ("id", "promptId") on the choices, not "id" alone, so a vote naming another
-- question's choice is refused by Postgres even if the action's own check were
-- ever deleted. A NULL pick is not checked (MATCH SIMPLE), which is every
-- answer that is not a vote. The unique index on ("id", "promptId") exists only
-- to be that key's target.
--
-- CASCADE, NOT SET NULL, on the pick. A choice only disappears with its
-- question (nothing edits choices), and a question already takes its answers
-- with it. If one ever went alone, a vote pointing at nothing is not an answer,
-- and nulling the pick would leave an empty row, the one audit Low 36 deleted.
--
-- The caps (two to six choices, 80 characters each) are NOT in the database:
-- they are constants in src/lib/vote-question-rule.ts, and a second copy here
-- would drift from them.
--
-- WHEN TO APPLY: SAFE BEFORE THE DEPLOY. A new table nothing reads and a
-- nullable column nothing writes; the foreign key holds on every existing row,
-- where the pick is NULL. Purely additive, nothing dropped.
--
-- IDEMPOTENT: IF NOT EXISTS throughout, the key added only when missing, and
-- enabling RLS a second time is a no-op.
--
-- APPLY TO BOTH PROJECTS: production and the demo are separate Supabase
-- projects, and the demo's reader selects from CatchupEntry too.
--   node scripts/dev/export-catchups.mjs --write        (spec 3.1, first)
--   node scripts/dev/run-sql.mjs prisma/migrations-manual/2026-09-14-vote-questions.sql
--   node scripts/dev/run-sql.mjs --env .env.demo prisma/migrations-manual/2026-09-14-vote-questions.sql

CREATE TABLE IF NOT EXISTS "CatchupPromptOption" (
  "id"       TEXT    NOT NULL,
  "promptId" TEXT    NOT NULL,
  "text"     TEXT    NOT NULL,
  "position" INTEGER NOT NULL,
  CONSTRAINT "CatchupPromptOption_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CatchupPromptOption_promptId_fkey" FOREIGN KEY ("promptId")
    REFERENCES "CatchupPrompt"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "CatchupPromptOption_promptId_position_key"
  ON "CatchupPromptOption"("promptId", "position");
CREATE UNIQUE INDEX IF NOT EXISTS "CatchupPromptOption_id_promptId_key"
  ON "CatchupPromptOption"("id", "promptId");

-- Every public table has RLS on (2026-08-20-enable-rls.sql): the app reaches
-- Postgres as the table owner, and PostgREST's anon role must see nothing.
ALTER TABLE "CatchupPromptOption" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "CatchupEntry" ADD COLUMN IF NOT EXISTS "pollOptionId" TEXT;

CREATE INDEX IF NOT EXISTS "CatchupEntry_pollOptionId_promptId_idx"
  ON "CatchupEntry"("pollOptionId", "promptId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'CatchupEntry_pollOptionId_promptId_fkey'
       AND conrelid = '"CatchupEntry"'::regclass
  ) THEN
    ALTER TABLE "CatchupEntry"
      ADD CONSTRAINT "CatchupEntry_pollOptionId_promptId_fkey"
      FOREIGN KEY ("pollOptionId", "promptId")
      REFERENCES "CatchupPromptOption"("id", "promptId")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('"CatchupPromptOption"') IS NULL THEN
    RAISE EXCEPTION 'CatchupPromptOption was not created; refusing to report success.';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_name = 'CatchupEntry' AND column_name = 'pollOptionId'
  ) THEN
    RAISE EXCEPTION 'CatchupEntry.pollOptionId is missing; refusing to report success.';
  END IF;
END $$;

SELECT (SELECT count(*) FROM "CatchupPromptOption")                          AS choices,
       (SELECT count(*) FROM "CatchupEntry" WHERE "pollOptionId" IS NOT NULL) AS votes,
       (SELECT relrowsecurity FROM pg_class WHERE oid = '"CatchupPromptOption"'::regclass) AS rls;
