-- Who could not get in.
--
-- A failed sign-in used to leave no trace anywhere, so the members most likely
-- to need help -- the ones who cannot get through the front door -- were the
-- only ones invisible to every number on the analytics page.
--
-- Never stores a password. The email is stored as typed because "which address
-- did they keep trying" is the question: someone entering the wrong ADDRESS is
-- a different problem from someone entering the wrong PASSWORD, and only the
-- address tells them apart.
--
-- Idempotent, per CLAUDE.md: never `prisma db push` against this database.
-- Apply: node scripts/dev/run-sql.mjs prisma/migrations-manual/2026-08-19-login-attempts.sql

CREATE TABLE IF NOT EXISTS "LoginAttempt" (
  "id"        TEXT         NOT NULL,
  "email"     TEXT         NOT NULL,
  "userId"    TEXT,
  "ok"        BOOLEAN      NOT NULL,
  "reason"    TEXT         NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LoginAttempt_pkey" PRIMARY KEY ("id")
);

-- No foreign key on userId, deliberately: an attempt against an address that
-- matches no account still has to be recorded, and a later account deletion
-- must not erase the evidence that somebody was locked out.
CREATE INDEX IF NOT EXISTS "LoginAttempt_createdAt_idx"        ON "LoginAttempt" ("createdAt");
CREATE INDEX IF NOT EXISTS "LoginAttempt_email_createdAt_idx"  ON "LoginAttempt" ("email", "createdAt");
CREATE INDEX IF NOT EXISTS "LoginAttempt_userId_createdAt_idx" ON "LoginAttempt" ("userId", "createdAt");
