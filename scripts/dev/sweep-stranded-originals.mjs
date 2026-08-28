#!/usr/bin/env node
/* ------------------------------------------------------------------ *
 *  Delete the staged originals stranded inside the Collection's own
 *  folder.
 *
 *  WHY: a Collection contribution PUTs the untouched original straight
 *  to storage the moment a file is dropped, which is what makes a drop of
 *  a hundred feel instant, and deletes it once the display copy is made.
 *  A drop that is abandoned never reaches that delete. Until 2026-08-28
 *  those originals were minted under `collection/<userId>/...`, beside the
 *  archive's own photographs -- so nothing could clean them up: this system
 *  cannot enumerate the bucket (audit C-063, deliberate), and an R2
 *  lifecycle rule matches a PREFIX, which here would take the real
 *  photographs with it.
 *
 *  It is not only wasted bytes. These are the UNTOUCHED files, so a phone
 *  photograph still carries the GPS coordinates it was taken at -- which is
 *  the whole reason the successful path deletes it (audit M12) -- and they
 *  are served from a public bucket. Sixty were measured stranded on
 *  2026-08-28, one confirmed readable over the open internet.
 *
 *  New contributions stage under `staging/` now, where one lifecycle rule
 *  closes it permanently. This is the one-off for what is already there.
 *
 *  SAFETY: it only ever considers keys ending `-o.<ext>` under
 *  `collection/`, and it refuses any key that ANY row in the database
 *  points at, checked against Photo, Image, Post and CatchupEntry. A
 *  display image is `<cuid>.webp` and a thumbnail `<cuid>-t.webp`, so the
 *  archive's own photographs cannot match the pattern in the first place;
 *  the database check is the second lock, not the first.
 *
 *  RUN IT TWICE. Once now, and once more after the change that moves new
 *  originals to `staging/` has been deployed -- production keeps minting
 *  the old shape until then. After that second run this script has no
 *  live question to answer and should be deleted along with its line in
 *  scripts/README.md.
 *
 *  Run: node scripts/dev/sweep-stranded-originals.mjs [--apply]
 *                                                     [--env .env.demo]
 * ------------------------------------------------------------------ */

import pg from "pg";
import { readEnv } from "./_env.mjs";
import { S3Client, ListObjectsV2Command, DeleteObjectCommand } from "@aws-sdk/client-s3";

const argv = process.argv.slice(2);
const APPLY = argv.includes("--apply");
const envFile = argv.includes("--env") ? argv[argv.indexOf("--env") + 1] : ".env";
const env = readEnv([envFile]);

const url = env.DIRECT_URL || env.DATABASE_URL;
if (!url) {
  console.error(`No DIRECT_URL or DATABASE_URL found in ${envFile}`);
  process.exit(1);
}
const DEMO_REF = "cbvlzptghkuxhygyaezq";
if (envFile.includes("demo") && !url.includes(DEMO_REF)) {
  console.error(`refusing: ${envFile} was asked for, but the connection does not carry the demo ref`);
  process.exit(1);
}
for (const k of ["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET", "R2_PUBLIC_BASE_URL"]) {
  if (!env[k]) {
    console.error(`${k} is missing from ${envFile}; this script talks to the bucket directly.`);
    process.exit(1);
  }
}

const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: env.R2_ACCESS_KEY_ID, secretAccessKey: env.R2_SECRET_ACCESS_KEY },
});
const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await client.connect();

/** Every object under `collection/`, paged. */
async function stranded() {
  const out = [];
  let token;
  do {
    const r = await s3.send(
      new ListObjectsV2Command({ Bucket: env.R2_BUCKET, Prefix: "collection/", ContinuationToken: token })
    );
    for (const o of r.Contents ?? []) {
      // The staged original, and nothing else. A display image is
      // `<cuid>.webp` and a thumbnail `<cuid>-t.webp`; neither can match.
      if (/-o\.(jpg|jpeg|png|webp|gif)$/.test(o.Key)) out.push({ key: o.Key, size: o.Size, at: o.LastModified });
    }
    token = r.IsTruncated ? r.NextContinuationToken : undefined;
  } while (token);
  return out;
}

/** Every url any row in the database points at. The second lock. */
async function referenced() {
  const seen = new Set();
  const add = (v) => v && seen.add(v);
  for (const [table, cols] of [
    ["Photo", ['"url"', '"thumbUrl"']],
    ["Image", ['"url"']],
  ]) {
    for (const col of cols) {
      const { rows } = await client.query(`SELECT ${col} AS u FROM "${table}" WHERE ${col} IS NOT NULL`);
      rows.forEach((r) => add(r.u));
    }
  }
  for (const table of ["Post", "CatchupEntry"]) {
    const { rows } = await client.query(
      `SELECT DISTINCT jsonb_array_elements_text("images"::jsonb) AS u
         FROM "${table}" WHERE "images" IS NOT NULL AND "images" <> '' AND "images" <> '[]'`
    );
    rows.forEach((r) => add(r.u));
  }
  return seen;
}

const base = env.R2_PUBLIC_BASE_URL.replace(/\/+$/, "");
const found = await stranded();
const inUse = await referenced();

const safe = [];
const keep = [];
for (const o of found) {
  (inUse.has(`${base}/${o.key}`) ? keep : safe).push(o);
}

const mb = (n) => (n / 1048576).toFixed(2);
console.log(
  `${found.length} staged original(s) under collection/ in ${env.R2_BUCKET}, ` +
    `${mb(found.reduce((n, o) => n + o.size, 0))} MB.`
);
if (keep.length) {
  // Should be impossible: a row never points at a `-o.` key. Loud, not silent.
  console.log(`\n${keep.length} REFUSED because a database row points at them:`);
  for (const o of keep) console.log(`  ${o.key}`);
}
console.log(`\n${safe.length} to delete, ${mb(safe.reduce((n, o) => n + o.size, 0))} MB:`);
for (const o of safe.slice(0, 10)) {
  console.log(`  ${o.at.toISOString().slice(0, 10)}  ${(o.size / 1024).toFixed(0)}KB  ${o.key}`);
}
if (safe.length > 10) console.log(`  ...and ${safe.length - 10} more`);

if (!APPLY) {
  console.log(`\nDry run. Add --apply to delete them.`);
  await client.end();
  process.exit(0);
}

let gone = 0;
const failures = [];
for (const o of safe) {
  try {
    await s3.send(new DeleteObjectCommand({ Bucket: env.R2_BUCKET, Key: o.key }));
    gone += 1;
  } catch (err) {
    failures.push([o.key, err instanceof Error ? err.message : String(err)]);
  }
}
console.log(`\ndeleted ${gone}, failed ${failures.length}`);
for (const [k, why] of failures) console.log(`  ${why}  ${k}`);
await client.end();
