-- =============================================================================
-- Round 6 additive migration (2026-07-18). Idempotent; safe to run twice.
-- Run via: node scripts/dev/run-sql.mjs prisma/migrations-manual/2026-07-18-round6.sql
-- (`prisma db push` is still blocked by the legacy Catchup* tables, bugs.md #11.)
-- =============================================================================

-- Display email: profile may show a different email than the sign-in one.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "displayEmail" TEXT;

-- Manual bird-species override (admin assignment + supporter perk). Slug of a
-- species from the 50-bird set; null = deterministic assignment as before.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "birdOverride" TEXT;

-- City-scoped posts: null = everyone; otherwise the city short-name this post
-- is limited to. Admins see all posts regardless.
ALTER TABLE "Post" ADD COLUMN IF NOT EXISTS "cityScope" TEXT;

-- Gazetteer: GeoNames places for the robust location picker.
CREATE TABLE IF NOT EXISTS "Place" (
  "id"         INTEGER PRIMARY KEY,          -- geonameid
  "name"       TEXT NOT NULL,
  "asciiName"  TEXT NOT NULL,
  "altNames"   TEXT,                          -- comma list, for alt-spelling search
  "lat"        DOUBLE PRECISION NOT NULL,
  "lng"        DOUBLE PRECISION NOT NULL,
  "country"    TEXT NOT NULL,                 -- ISO-3166 alpha-2
  "admin1"     TEXT,                          -- resolved state/province name
  "population" INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS "Place_asciiName_idx" ON "Place" (lower("asciiName") text_pattern_ops);
CREATE INDEX IF NOT EXISTS "Place_name_idx"      ON "Place" (lower("name") text_pattern_ops);

-- A person's cities: unlimited, ordered, all shown everywhere. label is the
-- full display string; city is the short name used for chips, search, and
-- Post.cityScope matching. placeId/lat/lng null = free-typed (gazetteer miss).
CREATE TABLE IF NOT EXISTS "UserPlace" (
  "id"        TEXT PRIMARY KEY,
  "userId"    TEXT NOT NULL,
  "placeId"   INTEGER,
  "label"     TEXT NOT NULL,
  "city"      TEXT NOT NULL,
  "lat"       DOUBLE PRECISION,
  "lng"       DOUBLE PRECISION,
  "position"  INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "UserPlace_userId_idx" ON "UserPlace" ("userId");
CREATE INDEX IF NOT EXISTS "UserPlace_city_idx"   ON "UserPlace" (lower("city"));

DO $$ BEGIN
  ALTER TABLE "UserPlace" ADD CONSTRAINT "UserPlace_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "UserPlace" ADD CONSTRAINT "UserPlace_placeId_fkey"
    FOREIGN KEY ("placeId") REFERENCES "Place"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Seed UserPlace from the legacy one/two-city columns (label-only rows; the
-- picker upgrades them to gazetteer-linked rows when the person next edits).
INSERT INTO "UserPlace" ("id", "userId", "label", "city", "position")
SELECT 'up_' || md5(u."id" || ':0'), u."id", u."currentCity", u."currentCity", 0
FROM "User" u
WHERE u."currentCity" IS NOT NULL AND btrim(u."currentCity") <> ''
  AND NOT EXISTS (SELECT 1 FROM "UserPlace" p WHERE p."userId" = u."id" AND p."position" = 0);

INSERT INTO "UserPlace" ("id", "userId", "label", "city", "position")
SELECT 'up_' || md5(u."id" || ':1'), u."id", u."secondaryCity", u."secondaryCity", 1
FROM "User" u
WHERE u."secondaryCity" IS NOT NULL AND btrim(u."secondaryCity") <> ''
  AND NOT EXISTS (SELECT 1 FROM "UserPlace" p WHERE p."userId" = u."id" AND p."position" = 1);

-- The Anonymous account that owns the curated WhatsApp seed content. No
-- password -> cannot be logged into. Wears the hoopoe (no real member may).
INSERT INTO "User" ("id", "name", "email", "accountType", "role", "verifyState", "birdOverride", "updatedAt")
VALUES ('anonymous', 'Anonymous', 'anonymous@rishivalley.space', 'alumnus', 'member', 'verified', 'hoopoe', CURRENT_TIMESTAMP)
ON CONFLICT ("email") DO NOTHING;
