-- 2026-09-29: an empty schema for Supabase's Data API (PostgREST) to expose.
--
-- The app never uses the Data API: every query goes through Prisma. The API
-- had been switched off in the dashboard, and Supabase's "off" points
-- PostgREST at a placeholder schema, pg_pgrst_no_exposed_schemas, that does not
-- exist. PostgREST retries every 32 seconds and fails every time: 2,688 errors
-- a day, a project the dashboard calls "Unhealthy", and a log stream that put
-- the organisation over the Free plan's 1 GB log ingestion (1.55 GB).
--
-- Pointing the Data API at this schema instead lets PostgREST start. It holds
-- nothing and grants nothing, so nothing becomes reachable through the API;
-- every public table also keeps RLS on with no policy (deny-all) behind it.
--
-- Idempotent. Apply to BOTH databases:
--   node scripts/dev/run-sql.mjs prisma/migrations-manual/2026-09-29-data-api-empty-schema.sql
--   node scripts/dev/run-sql.mjs --env .env.demo prisma/migrations-manual/2026-09-29-data-api-empty-schema.sql
-- Then, per project, Settings -> Data API: exposed schemas = api, and only api.

CREATE SCHEMA IF NOT EXISTS api;

COMMENT ON SCHEMA api IS
  'Deliberately empty. The only schema the Data API exposes, so PostgREST can start without exposing anything. See prisma/migrations-manual/2026-09-29-data-api-empty-schema.sql.';
