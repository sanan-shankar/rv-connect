-- Seven indexes no query shape uses, and one that is dominated by a better one.
--
-- Refactor audit 2, row D7's index half (`data-layer-04`), plus the index that
-- came out of `data-layer-01` with Post.groupId (dropped by its own file,
-- 2026-09-07-drop-groups-residue.sql -- an index goes with its column).
--
-- Idempotent, per CLAUDE.md: never `prisma db push` against this database.
--
-- ORDER DOES NOT MATTER FOR THIS ONE, unlike the column drops beside it.
-- Prisma never names an index in a query, so an old build in front of a
-- dropped index keeps working; it just plans some statement differently. Run
-- it whenever. The code that stopped declaring these is the commit this file
-- ships in.
--
-- Apply:
--   node scripts/dev/run-sql.mjs prisma/migrations-manual/2026-09-07-drop-unused-indexes.sql
--   node scripts/dev/run-sql.mjs --env .env.demo prisma/migrations-manual/2026-09-07-drop-unused-indexes.sql
-- Production and the demo are SEPARATE Supabase projects. All eight objects
-- exist on BOTH, checked 2026-09-07, and every one is a plain btree matching
-- its Prisma declaration exactly -- none of them is one of the eleven
-- expression/partial/trigram objects the schema header warns about.
--
-- THE EVIDENCE, and it is not the audit's. `idx_scan` totals below are from
-- pg_stat_user_indexes over a window open since 2026-05-22 (108 days). The
-- "today" figure is a controlled probe on 2026-09-07: a full authenticated
-- crawl of every route, then /admin/audit, /admin/analytics?view=journey,
-- ?view=people and ?view=faces, then twelve /collection loads across both
-- halves and a bucket filter. Every reader the audit named was visited.
--
--   Photo_approved_isHidden_createdAt_idx   6,388 lifetime,  0 today
--   Photo_river_era_idx                         5 lifetime,  0 today
--   LoginAttempt_email_createdAt_idx            8 lifetime,  0 today
--   LoginAttempt_userId_createdAt_idx          24 lifetime,  0 today
--   AuditLog_actorId_createdAt_idx              7 lifetime,  0 today
--   AuditLog_targetId_idx                       7 lifetime,  0 today
--   ContentView_viewerId_lastAt_idx           110 lifetime,  0 today
--
-- The 6,388 is not a contradiction. Photo_approved_isHidden_createdAt_idx is a
-- strict prefix of Photo_river_added_idx (approved, isHidden, createdAt DESC,
-- id DESC), which was created on 2026-08-28; every one of those scans predates
-- it. Postgres walks a DESC btree backwards for ASC and uses any leading
-- prefix, so the river index serves every predicate and order the old one did.
-- The 2026-08-28-collection-river.sql migration recorded exactly this and left
-- the old index in place.
--
-- ContentView_viewerId_lastAt_idx IS NOT A COLUMN DROP. The owner kept
-- ContentView.firstAt and lastAt on 2026-09-07 ("they seem useful so let's
-- keep them for now"); the columns and their writes are untouched. This drops
-- only an index no query uses, on a table written on every profile, letter,
-- photograph and Round view.
--
-- WHAT THIS FILE DOES *NOT* DROP, and why. `Photo_era_idx` (a bare btree on
-- era) is the eighth index the audit wanted gone, and the evidence refuses it:
-- it went from 60 lifetime scans to 80 during this session's work, so the
-- planner IS choosing it, from traffic that could not be attributed to any
-- route probed here. The finding's reasoning is sound -- no `where` in the
-- application filters `era` alone since the decade rail became a seek --
-- but "no query shape can use it" and "nothing is using it" are different
-- claims, and only the second justifies a drop. An index costs write
-- amplification and nothing else. Attribute those scans first, then run the
-- statement below.
--
--   DROP INDEX IF EXISTS "Photo_era_idx";
--
-- index-coverage.test.mjs pins none of these: its REQUIRED list is the ten
-- B-090 child-side foreign keys, and none of the eight is among them.

DROP INDEX IF EXISTS "Photo_approved_isHidden_createdAt_idx";
DROP INDEX IF EXISTS "Photo_river_era_idx";

DROP INDEX IF EXISTS "LoginAttempt_email_createdAt_idx";
DROP INDEX IF EXISTS "LoginAttempt_userId_createdAt_idx";

DROP INDEX IF EXISTS "AuditLog_actorId_createdAt_idx";
DROP INDEX IF EXISTS "AuditLog_targetId_idx";

DROP INDEX IF EXISTS "ContentView_viewerId_lastAt_idx";
