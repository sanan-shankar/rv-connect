-- ------------------------------------------------------------------
-- The decade ladder reaches the school's own founding.
--
-- The owner, 2026-08-28: "have for 1950s and 1940s as well." The
-- vocabulary used to stop at "pre-1960s", which is one bucket holding
-- 1926 to 1959 -- thirty-four years of a school founded in 1926, filed
-- under a decade nobody photographed in. It becomes "pre-1940s", plus
-- "1940s" and "1950s" of their own. See the note above ERAS in
-- src/lib/collection.ts, including the condition for revisiting it.
--
-- WHY THIS NEEDS A MIGRATION AT ALL: `takenKey` is a GENERATED STORED
-- column and its CASE is the SQL half of ERA_START_YEAR. A generated
-- column's expression cannot be altered in place, so it is dropped and
-- rebuilt -- and the river's keyset index rides on it, so that goes and
-- comes back too. Both inside one transaction, because between the DROP
-- and the CREATE the Collection's "Through time" order has no column to
-- sort by.
--
-- `pre-1960s` stays in the CASE deliberately. No row has ever held it
-- (checked before writing this: every row is '2020s' or 'unknown'), but
-- a browser holding a form built before the deploy can still post it,
-- and a value that falls through to NULL sorts as undated rather than as
-- what it says.
--
-- Idempotent: re-running rebuilds the same column and the same index.
-- Apply with `node scripts/dev/run-sql.mjs`.
-- ------------------------------------------------------------------

BEGIN;

-- Dropping the column drops "Photo_river_taken_idx" with it; it is
-- recreated below. IF EXISTS on both so a re-run is a no-op rather than
-- an error.
ALTER TABLE "Photo" DROP COLUMN IF EXISTS "takenKey";

ALTER TABLE "Photo" ADD COLUMN "takenKey" INTEGER
  GENERATED ALWAYS AS (
    (
      COALESCE(
        "photoYear",
        CASE "era"
          WHEN 'pre-1940s' THEN 1926
          WHEN '1940s'     THEN 1940
          WHEN '1950s'     THEN 1950
          WHEN 'pre-1960s' THEN 1926
          WHEN '1960s'     THEN 1960
          WHEN '1970s'     THEN 1970
          WHEN '1980s'     THEN 1980
          WHEN '1990s'     THEN 1990
          WHEN '2000s'     THEN 2000
          WHEN '2010s'     THEN 2010
          WHEN '2020s'     THEN 2020
          ELSE NULL
        END,
        0
      ) * 100
    ) + COALESCE("photoMonth", 0)
  ) STORED;

CREATE INDEX IF NOT EXISTS "Photo_river_taken_idx"
  ON "Photo" ("approved", "isHidden", "takenKey" DESC, "id" DESC);

COMMIT;
