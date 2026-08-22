-- Point every stored image address at the bucket's own domain.
--
-- Serving moved from Cloudflare's free `pub-<hash>.r2.dev` address, which
-- Cloudflare rate-limits and documents as not for production, to
-- `images.rishivalley.space` (owner, 2026-08-21). `R2_PUBLIC_BASE_URL` in
-- Vercel now names the new one, so every NEW upload writes it -- but every
-- address already in the database still names the old one, in six columns
-- across five tables.
--
-- The bytes do not move. Both hostnames serve the same objects out of the same
-- bucket, verified before this was written (200 image/webp on each), so this is
-- a pure string rewrite and nothing is fetched, copied or deleted.
--
-- The old host keeps working, so this is not urgent for RENDERING. It matters
-- for DELETING: `keyForUrl` derives an object key by stripping a known public
-- base off the front of a URL, and a URL it cannot claim is one whose bytes
-- survive the row that pointed at them, silently and for ever. The code half
-- of this change teaches `publicBaseFor` both hosts so nothing depends on this
-- migration having caught every row -- but the fewer left, the better.
--
-- `replace` rather than a regex: the old base is one exact literal string, and
-- an address that merely CONTAINS it (there are none) should not be rewritten
-- by accident. Post.images and CatchupEntry.images are JSON arrays stored as
-- text; a plain substring replace is correct on those too, because the only
-- thing changing is a hostname inside each quoted string.
--
-- Idempotent: after one pass no row contains the old host, so a second pass
-- matches nothing.
--
-- Apply: node scripts/dev/run-sql.mjs prisma/migrations-manual/2026-08-21-image-host-move.sql
--   and: node scripts/dev/run-sql.mjs --env .env.demo prisma/migrations-manual/2026-08-21-image-host-move.sql
--        (the demo shares the bucket; it had no matching rows at apply time,
--         and running it there is what keeps that true.)

UPDATE "Photo"
   SET url         = replace(url,         'https://pub-a656209a5438484f9694738260255a5e.r2.dev', 'https://images.rishivalley.space'),
       "thumbUrl"  = replace("thumbUrl",  'https://pub-a656209a5438484f9694738260255a5e.r2.dev', 'https://images.rishivalley.space'),
       "originalUrl" = replace("originalUrl", 'https://pub-a656209a5438484f9694738260255a5e.r2.dev', 'https://images.rishivalley.space')
 WHERE url LIKE '%pub-a656209a5438484f9694738260255a5e.r2.dev%'
    OR "thumbUrl" LIKE '%pub-a656209a5438484f9694738260255a5e.r2.dev%'
    OR "originalUrl" LIKE '%pub-a656209a5438484f9694738260255a5e.r2.dev%';

UPDATE "User"
   SET "photoUrl"   = replace("photoUrl",   'https://pub-a656209a5438484f9694738260255a5e.r2.dev', 'https://images.rishivalley.space'),
       "coverPhoto" = replace("coverPhoto", 'https://pub-a656209a5438484f9694738260255a5e.r2.dev', 'https://images.rishivalley.space')
 WHERE "photoUrl" LIKE '%pub-a656209a5438484f9694738260255a5e.r2.dev%'
    OR "coverPhoto" LIKE '%pub-a656209a5438484f9694738260255a5e.r2.dev%';

UPDATE "Post"
   SET images = replace(images, 'https://pub-a656209a5438484f9694738260255a5e.r2.dev', 'https://images.rishivalley.space')
 WHERE images LIKE '%pub-a656209a5438484f9694738260255a5e.r2.dev%';

UPDATE "CatchupEntry"
   SET images = replace(images, 'https://pub-a656209a5438484f9694738260255a5e.r2.dev', 'https://images.rishivalley.space')
 WHERE images LIKE '%pub-a656209a5438484f9694738260255a5e.r2.dev%';

UPDATE "AdminMessage"
   SET "imageUrl" = replace("imageUrl", 'https://pub-a656209a5438484f9694738260255a5e.r2.dev', 'https://images.rishivalley.space')
 WHERE "imageUrl" LIKE '%pub-a656209a5438484f9694738260255a5e.r2.dev%';

UPDATE "Group"
   SET "coverImage" = replace("coverImage", 'https://pub-a656209a5438484f9694738260255a5e.r2.dev', 'https://images.rishivalley.space')
 WHERE "coverImage" LIKE '%pub-a656209a5438484f9694738260255a5e.r2.dev%';

DO $$
DECLARE stragglers int;
BEGIN
  -- Re-checked at apply time rather than trusted from the paragraph above.
  SELECT
      (SELECT count(*) FROM "Photo"        WHERE url LIKE '%r2.dev%' OR "thumbUrl" LIKE '%r2.dev%' OR "originalUrl" LIKE '%r2.dev%')
    + (SELECT count(*) FROM "User"         WHERE "photoUrl" LIKE '%r2.dev%' OR "coverPhoto" LIKE '%r2.dev%')
    + (SELECT count(*) FROM "Post"         WHERE images LIKE '%r2.dev%')
    + (SELECT count(*) FROM "CatchupEntry" WHERE images LIKE '%r2.dev%')
    + (SELECT count(*) FROM "AdminMessage" WHERE "imageUrl" LIKE '%r2.dev%')
    + (SELECT count(*) FROM "Group"        WHERE "coverImage" LIKE '%r2.dev%')
    INTO stragglers;
  IF stragglers > 0 THEN
    RAISE EXCEPTION
      'Refusing: % row(s) still hold an r2.dev image address. A second bucket host?', stragglers;
  END IF;
END $$;
