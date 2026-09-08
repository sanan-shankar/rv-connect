-- Build phase 5 (spec sections 3.6 and 3.9): deleting becomes leaving, and an
-- Edition remembers who has read it.
--
-- His, N18: "defaults, except deleting becomes leaving." So the verb on a
-- people Catch-up is Leave, what you already published STAYS -- other people
-- have read it and replied to it -- and the thirty-day bin goes with the word.
-- Archive is untouched: it is his WhatsApp model (brief 5), "when you archive,
-- you don't see it in your main feed ... And then there's a Put back button,
-- which is right there."
--
-- Apply to BOTH projects, before the commit is pushed:
--   node scripts/dev/run-sql.mjs prisma/migrations-manual/2026-09-08-leaving-and-the-read-mark.sql
--   node scripts/dev/run-sql.mjs --env .env.demo prisma/migrations-manual/2026-09-08-leaving-and-the-read-mark.sql
--
-- COUNTED FIRST, 2026-09-08, on both: 16 preference rows on production and 0
-- on the demo, of which ZERO are archived and ZERO are binned. So the first
-- statement is a no-op today and exists so it cannot become one later -- a
-- member who bins a copy in the hours before this deploys must land in
-- Archived rather than in a bin nothing empties any more.
--
-- Archive is the conservative landing: it never removes a membership behind
-- somebody's back, which is exactly what the bin's thirtieth night did.
--
-- `deletedAt` the COLUMN is NOT dropped here. Column drops wait for the deploy
-- and land in the cleanup file, phase 11 (spec section 3); this commit only
-- stops Prisma naming it. The INDEX goes now, because an index drop has no
-- such ordering -- Prisma never names an index in a query -- and the nightly
-- sweep that was its only reader is deleted in this same commit.

-- 1. Anything in the bin lands in Archived, keeping whichever stamp is older.
UPDATE "CatchupReminderPref"
   SET "archivedAt" = COALESCE("archivedAt", "deletedAt")
 WHERE "deletedAt" IS NOT NULL;

-- 2. The bin's only index. Its one reader was retention.ts's nightly
--    `where deletedAt < cutoff`, which this commit deletes.
DROP INDEX IF EXISTS "CatchupReminderPref_deletedAt_idx";

-- 3. The read mark (spec 3.9). One row per person per Edition, written when
--    the reader is opened. It is what lets an unread Edition look different
--    from a read one on the list and on the home's covers, without anything
--    counting anything -- his standing objection is to counts, not to signals
--    (R32: "you're trying so hard to include useless information").
--
--    A composite primary key rather than a cuid with a unique beside it: the
--    pair IS the identity, there is no second thing to say about it, and a
--    surrogate id here would be a column nothing ever selects.
CREATE TABLE IF NOT EXISTS "CatchupEditionRead" (
  "userId"    TEXT         NOT NULL,
  "editionId" TEXT         NOT NULL,
  "readAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CatchupEditionRead_pkey" PRIMARY KEY ("userId", "editionId")
);

-- Postgres indexes the REFERENCING side of a foreign key for nobody. Deleting
-- an Edition (the cleanup phase removes three throwaway Catch-ups, and an
-- ended Catch-up may be removed later) would otherwise scan this whole table
-- once per row. The user side is already served by the primary key's leading
-- column. Nothing member-facing reads "who has read this", by design.
CREATE INDEX IF NOT EXISTS "CatchupEditionRead_editionId_idx"
  ON "CatchupEditionRead" ("editionId");

DO $$ BEGIN
  ALTER TABLE "CatchupEditionRead" ADD CONSTRAINT "CatchupEditionRead_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "CatchupEditionRead" ADD CONSTRAINT "CatchupEditionRead_editionId_fkey"
    FOREIGN KEY ("editionId") REFERENCES "CatchupEdition"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Row-level security is on for every table in this database (see
-- 2026-08-20-enable-rls.sql). Nothing but the app's own service role touches
-- this table, and that role bypasses RLS, so enabling it with no policy is the
-- correct "deny everyone else" position.
ALTER TABLE "CatchupEditionRead" ENABLE ROW LEVEL SECURITY;

-- 4. Refuse to report success on a half-applied file.
DO $$
DECLARE binned bigint; fks int; rls boolean;
BEGIN
  SELECT count(*) INTO binned FROM "CatchupReminderPref" WHERE "deletedAt" IS NOT NULL AND "archivedAt" IS NULL;
  IF binned > 0 THEN
    RAISE EXCEPTION '% binned copies did not land in Archived; refusing to report success.', binned;
  END IF;

  IF to_regclass('"CatchupEditionRead"') IS NULL THEN
    RAISE EXCEPTION 'CatchupEditionRead was not created; refusing to report success.';
  END IF;

  SELECT count(*) INTO fks FROM pg_constraint
   WHERE conrelid = '"CatchupEditionRead"'::regclass AND contype = 'f';
  IF fks <> 2 THEN
    RAISE EXCEPTION 'CatchupEditionRead has % foreign keys, expected 2; refusing to report success.', fks;
  END IF;

  SELECT relrowsecurity INTO rls FROM pg_class WHERE oid = '"CatchupEditionRead"'::regclass;
  IF NOT rls THEN
    RAISE EXCEPTION 'CatchupEditionRead has row level security off; refusing to report success.';
  END IF;
END $$;
