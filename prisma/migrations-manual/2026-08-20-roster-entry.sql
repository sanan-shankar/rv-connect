-- Phase 3 (trust model): the consolidated office roster that auto-verifies a
-- matching signup with verifyMethod 'office_list'. Idempotent, forward-only.
CREATE TABLE IF NOT EXISTS "RosterEntry" (
  "id"             TEXT NOT NULL PRIMARY KEY,
  "fullName"       TEXT NOT NULL,
  "normalizedName" TEXT NOT NULL,
  "email"          TEXT,
  "batchYear"      INTEGER,
  "source"         TEXT NOT NULL,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "RosterEntry_email_idx" ON "RosterEntry"("email");
CREATE INDEX IF NOT EXISTS "RosterEntry_normalizedName_batchYear_idx" ON "RosterEntry"("normalizedName", "batchYear");
