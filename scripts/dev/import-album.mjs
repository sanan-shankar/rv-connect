#!/usr/bin/env node
/* ------------------------------------------------------------------ *
 *  Put a whole album into the Class Collection, in one go, with dates.
 *
 *  WHY THIS IS NOT THE CONTRIBUTE ROOM. The room already takes a bulk
 *  drop and it is genuinely good at it, but three of its limits are the
 *  wrong shape for seeding an archive from a decade of photographs:
 *  `MAX_PHOTOS_PER_DROP` is 200, `MAX_UPLOAD_BYTES` is 20MB (the owner's
 *  album has seven files above it), and -- the one that actually decides
 *  it -- the room applies ONE date to a whole drop. An album spanning
 *  2015 to 2023 needs a date per photograph or the year rail, which is
 *  the whole point of putting it there, has nothing to draw.
 *
 *  So this is the same contribution, made per file, from the machine
 *  that has the files.
 *
 *  WHAT IT SHARES WITH THE APP, DELIBERATELY. The encode is
 *  `storedResizeBox` + WebP, out of `src/lib/image.ts`, which is the
 *  recipe `contributePhotoDirect` uses -- full resolution, the 40MP area
 *  cap only ever bounding a decompression bomb (audit M16). The date is
 *  read with `exifStamp` out of `src/lib/exif-date.ts`, the reader that
 *  deliberately cannot name a GPS tag. The 480px/q72 thumbnail and the
 *  two-source EXIF reader come from `src/lib/collection-image.ts`, which
 *  exists so that a bare `node` can have them: they used to be copied
 *  here, because their old home imports through the `@/lib` alias that a
 *  plain node script cannot resolve. Nothing about the picture this
 *  script files is written twice any more.
 *
 *  WHAT IT DOES NOT DO. It does not raise, lower or skip a rule that
 *  protects anybody else: rows land `scope: "class"` with the uploader's
 *  OWN batch year, exactly as `contributionScope` would derive it, and
 *  the script refuses to run for an account that is not verified or has
 *  no batch year. The one ceiling it passes is `MAX_PHOTOS_PER_ACCOUNT`,
 *  which is a member's ceiling and not the archive keeper's (owner,
 *  2026-09-01: "of course no limits for uploading should be there for
 *  me"); the app now exempts admins from it for the same reason.
 *
 *  SAFETY, in the shape scripts/dev/tag-photos-apply.mjs established:
 *
 *    - DRY BY DEFAULT. It plans every row, prints what it would file
 *      and under which year, and writes nothing until `--apply`.
 *    - EVERY WRITE IS LEDGERED, one JSON line per photograph, flushed
 *      before the next one starts. `--undo <ledger>` deletes the rows
 *      and the stored objects, so an import is reversible in full even
 *      though the app has no way to un-file a class photograph.
 *    - IT CANNOT DOUBLE-IMPORT. `Photo.sourceKey` is UNIQUE, so each
 *      row carries `album:<relative path>` and a second run over the
 *      same album loses the insert rather than making a twin. That is
 *      the same guarantee audit C-129 added it for, and it means a
 *      crashed run is resumed by simply running it again.
 *    - IT NEVER INVENTS A DATE. `--provenance` names the file that says
 *      which photographs carry a real stamp and which were dated by
 *      hand; anything marked year-only is filed at year precision so
 *      the archive does not claim a month nobody knows. A photograph
 *      with no readable stamp at all is REFUSED, not filed undated,
 *      because a silently undated photograph is invisible to the rail.
 *
 *  Run: node scripts/dev/import-album.mjs [--apply] [--quality 90]
 *                                         [--album <dir>] [--as <email>]
 *                                         [--limit N] [--env .env]
 *       node scripts/dev/import-album.mjs --undo scripts/dev/.album-import/….jsonl --apply
 * ------------------------------------------------------------------ */

import { readdir, readFile, appendFile, mkdir } from "node:fs/promises";
import path from "node:path";
import pg from "pg";
import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { createId } from "@paralleldrive/cuid2";
import { databaseUrl } from "./_env.mjs";
import { argv } from "./_cli.mjs";
import { sharpImage, storedResizeBox } from "../../src/lib/image.ts";
import { exifStamp, parseExifStamp } from "../../src/lib/exif-date.ts";
/* The app's own thumbnail recipe and EXIF reader, imported rather than
   copied. They live in collection-image.ts precisely so a bare `node`
   script can have them; the copies that used to be here drifted from the
   app the moment either changed. */
import { exifBlockOf, gridThumb } from "../../src/lib/collection-image.ts";
import { eraFromYear } from "../../src/lib/collection.ts";
import { COLLECTION_WEBP_QUALITY } from "../../src/lib/upload-shared.ts";

const { flag, value } = argv();

const APPLY = flag("--apply");
const UNDO = value("--undo", null);
/* The app's own setting by default, so an imported photograph and a
   contributed one are the same photograph. `--quality` is for measuring, not
   for filing a batch to a different standard than the archive around it. */
const QUALITY = Number(value("--quality", String(COLLECTION_WEBP_QUALITY)));
const LIMIT = Number(value("--limit", "0"));
const AS = value("--as", "sanan.v.shankar@gmail.com");
const ALBUM = value("--album", "sanan's stuff/album");
const PROVENANCE = value("--provenance", "sanan's stuff/album-date-provenance.txt");
const envFile = value("--env", ".env");

/* Beside the script, never in the root: it holds a ledger naming real
   photographs, and the owner keeps the root short. `.gitignore` already
   covers every dotted working folder under scripts/dev. */
const OUT = path.join(process.cwd(), "scripts", "dev", ".album-import");

const THIS_YEAR = new Date().getFullYear();

const { env, url } = databaseUrl(envFile);
for (const k of ["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET", "R2_PUBLIC_BASE_URL"]) {
  if (!env[k]) {
    console.error(`No ${k} in ${envFile}: refusing to run against the local filesystem fallback.`);
    process.exit(1);
  }
}
if (!Number.isInteger(QUALITY) || QUALITY < 1 || QUALITY > 100) {
  console.error(`--quality must be 1-100, got ${QUALITY}`);
  process.exit(1);
}

const BUCKET = env.R2_BUCKET;
const PUBLIC_BASE = env.R2_PUBLIC_BASE_URL.replace(/\/+$/, "");
const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: env.R2_ACCESS_KEY_ID, secretAccessKey: env.R2_SECRET_ACCESS_KEY },
});

/* A POOL, NOT A CLIENT. The import runs four workers (see CONCURRENCY below)
   and `pg.Client` holds ONE connection: calling `query` on it while a query is
   already in flight serialises them and warns that pg@9 will stop allowing it
   at all. A pool hands each worker its own connection, which is what
   concurrent callers have always needed. `pool.query` has the same shape as
   `client.query`, so nothing else in this file changes. */
const client = new pg.Pool({
  connectionString: url,
  ssl: { rejectUnauthorized: false },
  max: 6,
});

/* ------------------------------------------------------------------ *
 *  Who is contributing, and may they.
 *
 *  The same two facts `contributionScope` checks, checked the same way,
 *  so this script cannot put a photograph into a class its uploader has
 *  no claim on.
 * ------------------------------------------------------------------ */
const who = (
  await client.query(
    `select id, name, role, "batchYear", "verifyState" from "User" where email = $1`,
    [AS]
  )
).rows[0];
if (!who) fail(`No account for ${AS}`);
const classYear = /^\d{4}$/.test(String(who.batchYear)) ? String(who.batchYear) : null;
if (who.verifyState !== "verified" || !classYear) {
  fail(`${AS} is ${who.verifyState} with batchYear ${who.batchYear}: cannot contribute to a Class Collection.`);
}

function fail(message) {
  console.error(message);
  client.end();
  process.exit(1);
}

/* ------------------------------------------------------------------ *
 *  The undo.
 * ------------------------------------------------------------------ */
if (UNDO) {
  const lines = (await readFile(UNDO, "utf8")).split("\n").filter(Boolean).map((l) => JSON.parse(l));
  console.log(`${lines.length} photographs in ${UNDO}`);
  if (!APPLY) {
    console.log("DRY RUN. Add --apply to delete these rows and their stored objects.");
  } else {
    let gone = 0;
    for (const row of lines) {
      await client.query(`DELETE FROM "Photo" WHERE "id" = $1`, [row.id]);
      for (const key of [row.key, row.thumbKey]) {
        await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key })).catch((e) => {
          /* A missing object is the state we wanted; anything else is worth
             seeing, because bytes nothing names can never be found again. */
          console.warn(`  could not delete ${key}: ${e.name}`);
        });
      }
      gone++;
    }
    console.log(`removed ${gone}`);
  }
  await client.end();
  process.exit(0);
}

/* ------------------------------------------------------------------ *
 *  Which photographs were dated by hand, and how precisely.
 *
 *  The provenance file is the record of the owner's own dating pass. A
 *  photograph it marks "owner gave the year only" has a stamp reading
 *  1 January midday that nobody should read as January: it is filed at
 *  YEAR precision, with no month, so the viewer says "2015" and the rail
 *  still has a year to put it under.
 * ------------------------------------------------------------------ */
async function yearOnlySet() {
  const set = new Set();
  let text;
  try {
    text = await readFile(PROVENANCE, "utf8");
  } catch {
    console.warn(`no provenance file at ${PROVENANCE}: every photograph will be filed at month precision`);
    return set;
  }
  for (const line of text.split("\n")) {
    if (!line.includes("owner gave the year only")) continue;
    const parts = line.split("\t");
    const name = /^\S+\s+(.*)$/.exec(parts[0])?.[1];
    if (name && parts[1]) set.add(`${parts[1].trim()}/${name.trim()}`);
  }
  return set;
}

/* ------------------------------------------------------------------ *
 *  The plan.
 * ------------------------------------------------------------------ */
const yearOnly = await yearOnlySet();

const folders = (await readdir(ALBUM, { withFileTypes: true }))
  .filter((d) => d.isDirectory())
  .map((d) => d.name)
  .sort();

const planned = [];
const refused = [];
for (const folder of folders) {
  for (const name of (await readdir(path.join(ALBUM, folder))).sort()) {
    if (name.startsWith(".")) continue;
    const rel = `${folder}/${name}`;
    const file = path.join(ALBUM, rel);
    const stamp = exifStamp(await exifBlockOf(await readFile(file)), THIS_YEAR);
    const date = stamp ? parseExifStamp(stamp, THIS_YEAR) : null;

    /* NO STAMP THIS READER CAN SEE. Three PNGs in the owner's album are in
       this state: exiftool finds a DateTimeOriginal in them and sharp's
       `metadata().exif` comes back empty, so the app itself would file them
       undated too. The folder name is the fallback, and it is not an
       invention -- "Photos from 2020" is the owner's own dating pass, the same
       source the year-only entries above come from. Filed at YEAR precision
       for exactly that reason, and listed at the end so the fallback is never
       silent. */
    const foldered = !date && /(\d{4})/.exec(folder);
    if (!date && !foldered) {
      refused.push(rel);
      continue;
    }

    const year = date ? date.year : Number(foldered[1]);
    const yearsOnly = yearOnly.has(rel) || !date;
    planned.push({
      rel,
      file,
      /* Null when the file had no stamp to keep: the stored copy then carries
         no date rather than one this script made up. */
      stamp,
      /* Recorded on the row, not in a list built during the walk: the lists
         below have to describe THE RUN, and a `--limit` slices the plan after
         the walk is finished. A report that names photographs the run will not
         touch is worse than no report. */
      viaFolder: !!foldered,
      photoYear: year,
      photoMonth: yearsOnly ? null : date.month,
      datePrecision: yearsOnly || date.month === null ? "year" : "month",
      era: eraFromYear(year),
    });
  }
}

/* ALREADY IN, ASKED BEFORE THE ENCODE. `sourceKey` is unique, so a re-run was
   always safe -- but "safe" meant re-encoding a 24MP photograph, storing two
   objects, losing the insert and then deleting them again. On a resume after a
   crash that is the entire cost of the run paid twice. One query up front
   turns a resume into a no-op for everything already done. */
const already = new Set(
  (await client.query(`select "sourceKey" from "Photo" where "sourceKey" like 'album:%'`)).rows.map(
    (r) => r.sourceKey.slice("album:".length)
  )
);
const fresh = planned.filter((p) => !already.has(p.rel));
const todo = LIMIT > 0 ? fresh.slice(0, LIMIT) : fresh;

const byYear = new Map();
for (const p of todo) byYear.set(p.photoYear, (byYear.get(p.photoYear) ?? 0) + 1);

console.log(`album      ${ALBUM}`);
console.log(`uploader   ${who.name} <${AS}>, class of ${classYear}, ${who.role}`);
console.log(`quality    WebP q${QUALITY}, full resolution (storedResizeBox)`);
console.log(`planned    ${todo.length} photographs${LIMIT ? ` (--limit ${LIMIT} of ${fresh.length})` : ""}`);
if (already.size) console.log(`already in ${already.size} skipped without re-encoding`);
console.log(`  by year  ${[...byYear].sort((a, b) => a[0] - b[0]).map(([y, n]) => `${y}:${n}`).join("  ")}`);
console.log(`  year-only precision: ${todo.filter((p) => p.datePrecision === "year").length}`);
const fellBackToFolder = todo.filter((p) => p.viaFolder);
if (fellBackToFolder.length) {
  console.log(`  dated from the folder name (no stamp this reader can see), filed at year precision: ${fellBackToFolder.length}`);
  for (const p of fellBackToFolder) console.log(`    ${p.rel}`);
}
if (refused.length) {
  console.log(`REFUSED (no readable date, so nothing to file them under): ${refused.length}`);
  for (const r of refused.slice(0, 20)) console.log(`  ${r}`);
  if (refused.length > 20) console.log(`  ... and ${refused.length - 20} more`);
}

if (!APPLY) {
  console.log("\nDRY RUN. Nothing has been encoded, stored or written. Add --apply.");
  await client.end();
  process.exit(0);
}

/* ------------------------------------------------------------------ *
 *  The import.
 * ------------------------------------------------------------------ */
await mkdir(OUT, { recursive: true });
const ledger = path.join(OUT, `imported-${new Date().toISOString().replace(/[:.]/g, "-")}.jsonl`);
console.log(`\nledger     ${ledger}`);

/** The date partition `buildKey` in src/lib/storage.ts adds. Same shape, so
 *  `keyForUrl` and every sweep can read these keys like any other. */
const now = new Date();
const partition = `collection/${who.id}/${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, "0")}`;

async function put(key, body) {
  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: body,
      ContentType: "image/webp",
      CacheControl: "public, max-age=31536000, immutable",
    })
  );
  return `${PUBLIC_BASE}/${key}`;
}

let done = 0, skipped = 0, failed = 0;

async function importOne(p) {
  const original = await readFile(p.file);
  const box = storedResizeBox(await sharpImage(original).rotate().metadata());

  /* The one tag the stored copy keeps, and the reason this whole import can
     be downloaded and still land in the right year in somebody's photo app.
     Nothing else from the original block travels -- 356 of these files carry
     GPS (audit M12). */
  const encode = sharpImage(original)
    .rotate()
    .resize(box.width, box.height, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: QUALITY });

  const display = await (p.stamp ? encode.withExif({ IFD2: { DateTimeOriginal: p.stamp } }) : encode)
    .toBuffer({ resolveWithObject: true });

  // `alreadyUpright`: the display buffer above has been through `.rotate()`.
  const thumb = await gridThumb(display.data, { alreadyUpright: true });

  const id = createId();
  const key = `${partition}/${id}.webp`;
  const thumbKey = `${partition}/${id}-t.webp`;
  const url = await put(key, display.data);
  const thumbUrl = await put(thumbKey, thumb);

  /* `takenKey` is GENERATED ALWAYS ... STORED and is deliberately absent from
     this insert: Postgres refuses a value for a generated column, which is the
     mistake that broke every contribution once already (see schema.prisma).

     `now()` FOR THE THREE TIMESTAMPS, AND IT WAS CHECKED. bugs.md item 6 warns
     that `createdAt` is `timestamp without time zone` and that a raw-pg writer
     can land 5h30m out; the reason it does not here is that the connection's
     session TimeZone is UTC, so casting `now()` to a naive timestamp yields the
     UTC wall clock, which is exactly what Prisma reads it back as. Verified
     against a row on 2026-09-02: stored 19:31:13, import ran at 19:31:03Z.
     If that session setting ever changes, this is the line that breaks, and
     the symptom is photographs sorted five and a half hours into the future. */
  const inserted = await client.query(
    `INSERT INTO "Photo" (
       "id","uploaderId","thumbUrl","url","width","height","caption","sourceKey",
       "subject","area","era","freeTags","photoYear","photoMonth","datePrecision",
       "exifYear","exifMonth","scope","classYears","approved","isHidden",
       "approvedAt","approvedById","createdAt","updatedAt"
     ) VALUES (
       $1,$2,$3,$4,$5,$6,NULL,$7,
       '',NULL,$8,NULL,$9,$10,$11,
       $12,$13,'class',$14,true,false,
       now(),$2,now(),now()
     ) ON CONFLICT ("sourceKey") DO NOTHING
     RETURNING "id"`,
    [
      id, who.id, thumbUrl, url, display.info.width, display.info.height,
      `album:${p.rel}`,
      p.era, p.photoYear, p.photoMonth, p.datePrecision,
      p.photoYear, p.photoMonth,
      classYear,
    ]
  );

  if (inserted.rowCount === 0) {
    /* Already imported. The bytes this attempt just stored name no row, so
       they go straight back out rather than becoming orphans nothing can
       enumerate (audit C-063). */
    for (const k of [key, thumbKey]) {
      await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: k })).catch(() => {});
    }
    skipped++;
    return;
  }

  /* Flushed BEFORE the next photograph starts, so a crash leaves a ledger that
     names everything already written and `--undo` is complete. */
  await appendFile(ledger, JSON.stringify({ id, key, thumbKey, rel: p.rel }) + "\n");
  done++;
}

/* Four at a time. Each one is a full-resolution decode, two encodes and two
   PUTs across the Arabian Sea; one at a time wastes the wait and twenty at a
   time is how a batch half-lands with the connection pool exhausted. */
const CONCURRENCY = 4;
const queue = [...todo];
await Promise.all(
  Array.from({ length: CONCURRENCY }, async () => {
    for (let p = queue.shift(); p; p = queue.shift()) {
      try {
        await importOne(p);
      } catch (e) {
        failed++;
        console.error(`  ${p.rel}: ${e.message}`);
      }
      const seen = done + skipped + failed;
      if (seen % 50 === 0) console.log(`  ${seen}/${todo.length}`);
    }
  })
);

console.log(`\nimported ${done}, already present ${skipped}, failed ${failed}`);
console.log(`undo: node scripts/dev/import-album.mjs --undo ${ledger} --apply`);
await client.end();
