#!/usr/bin/env node
/* ------------------------------------------------------------------ *
 *  Give every Collection photograph already stored a screen copy.
 *
 *  WHY: the viewer opened each photograph's full-resolution master, 7-11MB
 *  for a 24MP photograph at the q100 the archive keeps. The owner,
 *  2026-09-23: "I picked a random image not even that high res and it took
 *  41 seconds to open. it's just totally unusable now". The screen copy
 *  (SCREEN_PX in src/lib/collection-image.ts) is what the viewer opens now;
 *  new contributions get one on the way in, and this is the one-off for
 *  everything already there.
 *
 *  THE MASTER IS READ FROM THE S3 ENDPOINT, NOT THE PUBLIC ADDRESS. The
 *  public address is the slow path this whole change routes around:
 *  measured from London the same day, a photograph Cloudflare had not
 *  cached came off images.rishivalley.space at 11-40KB/s, and off the S3
 *  endpoint at 5MB/s.
 *
 *  SAFE TO RE-RUN AND TO INTERRUPT. It reads only rows whose screenUrl is
 *  still null, and a copy's key is its master's key with `-s` added, so a
 *  run that dies between the PUT and the UPDATE overwrites the same object
 *  next time instead of stranding one.
 *
 *  NOTHING IS LEFT THAT NO ROW NAMES. The UPDATE only fills a column that is
 *  still null (or already holds this very copy) on a row that still exists;
 *  when it matches nothing, the object just written is deleted again. A last
 *  pass after the run deletes any copy whose row went in the moment between
 *  the two. Nothing in this system can enumerate the bucket (audit C-063), so
 *  an object no row names is never found again.
 *
 *  DRY BY DEFAULT: it makes the first five copies in memory, prints what they
 *  would save, and writes nothing. `--apply` writes, ledgering each copy
 *  before its row is touched; `--undo <ledger> --apply` empties the column
 *  (only where it still holds that ledger's copy) and deletes the objects.
 *
 *  RUN BEFORE THE DEPLOY THAT PURGES IT, RECONCILE AFTER. A build from before
 *  2026-09-23 deletes a photograph's master and thumbnail and has never heard
 *  of its screen copy, so a photograph deleted -- or hidden by a moderator --
 *  between this run and that deploy leaves its copy behind, public.
 *  `--reconcile <ledger> --apply` deletes every copy in the ledger that no
 *  visible row names; run it once the new build is live and nothing can
 *  strand one again.
 *
 *  Run: node scripts/dev/backfill-screen-copies.mjs [--apply] [--limit N]
 *                                                   [--env .env.demo]
 *       node scripts/dev/backfill-screen-copies.mjs --undo scripts/dev/.screen-copies/….jsonl --apply
 *       node scripts/dev/backfill-screen-copies.mjs --reconcile scripts/dev/.screen-copies/….jsonl --apply
 * ------------------------------------------------------------------ */

import { appendFile, mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import pg from "pg";
import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { databaseUrl } from "./_env.mjs";
import { argv } from "./_cli.mjs";
import { screenCopy } from "../../src/lib/collection-image.ts";
import { publicBaseFor } from "../../src/lib/upload-shared.ts";

const { flag, value } = argv();

const APPLY = flag("--apply");
const UNDO = value("--undo", null);
const RECONCILE = value("--reconcile", null);
const LIMIT = Number(value("--limit", "0"));
const envFile = value("--env", ".env");
const { env, url } = databaseUrl(envFile);
for (const k of ["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET", "R2_PUBLIC_BASE_URL"]) {
  if (!env[k]) {
    console.error(`${k} is missing from ${envFile}; this script talks to the bucket directly.`);
    process.exit(1);
  }
}
const BUCKET = env.R2_BUCKET;
const PUBLIC_BASE = env.R2_PUBLIC_BASE_URL.replace(/\/+$/, "");
/* `publicBaseFor` is the app's own answer to "is this URL one of ours", the
   bucket's old address included, and it reads today's base from the
   environment the way the app does. Only that one value goes in: this is the
   public address, not a credential. A master anywhere else is not ours to
   read, and a copy of it would be a file nothing could vouch for. */
process.env.R2_PUBLIC_BASE_URL = PUBLIC_BASE;

const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: env.R2_ACCESS_KEY_ID, secretAccessKey: env.R2_SECRET_ACCESS_KEY },
});
/* A pool, for the same reason import-album.mjs gives: four workers, and one
   pg.Client serialises them. */
const db = new pg.Pool({ connectionString: url, ssl: { rejectUnauthorized: false }, max: 6 });

/* Beside the script, never in the root. `.gitignore` covers every dotted
   working folder under scripts/dev. */
const OUT = path.join(process.cwd(), "scripts", "dev", ".screen-copies");

const mb = (n) => (n / 1048576).toFixed(1);
const keyOf = (u) => {
  const base = publicBaseFor(u);
  return base ? u.slice(base.length + 1) : null;
};
const readLedger = async (file) =>
  (await readFile(file, "utf8")).split("\n").filter(Boolean).map((l) => JSON.parse(l));
/** The ledger lines whose copy no VISIBLE Photo row names. A hidden row is a
 *  moderator's removal, which must take the bytes (audit M11) -- and a build
 *  from before this one took the master and the thumbnail and not this. */
async function unnamed(lines) {
  if (lines.length === 0) return [];
  const { rows } = await db.query(
    `SELECT "screenUrl" FROM "Photo" WHERE "screenUrl" = ANY($1::text[]) AND "isHidden" = false`,
    [lines.map((l) => l.url)]
  );
  const named = new Set(rows.map((r) => r.screenUrl));
  return lines.filter((l) => !named.has(l.url));
}
const drop = (key) =>
  s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key })).catch((e) => {
    /* A missing object is the state we wanted; anything else is worth seeing,
       because bytes nothing names can never be found again. */
    console.warn(`  could not delete ${key}: ${e.name}`);
  });

/* ------------------------------------------------------------------ *
 *  The undo.
 * ------------------------------------------------------------------ */
if (UNDO) {
  const lines = await readLedger(UNDO);
  console.log(`${lines.length} screen copies in ${UNDO}`);
  if (!APPLY) {
    console.log("DRY RUN. Add --apply to empty those columns and delete the copies.");
  } else {
    let emptied = 0;
    for (const line of lines) {
      const { rowCount } = await db.query(
        `UPDATE "Photo" SET "screenUrl" = NULL WHERE "id" = $1 AND "screenUrl" = $2`,
        [line.id, line.url]
      );
      emptied += rowCount;
      await drop(line.key);
    }
    console.log(`emptied ${emptied} column(s), deleted ${lines.length} object(s)`);
  }
  await db.end();
  process.exit(0);
}

/* ------------------------------------------------------------------ *
 *  The reconcile: copies in a ledger that no row names any more.
 * ------------------------------------------------------------------ */
if (RECONCILE) {
  const lines = await readLedger(RECONCILE);
  const orphans = await unnamed(lines);
  console.log(`${lines.length} screen copies in ${RECONCILE}; ${orphans.length} named by no row.`);
  for (const o of orphans) console.log(`  ${o.key}`);
  if (!APPLY) console.log("DRY RUN. Add --apply to delete them.");
  else {
    for (const o of orphans) await drop(o.key);
    console.log(`deleted ${orphans.length}`);
  }
  await db.end();
  process.exit(0);
}

/* ------------------------------------------------------------------ *
 *  What is left to do. Hidden rows are skipped: a moderator's removal
 *  already deleted their bytes (adminRemovePhoto), so there is no master to
 *  read. Newest first, because those are the ones being opened.
 * ------------------------------------------------------------------ */
const { rows: all } = await db.query(
  `SELECT "id", "url" FROM "Photo"
    WHERE "screenUrl" IS NULL AND "isHidden" = false
    ORDER BY "createdAt" DESC, "id" DESC`
);
const todo = LIMIT > 0 ? all.slice(0, LIMIT) : all;
console.log(`${all.length} photograph(s) with no screen copy; ${todo.length} in this run.`);

/** A row's master, read, and its screen copy, made -- or null when the master
 *  is not in this bucket. The dry run and the real one both start here. */
async function attempt(row) {
  const key = keyOf(row.url);
  if (!key) return null;
  const res = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
  const bytes = Buffer.from(await res.Body.transformToByteArray());
  return { key, bytes, ...(await screenCopy(bytes)) };
}

if (!APPLY) {
  let before = 0, after = 0;
  for (const row of todo.slice(0, 5)) {
    const a = await attempt(row);
    if (!a) {
      console.log(`  not in this bucket  ${row.url}`);
      continue;
    }
    before += a.bytes.length;
    after += a.worthKeeping ? a.copy.length : a.bytes.length;
    console.log(`  ${mb(a.bytes.length).padStart(6)}MB -> ${mb(a.copy.length).padStart(5)}MB${a.worthKeeping ? "" : "  (not lighter; would stay null)"}  ${a.key}`);
  }
  if (before) console.log(`\nthose five: ${mb(before)}MB opened today, ${mb(after)}MB with screen copies.`);
  console.log("DRY RUN. Nothing was written. Add --apply to store the copies.");
  await db.end();
  process.exit(0);
}

/* ------------------------------------------------------------------ *
 *  The run.
 * ------------------------------------------------------------------ */
await mkdir(OUT, { recursive: true });
const ledger = path.join(OUT, `${new Date().toISOString().replace(/[:.]/g, "-")}.jsonl`);
console.log(`ledger ${ledger}`);

let made = 0, lighterAlready = 0, before = 0, after = 0;
const failures = [];
/** Every copy this run stored, for the last pass below. */
const written = [];

async function one(row) {
  const a = await attempt(row);
  if (!a) throw new Error("master is not in this bucket");
  const { key, bytes, copy } = a;
  if (!a.worthKeeping) {
    lighterAlready++;
    return;
  }
  const screenKey = key.replace(/\.[a-z0-9]+$/i, "") + "-s.webp";
  const screenUrl = `${PUBLIC_BASE}/${screenKey}`;
  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: screenKey,
      Body: copy,
      ContentType: "image/webp",
      // Exactly what putImage writes: the key is unique, so cache forever.
      CacheControl: "public, max-age=31536000, immutable",
    })
  );
  /* Ledgered BEFORE the row is touched, so a crash here still leaves an undo
     that names the object. */
  await appendFile(ledger, JSON.stringify({ id: row.id, key: screenKey, url: screenUrl }) + "\n");
  /* Never onto a hidden row: a moderator who took the photograph down while
     this one was in flight has already deleted its other bytes (audit C-069),
     and must not be handed back a fresh copy of it. */
  const { rowCount } = await db.query(
    `UPDATE "Photo" SET "screenUrl" = $1
      WHERE "id" = $2 AND "isHidden" = false AND ("screenUrl" IS NULL OR "screenUrl" = $1)`,
    [screenUrl, row.id]
  );
  if (rowCount === 0) {
    // Deleted or hidden while we worked, or given a different copy: ours names nothing.
    await drop(screenKey);
    return;
  }
  written.push({ id: row.id, key: screenKey, url: screenUrl });
  made++;
  before += bytes.length;
  after += copy.length;
}

/* Four at a time: each one is a full-resolution decode and an encode, and
   this runs against the bucket that is also serving the site. */
const CONCURRENCY = 4;
const queue = [...todo];
let seen = 0;
await Promise.all(
  Array.from({ length: CONCURRENCY }, async () => {
    for (let row = queue.shift(); row; row = queue.shift()) {
      try {
        await one(row);
      } catch (e) {
        failures.push([row.url, e instanceof Error ? e.message : String(e)]);
      }
      if (++seen % 50 === 0) console.log(`  ${seen}/${todo.length}`);
    }
  })
);

/* The last pass. A photograph deleted in the instant between its row being
   read by the delete and our UPDATE landing would take its master and
   thumbnail with it and leave this copy behind; any copy whose row no longer
   names it goes now. The deploy gap is `--reconcile`'s, above. */
if (written.length) {
  const orphans = await unnamed(written);
  for (const o of orphans) await drop(o.key);
  if (orphans.length) console.log(`deleted ${orphans.length} copy(ies) whose photograph went mid-run`);
}

console.log(
  `\nmade ${made}, already light enough ${lighterAlready}, failed ${failures.length}` +
    (made ? `\nthose ${made}: ${mb(before)}MB of masters, ${mb(after)}MB of screen copies` : "")
);
for (const [u, why] of failures) console.log(`  ${why}  ${u}`);
await db.end();
