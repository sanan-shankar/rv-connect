-- Stop keeping members' coordinates. Visit.timezone, Visit.lat and Visit.lng
-- (refactor audit 1, critic-2's find -- the agent reports never mentioned them).
--
-- These are write-only in the strongest sense: src/lib/last-seen.ts filled them
-- from Vercel's edge headers on every page view, and NOTHING has ever read them.
-- Not the admin analytics room, which groups by country, city and region and
-- never selects these three; not the account export; not retention, which
-- deletes whole Visit rows by date. Every other lat/lng in the codebase belongs
-- to Place or UserPlace -- the pins a member puts on their own map, which are
-- theirs on purpose and are not touched here.
--
-- THIS IS THE ONE DROP IN THE PHASE THAT DESTROYS PERSONAL DATA rather than a
-- placeholder: 194 of 614 visits carry a real coordinate pair, roughly a third
-- of everyone who has ever signed in. That is the argument FOR removing them,
-- not against -- a field you collect and never use is one data minimisation says
-- you should stop collecting -- but it is the reason the owner was shown the
-- count before approving on 2026-08-27, and the reason all 194 rows are in
-- .backups/2026-08-27-phase6-pre-drop-snapshot.json (gitignored, real member
-- data, kept until he says otherwise).
--
-- The collection stopped first: last-seen.ts no longer reads
-- x-vercel-ip-timezone / -latitude / -longitude at all, so nothing has been
-- writing these since that shipped.
--
-- ORDER MATTERS AND THIS FILE IS THE SECOND HALF: the fields came out of
-- schema.prisma first, and this may only run once a build without them is live.
-- See 2026-08-27-drop-nextauth-adapter-tables.sql for why that is an outage and
-- not a warning.
--
-- Idempotent, per CLAUDE.md: never `prisma db push` against this database.
-- Apply: node scripts/dev/run-sql.mjs prisma/migrations-manual/2026-08-27-drop-visit-geolocation.sql
--   and: node scripts/dev/run-sql.mjs --env .env.demo prisma/migrations-manual/2026-08-27-drop-visit-geolocation.sql

ALTER TABLE "Visit" DROP COLUMN IF EXISTS "timezone";
ALTER TABLE "Visit" DROP COLUMN IF EXISTS "lat";
ALTER TABLE "Visit" DROP COLUMN IF EXISTS "lng";
