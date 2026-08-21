-- One city slot per member, held by the database rather than by hope.
--
-- Both writers of a member's cities -- their own settings form and the admin's
-- person page -- are the same wipe-and-recreate transaction: delete every
-- UserPlace for that member, then create the new set at positions 0..n-1. Under
-- READ COMMITTED, two of those interleaving (an admin fixing somebody's cities
-- while that member edits them) can each delete what they could see and then
-- both insert, so the member ends up with BOTH sets: duplicate rows, two rows
-- at position 0, doubled pins on the map, and currentCity from whichever
-- committed last (bug audit Low 2).
--
-- With this unique, the loser's transaction aborts on the constraint instead,
-- the caller is told, and nothing halfway is left behind.
--
-- Checked live before writing: zero (userId, position) duplicates exist in
-- either database, so nothing is broken by adding it.
--
-- Idempotent, per CLAUDE.md: never `prisma db push` against this database.
-- Apply: node scripts/dev/run-sql.mjs prisma/migrations-manual/2026-08-21-user-place-position-unique.sql
--   and: node scripts/dev/run-sql.mjs --env .env.demo prisma/migrations-manual/2026-08-21-user-place-position-unique.sql

DO $$
DECLARE dupes int;
BEGIN
  -- Re-checked at apply time rather than trusted from the paragraph above:
  -- CREATE UNIQUE INDEX would fail anyway, but it would fail without saying why.
  SELECT count(*) INTO dupes FROM (
    SELECT 1 FROM "UserPlace" GROUP BY "userId", position HAVING count(*) > 1
  ) d;
  IF dupes > 0 THEN
    RAISE EXCEPTION
      'Refusing: % member(s) already hold two cities in one slot. Clean those first.', dupes;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "UserPlace_userId_position_key"
  ON "UserPlace" ("userId", position);
