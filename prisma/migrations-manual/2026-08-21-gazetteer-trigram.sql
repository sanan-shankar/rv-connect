-- The city type-ahead stops scanning 234,935 rows on every keystroke.
--
-- For a query of 4+ characters -- which is most of every city name typed --
-- the WHERE clause becomes `indexable OR indexable OR "altNames" ILIKE '%q%'`,
-- and Postgres can only build a BitmapOr when EVERY arm is indexable. altNames
-- had no index of any kind, so the planner fell back to a full sequential scan,
-- evaluating lower() twice and an ILIKE over a long comma-joined text column
-- per row, per keystroke, per member. Measured live on 2026-08-21 with EXPLAIN
-- (ANALYZE): 368ms and 4,690 shared buffers for `chenn` (bug audit B-091).
--
-- Fifteen members typing in the onboarding city picker at once is the launch
-- scenario, and it can saturate the shared pooler for the whole site.
--
-- Cost: a GIN trigram index over ~14MB of altNames text across 191,952 rows.
-- Worth it on a 76MB database with a 500MB ceiling, for the one query on this
-- site that is genuinely expensive, on the surface every new member meets.
--
-- pg_trgm goes in `extensions`, which is Supabase's convention and already on
-- the search_path; the operator class is schema-qualified anyway so the index
-- does not depend on that staying true.
--
-- Idempotent, per CLAUDE.md: never `prisma db push` against this database.
-- Apply: node scripts/dev/run-sql.mjs prisma/migrations-manual/2026-08-21-gazetteer-trigram.sql

CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;

CREATE INDEX IF NOT EXISTS "Place_altNames_trgm_idx"
  ON "Place" USING gin ("altNames" extensions.gin_trgm_ops);
