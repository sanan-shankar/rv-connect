-- Close Supabase's second door (found via the dashboard's security advisor,
-- 2026-08-20). Every Supabase project ships PostgREST, an auto-generated REST
-- API over the public schema, reachable with the project's anon key. This app
-- never uses it -- all access goes through Prisma as the table owner -- but
-- with RLS disabled that API would hand full read/write on every table to
-- anyone holding the key. Enabling RLS with NO policies denies the API roles
-- (anon/authenticated) everything, while the owner connection Prisma uses is
-- exempt from RLS by Postgres rule, so the app feels nothing.
--
-- A DO loop rather than 38 hand-typed lines, so a table added next month is
-- covered by re-running this file. Idempotent, forward-only.
DO $$
DECLARE t record;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND NOT rowsecurity
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t.tablename);
  END LOOP;
END $$;
