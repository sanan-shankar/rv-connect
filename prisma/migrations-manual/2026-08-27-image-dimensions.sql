-- What we know about the bytes at one stored image URL.
--
-- Feed, letter and Catch-up photographs are held as JSON arrays of URL
-- STRINGS, so the app has never known the shape of any of them. That is the
-- root cause under four separate complaints: the page jumps as each photo
-- lands (nothing can reserve the space), a justified row cannot be solved (the
-- algorithm needs every aspect ratio before it starts), a 20,000-image grid
-- cannot be windowed (a scrollbar needs row heights), and a crop cannot be
-- aimed at anything. See docs/planning/collection-rework/spec.md §2.
--
-- Keyed by URL rather than by a foreign key, which is what makes this table
-- safe to add to a live database mid-campaign: no existing row moves, no other
-- table is touched, and a URL with no row here is not an error -- the renderer
-- falls back to today's behaviour for it. So the backfill can run lazily,
-- afterwards, at its own pace.
--
-- Idempotent, per CLAUDE.md: never `prisma db push` against this database.
-- Apply: node scripts/dev/run-sql.mjs prisma/migrations-manual/2026-08-27-image-dimensions.sql
--   and: node scripts/dev/run-sql.mjs --env .env.demo prisma/migrations-manual/2026-08-27-image-dimensions.sql

CREATE TABLE IF NOT EXISTS "Image" (
  -- The public URL, already unique: every stored object gets a fresh cuid
  -- filename. No separate id, because there is nothing an id would buy -- every
  -- lookup this table will ever serve arrives holding the URL and nothing else.
  "url"         TEXT             NOT NULL,
  "width"       INTEGER          NOT NULL,
  "height"      INTEGER          NOT NULL,
  -- Where the interesting part is, 0..1 from the top-left. 0.5/0.5 is "we could
  -- not tell", which is also what a row written before this column existed
  -- would say, so no consumer has to special-case a missing guess.
  "focalX"      DOUBLE PRECISION NOT NULL DEFAULT 0.5,
  "focalY"      DOUBLE PRECISION NOT NULL DEFAULT 0.5,
  "greyscale"   BOOLEAN          NOT NULL DEFAULT false,
  -- A 16px WebP of the image as a data URI, about 160 bytes, shown in the
  -- reserved space while the real photograph arrives.
  "blurDataUrl" TEXT,
  "createdAt"   TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Image_pkey" PRIMARY KEY ("url")
);

-- Row-level security is on for every table in this database (see
-- 2026-08-20-enable-rls.sql). Nothing but the app's own service role ever
-- touches this table, and that role bypasses RLS, so enabling it with no
-- policy is the correct "deny everyone else" position.
ALTER TABLE "Image" ENABLE ROW LEVEL SECURITY;
