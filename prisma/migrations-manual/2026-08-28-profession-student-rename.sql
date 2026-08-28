-- ------------------------------------------------------------------
-- The profession tag "studying" becomes "student".
--
-- The owner, hours after the tags shipped: "why is it studying. it
-- should be student." Every other value in the vocabulary is a field,
-- so the gerund was the one odd word in the list -- and when Retired
-- arrives it sits beside Student naturally and beside Studying
-- awkwardly. See the note on the Student entry in
-- src/lib/profession-tags.ts.
--
-- WHY THIS NEEDS SQL AT ALL, when the whole design was built so that
-- changing the vocabulary would not: LEGACY_TAGS maps a dead value on
-- READ, and the directory's filter arm matches the stored string
-- directly, so both of those survive a rename untouched. The FACET
-- OPTIONS do not. The histogram behind them is
-- `unnest("professionTags")` in raw SQL, which never passes through
-- the TypeScript -- so without this, the dropdown would go on counting
-- and labelling the tag as "Studying" for as long as any row held it.
-- Adding, removing and splitting a tag still need no migration; a
-- rename of a STORED value is the one operation that does.
--
-- Done now because it is as cheap as it will ever be: the column is
-- hours old, so no member has a `?profession=studying` link saved. The
-- LEGACY_TAGS entry stays anyway, for the demo database's own seeds
-- and for a browser holding a page built before the deploy.
--
-- Idempotent: array_replace on a value no longer present is a no-op,
-- and the WHERE means a re-run touches nothing.
-- Apply with `node scripts/dev/run-sql.mjs`, then again with
-- `--env .env.demo` once that database has the column.
-- ------------------------------------------------------------------

BEGIN;

UPDATE "User"
   SET "professionTags" = array_replace("professionTags", 'studying', 'student')
 WHERE "professionTags" @> ARRAY['studying']::text[];

COMMIT;
