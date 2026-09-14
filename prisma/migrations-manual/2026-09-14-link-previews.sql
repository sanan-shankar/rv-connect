-- Link previews (build phase 10, spec.md 3.8).
--
-- His, brief 50: "the thumbnail thing should work. Whenever they paste a link
-- to a song, right?" And 2026-09-14: "can't you show preview for any link even
-- if they're not songs?"
--
-- ONE TABLE KEYED BY THE URL, the same trick the Collection's `Image` table
-- uses and for the same reason: no migration of existing rows, no writes to
-- `CatchupEntry`, and a row that is missing is not an error -- the link simply
-- prints as an ordinary link until one exists.
--
--   url        the link as normalised by src/lib/link-preview-core.ts
--   kind       "spotify" | "youtube" | "link"
--   title      what the card prints; NULL on a failed resolve
--   subtitle   a YouTube channel, or an ordinary page's site name. Spotify's
--              keyless oembed has no artist and "Spotify" is not one (F33)
--   thumbUrl   the preview image, RE-HOSTED in our own bucket where possible
--   failedAt   set when the resolve found nothing; retried at most once a day
--   fetchedAt  when this row was last written
--
-- No user column and no foreign key, on purpose: a preview describes a public
-- web page, not anybody's writing, so it is shared across every answer that
-- pastes the same link and outlives none of them in any way that matters.
--
-- WHEN TO APPLY: SAFE BEFORE THE DEPLOY. A new table nothing on the running
-- build reads. Purely additive.
--
-- IDEMPOTENT: IF NOT EXISTS throughout; RLS enabling is a no-op a second time.
--
-- APPLY TO BOTH PROJECTS: production and the demo are separate Supabase
-- projects. The demo never RESOLVES a link (link-preview.ts refuses in demo
-- mode), but its reader still reads this table, so it must exist there.
--   node scripts/dev/run-sql.mjs prisma/migrations-manual/2026-09-14-link-previews.sql
--   node scripts/dev/run-sql.mjs --env .env.demo prisma/migrations-manual/2026-09-14-link-previews.sql

CREATE TABLE IF NOT EXISTS "LinkPreview" (
  "url"       TEXT         NOT NULL,
  "kind"      TEXT         NOT NULL,
  "title"     TEXT,
  "subtitle"  TEXT,
  "thumbUrl"  TEXT,
  "failedAt"  TIMESTAMP(3),
  "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LinkPreview_pkey" PRIMARY KEY ("url")
);

-- Every public table has RLS on (2026-08-20-enable-rls.sql): the app reaches
-- Postgres as the table owner, and PostgREST's anon role must see nothing.
ALTER TABLE "LinkPreview" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF to_regclass('"LinkPreview"') IS NULL THEN
    RAISE EXCEPTION 'LinkPreview was not created; refusing to report success.';
  END IF;
END $$;

SELECT count(*) AS link_previews,
       (SELECT relrowsecurity FROM pg_class WHERE oid = '"LinkPreview"'::regclass) AS rls
  FROM "LinkPreview";
