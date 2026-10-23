-- The trivia gate, written down (docs/spec/admin.md §9.11).
--
-- His, 2026-10-23: "I want to know what people are typing in, which questions
-- people don't like, which questions people like." The gate kept nothing: the
-- answer was judged and dropped. Two tables:
--
--   TriviaEvent   one row per thing that happened at the gate (a question
--                 shown, skipped, answered right or wrong, an "I don't know",
--                 a refusal by the attempt limit), with what was typed.
--                 Written by src/lib/trivia-log.ts, production only.
--   TriviaAnswer  answers the owner accepted from /admin/trivia, on top of
--                 the bank in src/lib/trivia-bank.ts.
--
-- TriviaEvent.userId is SET NULL on delete, not CASCADE: a deleted member's
-- answers stop being theirs and stay in the counts as anybody's.
-- TriviaAnswer.addedById has no foreign key, like AuditLog.actorId.
--
-- WHEN TO APPLY: SAFE BEFORE THE DEPLOY. New tables nothing on the running
-- build reads. Purely additive.
--
-- IDEMPOTENT: IF NOT EXISTS throughout; RLS enabling is a no-op a second time.
--
-- APPLY TO BOTH PROJECTS: the demo never writes either table (signup and
-- /admin are closed there, and trivia-log.ts refuses in demo mode), but the
-- retention sweep's new step deletes from TriviaEvent, so it must exist.
--   node scripts/dev/run-sql.mjs prisma/migrations-manual/2026-10-23-trivia-gate-log.sql
--   node scripts/dev/run-sql.mjs --env .env.demo prisma/migrations-manual/2026-10-23-trivia-gate-log.sql

CREATE TABLE IF NOT EXISTS "TriviaEvent" (
  "id"         TEXT         NOT NULL,
  "browserId"  TEXT         NOT NULL,
  "questionId" TEXT         NOT NULL,
  "kind"       TEXT         NOT NULL,
  "answer"     TEXT,
  "how"        TEXT,
  "matched"    TEXT,
  "device"     TEXT,
  "country"    TEXT,
  "userId"     TEXT,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TriviaEvent_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TriviaEvent_userId_fkey" FOREIGN KEY ("userId")
    REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "TriviaEvent_createdAt_idx" ON "TriviaEvent"("createdAt");
CREATE INDEX IF NOT EXISTS "TriviaEvent_browserId_idx" ON "TriviaEvent"("browserId");

CREATE TABLE IF NOT EXISTS "TriviaAnswer" (
  "id"         TEXT         NOT NULL,
  "questionId" TEXT         NOT NULL,
  "answer"     TEXT         NOT NULL,
  "typed"      TEXT         NOT NULL,
  "addedById"  TEXT,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TriviaAnswer_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "TriviaAnswer_questionId_answer_key"
  ON "TriviaAnswer"("questionId", "answer");

-- Every public table has RLS on (2026-08-20-enable-rls.sql): the app reaches
-- Postgres as the table owner, and PostgREST's anon role must see nothing.
ALTER TABLE "TriviaEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TriviaAnswer" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF to_regclass('"TriviaEvent"') IS NULL OR to_regclass('"TriviaAnswer"') IS NULL THEN
    RAISE EXCEPTION 'The trivia tables were not created; refusing to report success.';
  END IF;
END $$;

SELECT (SELECT count(*) FROM "TriviaEvent") AS trivia_events,
       (SELECT count(*) FROM "TriviaAnswer") AS trivia_answers,
       (SELECT relrowsecurity FROM pg_class WHERE oid = '"TriviaEvent"'::regclass) AS events_rls,
       (SELECT relrowsecurity FROM pg_class WHERE oid = '"TriviaAnswer"'::regclass) AS answers_rls;
