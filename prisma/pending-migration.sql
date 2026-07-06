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

-- Unblocks house-per-year history collected in the post-signup onboarding
-- wizard's "Houses" step (src/components/onboarding/steps/houses-step.tsx).
-- Stored as a JSON string ([{ "year": 2003, "house": "Krishna" }, ...]) until
-- a real HouseYear child table lands; the onboarding server action probes
-- for this column and falls back to localStorage when it is absent, so
-- adding it here is all this migration needs to do.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "houses" TEXT;

-- SECTION 2 (required): Catch-ups tables --------------------------------------
-- Six brand-new empty tables for the Catch-ups feature. New names on purpose:
-- they do not collide with the dead CatchupIssue/CatchupQuestion tables left by
-- the old reverted build, so nothing here depends on Section 3.
--
-- IMPORTANT (found 2026-07-05 via live introspection): the old reverted build
-- ALSO left physical "Catchup" and "CatchupPref" tables behind with columns
-- that do NOT match this schema (legacy Catchup has "creatorId" not
-- "createdById"; legacy CatchupPref has "optedOut boolean" not
-- "reminderMode"). Naming the tables below "Catchup"/"CatchupPref" would be a
-- silent no-op against those legacy tables (CREATE TABLE IF NOT EXISTS sees
-- them and does nothing) and the app would keep reading/writing the wrong
-- columns. So this section creates "CatchupSeries" / "CatchupReminderPref"
-- instead; the Prisma models are still named Catchup/CatchupPref via
-- `@@map(...)` in schema.prisma, so no app code changes. See
-- docs/spec/catchups.md section 6 for the full writeup.

CREATE TABLE IF NOT EXISTS "CatchupSeries" (
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

CREATE TABLE IF NOT EXISTS "CatchupReminderPref" (
  "id"           TEXT PRIMARY KEY,
  "catchupId"    TEXT NOT NULL,
  "userId"       TEXT NOT NULL,
  "reminderMode" TEXT NOT NULL DEFAULT 'all'
);

CREATE UNIQUE INDEX IF NOT EXISTS "CatchupSeries_groupId_key"           ON "CatchupSeries" ("groupId");
CREATE INDEX        IF NOT EXISTS "CatchupSeries_status_nextOpensAt_idx" ON "CatchupSeries" ("status", "nextOpensAt");
CREATE UNIQUE INDEX IF NOT EXISTS "CatchupEdition_catchupId_number_key" ON "CatchupEdition" ("catchupId", "number");
CREATE INDEX        IF NOT EXISTS "CatchupEdition_status_publishAt_idx" ON "CatchupEdition" ("status", "publishAt");
CREATE INDEX        IF NOT EXISTS "CatchupPrompt_editionId_position_idx" ON "CatchupPrompt" ("editionId", "position");
CREATE UNIQUE INDEX IF NOT EXISTS "CatchupEntry_promptId_authorId_key"  ON "CatchupEntry" ("promptId", "authorId");
CREATE INDEX        IF NOT EXISTS "CatchupEntry_editionId_idx"          ON "CatchupEntry" ("editionId");
CREATE UNIQUE INDEX IF NOT EXISTS "CatchupEntryLove_userId_entryId_key" ON "CatchupEntryLove" ("userId", "entryId");
CREATE UNIQUE INDEX IF NOT EXISTS "CatchupReminderPref_catchupId_userId_key" ON "CatchupReminderPref" ("catchupId", "userId");

DO $$ BEGIN
  ALTER TABLE "CatchupSeries" ADD CONSTRAINT "CatchupSeries_groupId_fkey"
    FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "CatchupSeries" ADD CONSTRAINT "CatchupSeries_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "CatchupEdition" ADD CONSTRAINT "CatchupEdition_catchupId_fkey"
    FOREIGN KEY ("catchupId") REFERENCES "CatchupSeries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
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
  ALTER TABLE "CatchupReminderPref" ADD CONSTRAINT "CatchupReminderPref_catchupId_fkey"
    FOREIGN KEY ("catchupId") REFERENCES "CatchupSeries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "CatchupReminderPref" ADD CONSTRAINT "CatchupReminderPref_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- SECTION 3 (optional, DESTRUCTIVE): drop the dead tables ---------------------
-- Leftovers from the old reverted Catch-ups build: CatchupIssue/CatchupQuestion
-- (the two originally flagged) PLUS Catchup/CatchupPref/CatchupAnswer/
-- CatchupAnswerLove (found in the 2026-07-05 introspection above; Catchup has
-- 3 rows, CatchupAnswer has 22, the rest are empty). Section 2 above no longer
-- touches any of these six (it uses CatchupSeries/CatchupReminderPref
-- instead), so nothing depends on this section. Dropping them also makes
-- `prisma db push` usable again for future schema changes. Run when you are
-- comfortable; check for content worth preserving first. Uncomment to run:
--
-- DROP TABLE IF EXISTS "CatchupQuestion" CASCADE;
-- DROP TABLE IF EXISTS "CatchupIssue" CASCADE;
-- DROP TABLE IF EXISTS "CatchupAnswerLove" CASCADE;
-- DROP TABLE IF EXISTS "CatchupAnswer" CASCADE;
-- DROP TABLE IF EXISTS "CatchupPref" CASCADE;
-- DROP TABLE IF EXISTS "Catchup" CASCADE;
