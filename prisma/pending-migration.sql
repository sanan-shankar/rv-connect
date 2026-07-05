-- =============================================================================
-- RUN ME ONCE: paste this whole file into the Supabase SQL editor and run it.
-- (Supabase dashboard -> your project -> SQL Editor -> New query -> paste -> Run)
--
-- Written 2026-07-05. Two sections are required, one is optional.
-- Everything in sections 1 and 2 is additive and idempotent: safe to run twice,
-- touches no existing data, and the deployed app is unaffected until the new
-- code ships.
-- =============================================================================

-- SECTION 1 (required): secondary city ----------------------------------------
-- Unblocks the primary + secondary city feature (primary shown everywhere).

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "secondaryCity" TEXT;

-- SECTION 2 (required): Catch-ups tables --------------------------------------
-- Six brand-new empty tables for the Catch-ups feature. New names on purpose:
-- they do not collide with the dead CatchupIssue/CatchupQuestion tables left by
-- the old reverted build, so nothing here depends on Section 3.

CREATE TABLE IF NOT EXISTS "Catchup" (
  "id"          TEXT PRIMARY KEY,
  "groupId"     TEXT NOT NULL,
  "createdById" TEXT,
  "title"       TEXT,
  "intro"       TEXT,
  "cadence"     TEXT NOT NULL DEFAULT 'monthly',
  "status"      TEXT NOT NULL DEFAULT 'active',
  "nextOpensAt" TIMESTAMP(3),
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "CatchupEdition" (
  "id"               TEXT PRIMARY KEY,
  "catchupId"        TEXT NOT NULL,
  "number"           INTEGER NOT NULL,
  "theme"            TEXT,
  "status"           TEXT NOT NULL DEFAULT 'collecting',
  "questionsCloseAt" TIMESTAMP(3),
  "answersCloseAt"   TIMESTAMP(3),
  "publishAt"        TIMESTAMP(3),
  "publishedAt"      TIMESTAMP(3),
  "remindersSent"    INTEGER NOT NULL DEFAULT 0,
  "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "CatchupPrompt" (
  "id"        TEXT PRIMARY KEY,
  "editionId" TEXT NOT NULL,
  "authorId"  TEXT NOT NULL,
  "text"      TEXT NOT NULL,
  "category"  TEXT,
  "source"    TEXT NOT NULL DEFAULT 'member',
  "showAsker" BOOLEAN NOT NULL DEFAULT true,
  "accepted"  BOOLEAN NOT NULL DEFAULT false,
  "position"  INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "CatchupEntry" (
  "id"        TEXT PRIMARY KEY,
  "editionId" TEXT NOT NULL,
  "promptId"  TEXT NOT NULL,
  "authorId"  TEXT NOT NULL,
  "body"      TEXT,
  "images"    TEXT,
  "songUrl"   TEXT,
  "songTitle" TEXT,
  "songArt"   TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "CatchupEntryLove" (
  "id"      TEXT PRIMARY KEY,
  "userId"  TEXT NOT NULL,
  "entryId" TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS "CatchupPref" (
  "id"           TEXT PRIMARY KEY,
  "catchupId"    TEXT NOT NULL,
  "userId"       TEXT NOT NULL,
  "reminderMode" TEXT NOT NULL DEFAULT 'all'
);

CREATE UNIQUE INDEX IF NOT EXISTS "Catchup_groupId_key"                 ON "Catchup" ("groupId");
CREATE INDEX        IF NOT EXISTS "Catchup_status_nextOpensAt_idx"      ON "Catchup" ("status", "nextOpensAt");
CREATE UNIQUE INDEX IF NOT EXISTS "CatchupEdition_catchupId_number_key" ON "CatchupEdition" ("catchupId", "number");
CREATE INDEX        IF NOT EXISTS "CatchupEdition_status_publishAt_idx" ON "CatchupEdition" ("status", "publishAt");
CREATE INDEX        IF NOT EXISTS "CatchupPrompt_editionId_position_idx" ON "CatchupPrompt" ("editionId", "position");
CREATE UNIQUE INDEX IF NOT EXISTS "CatchupEntry_promptId_authorId_key"  ON "CatchupEntry" ("promptId", "authorId");
CREATE INDEX        IF NOT EXISTS "CatchupEntry_editionId_idx"          ON "CatchupEntry" ("editionId");
CREATE UNIQUE INDEX IF NOT EXISTS "CatchupEntryLove_userId_entryId_key" ON "CatchupEntryLove" ("userId", "entryId");
CREATE UNIQUE INDEX IF NOT EXISTS "CatchupPref_catchupId_userId_key"    ON "CatchupPref" ("catchupId", "userId");

DO $$ BEGIN
  ALTER TABLE "Catchup" ADD CONSTRAINT "Catchup_groupId_fkey"
    FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "Catchup" ADD CONSTRAINT "Catchup_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "CatchupEdition" ADD CONSTRAINT "CatchupEdition_catchupId_fkey"
    FOREIGN KEY ("catchupId") REFERENCES "Catchup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "CatchupPrompt" ADD CONSTRAINT "CatchupPrompt_editionId_fkey"
    FOREIGN KEY ("editionId") REFERENCES "CatchupEdition"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "CatchupPrompt" ADD CONSTRAINT "CatchupPrompt_authorId_fkey"
    FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "CatchupEntry" ADD CONSTRAINT "CatchupEntry_editionId_fkey"
    FOREIGN KEY ("editionId") REFERENCES "CatchupEdition"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "CatchupEntry" ADD CONSTRAINT "CatchupEntry_promptId_fkey"
    FOREIGN KEY ("promptId") REFERENCES "CatchupPrompt"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "CatchupEntry" ADD CONSTRAINT "CatchupEntry_authorId_fkey"
    FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "CatchupEntryLove" ADD CONSTRAINT "CatchupEntryLove_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "CatchupEntryLove" ADD CONSTRAINT "CatchupEntryLove_entryId_fkey"
    FOREIGN KEY ("entryId") REFERENCES "CatchupEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "CatchupPref" ADD CONSTRAINT "CatchupPref_catchupId_fkey"
    FOREIGN KEY ("catchupId") REFERENCES "Catchup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "CatchupPref" ADD CONSTRAINT "CatchupPref_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- SECTION 3 (optional, DESTRUCTIVE): drop the two dead tables -----------------
-- These are leftovers from the old reverted Catch-ups build (14 junk rows).
-- Nothing references them. Dropping them also makes `prisma db push` usable
-- again for future schema changes. Run when you are comfortable; nothing above
-- depends on it. Uncomment to run:
--
-- DROP TABLE IF EXISTS "CatchupQuestion" CASCADE;
-- DROP TABLE IF EXISTS "CatchupIssue" CASCADE;
