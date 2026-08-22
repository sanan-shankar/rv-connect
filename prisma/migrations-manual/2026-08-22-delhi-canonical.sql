-- Collapse Delhi onto New Delhi, and resync the legacy city column.
--
-- Data only: no schema change. The RULE that stops this coming back lives in
-- src/lib/place-aliases.ts and runs inside resolvePlaces, which all three
-- writers now share. This file is only the rows that already exist.
--
-- Why it is needed a second time: the earlier merge was an UPDATE and nothing
-- else, so it fixed the rows of the day and every member who joined after it
-- went back to picking the eleven-million-population "Delhi" the search ranks
-- first (owner, 2026-08-22: "now few new people joined and they're showing up
-- under delhi which shouldn't be happening").
--
-- The second half is the part that earlier merge missed entirely.
-- User.currentCity is a legacy mirror of the member's FIRST place, and the
-- feed's "New in the Directory" module reads it directly
-- (src/components/feed/rail/directory-module.tsx:71). Three members had a
-- UserPlace row saying New Delhi and a currentCity still saying "Delhi,
-- Delhi", which is the thing the owner was actually looking at. The same
-- drift is present from the Bangalore -> Bengaluru merge and from rows that
-- predate the UserPlace table, so this resyncs the invariant rather than just
-- the Delhi rows: currentCity is whatever the position-0 place says.
--
-- Idempotent, per CLAUDE.md: never `prisma db push` against this database.
-- Apply: node scripts/dev/run-sql.mjs prisma/migrations-manual/2026-08-22-delhi-canonical.sql
--   and: node scripts/dev/run-sql.mjs --env .env.demo prisma/migrations-manual/2026-08-22-delhi-canonical.sql

DO $$
DECLARE
  delhi     int := 1273294;  -- GeoNames: Delhi, Delhi, IN      (pop 11,034,555)
  new_delhi int := 1261481;  -- GeoNames: New Delhi, Delhi, IN  (pop 317,797)
  canon     RECORD;
  moved     int;
  dropped   int;
  synced    int;
BEGIN
  SELECT id, name, admin1, lat, lng INTO canon FROM "Place" WHERE id = new_delhi;
  IF canon IS NULL THEN
    RAISE EXCEPTION 'Refusing: gazetteer row % (New Delhi) is not in this database.', new_delhi;
  END IF;

  -- 1. Every Delhi row becomes a New Delhi row -- including lat/lng, because
  --    the directory map clusters on coordinates and not on placeId, which is
  --    how the previous merge still drew two pins 3.4km apart. Free-typed
  --    "Delhi" (placeId NULL, no coordinates at all, left by a search that
  --    failed) is picked up on the name and gains the real ones.
  UPDATE "UserPlace"
     SET "placeId" = canon.id,
         city      = canon.name,
         label     = canon.name || ', ' || canon.admin1,
         lat       = canon.lat,
         lng       = canon.lng
   WHERE "placeId" = delhi
      OR ("placeId" IS NULL AND lower(split_part(city, ',', 1)) = 'delhi');
  GET DIAGNOSTICS moved = ROW_COUNT;

  -- 2. Anyone who listed both now lists the same city twice. Earliest slot
  --    wins, so the order they chose survives. The gap this can leave in
  --    `position` is fine: the column is only ever read as an ordering, and
  --    both writers rewrite it 0..n-1 on the next save.
  DELETE FROM "UserPlace" a
   USING "UserPlace" b
   WHERE a."userId" = b."userId"
     AND a."placeId" = canon.id
     AND b."placeId" = canon.id
     AND a.position > b.position;
  GET DIAGNOSTICS dropped = ROW_COUNT;

  -- 3. The legacy column, back in step with the place list. Only for members
  --    who HAVE a first place: a currentCity with no UserPlace behind it is
  --    pre-table data and blanking it would lose the only city on file.
  UPDATE "User" u
     SET "currentCity" = p.label
    FROM "UserPlace" p
   WHERE p."userId" = u.id
     AND p.position = 0
     AND u."currentCity" IS DISTINCT FROM p.label;
  GET DIAGNOSTICS synced = ROW_COUNT;

  RAISE NOTICE 'Delhi -> New Delhi: % place row(s) moved, % duplicate(s) dropped, % currentCity resynced.',
    moved, dropped, synced;

  -- Re-checked at apply time rather than trusted from the paragraph above.
  IF EXISTS (SELECT 1 FROM "UserPlace" WHERE "placeId" = delhi) THEN
    RAISE EXCEPTION 'Refusing: a UserPlace row is still on the Delhi gazetteer row.';
  END IF;
END $$;
