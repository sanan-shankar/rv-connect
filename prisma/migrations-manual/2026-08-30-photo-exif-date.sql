-- What the FILE said about when a photograph was taken.
--
-- Idempotent, per CLAUDE.md: never `prisma db push` against this database.
-- Apply: node scripts/dev/run-sql.mjs prisma/migrations-manual/2026-08-30-photo-exif-date.sql
--   and: node scripts/dev/run-sql.mjs --env .env.demo prisma/migrations-manual/2026-08-30-photo-exif-date.sql
--
-- WHY. On the day this was written the Collection held 21 photographs and 3 of
-- them had a year. The upload strips EXIF on purpose -- a phone photograph
-- carries GPS and this archive will not publish a member's coordinates (audit
-- M12) -- and then deletes the original, so nothing anywhere knew what the
-- file had claimed. The owner: "we have to use the metadata like google photos
-- does." So the date is read out of the original before the strip, and only
-- the date: src/lib/exif-date.ts cannot name a latitude.
--
-- Purely ADDITIVE, and inert to every query that exists. One Supabase database
-- serves production and local dev, so the currently deployed build has to keep
-- working unchanged in front of these columns. It does: nothing reads them,
-- nothing derives from them, and two nullable integers change no plan.
--
-- NO BACKFILL, and there cannot be one. The originals these would have been
-- read from were purged at contribution time, and the stored copies are the
-- re-encoded ones with the metadata already gone. Every row that exists today
-- keeps a NULL here for ever; the rescue for those is the review room's
-- backlog mode, where a person supplies the year.
--
-- DO NOT go near "takenKey". It is GENERATED ALWAYS ... STORED and must not
-- learn about these columns: a suggestion the archive has not accepted must
-- not sort, group or file a photograph anywhere. An exifYear with no photoYear
-- is undated, and the river is right to treat it that way.

ALTER TABLE "Photo" ADD COLUMN IF NOT EXISTS "exifYear" INTEGER;
ALTER TABLE "Photo" ADD COLUMN IF NOT EXISTS "exifMonth" INTEGER;

-- No index. These are read one row at a time, by id, in the review room; the
-- backlog it pages through is selected on "photoYear IS NULL", which the
-- river's own indexes already serve.
