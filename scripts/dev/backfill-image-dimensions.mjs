#!/usr/bin/env node
/* ------------------------------------------------------------------ *
 *  Measure every image already in the database.
 *
 *  WHY: `Image` (2026-08-27) records the shape of a stored image, its focal
 *  point, whether it has any colour, and a 16px smear to hold its place while
 *  it loads. Every NEW upload gets a row on the way past. Everything already
 *  posted -- feed photographs, letter photographs, Catch-up photographs, all
 *  held as bare URL strings in a JSON column -- has none, and without one the
 *  layout has to fall back to the old guesswork for it. This is the one-off
 *  that fills them in.
 *
 *  Safe to run repeatedly and safe to interrupt: it only looks at urls with no
 *  row yet, so a second run picks up where the first stopped. Nothing is
 *  deleted and no other table is touched.
 *
 *  A url whose bytes are gone (a 404 from the bucket) is reported and skipped,
 *  not retried into the ground -- but it stays rowless, so it will be tried
 *  again on the next run. That is deliberate: a 404 during a bad minute at the
 *  CDN is not evidence the photograph is gone forever, and the honest place to
 *  decide otherwise is a human reading the count this prints.
 *
 *  Run: node scripts/dev/backfill-image-dimensions.mjs [--dry] [--limit N]
 *                                                     [--env .env.demo]
 * ------------------------------------------------------------------ */

import { readFile } from "node:fs/promises";
import path from "node:path";
import pg from "pg";
import { readEnv } from "./_env.mjs";
import { describeImage } from "../../src/lib/image.ts";

const argv = process.argv.slice(2);
const flag = (name) => argv.includes(name);
const value = (name, fallback) => {
  const i = argv.indexOf(name);
  return i === -1 ? fallback : argv[i + 1];
};

const DRY = flag("--dry");
const LIMIT = Number(value("--limit", Infinity));
const envFile = value("--env", ".env");
const env = readEnv([envFile]);
const url = env.DIRECT_URL || env.DATABASE_URL;
if (!url) {
  console.error(`No DIRECT_URL or DATABASE_URL found in ${envFile}`);
  process.exit(1);
}
/* The same destination check run-sql.mjs makes: asking for the demo and
   getting production is the worst outcome a script in this folder has. */
const DEMO_REF = "cbvlzptghkuxhygyaezq";
if (envFile.includes("demo") && !url.includes(DEMO_REF)) {
  console.error(`refusing: ${envFile} was asked for, but the connection does not carry the demo ref`);
  process.exit(1);
}

const client = new pg.Client({ connectionString: url });
await client.connect();

/** Every url held in a JSON array column, flattened, with the empties gone. */
async function urlsFrom(table, column) {
  const { rows } = await client.query(
    `SELECT DISTINCT jsonb_array_elements_text("${column}"::jsonb) AS url
       FROM "${table}"
      WHERE "${column}" IS NOT NULL AND "${column}" <> '' AND "${column}" <> '[]'`
  );
  return rows.map((r) => r.url).filter(Boolean);
}

const posts = await urlsFrom("Post", "images");
const entries = await urlsFrom("CatchupEntry", "images");
const all = [...new Set([...posts, ...entries])];

const { rows: known } = await client.query(`SELECT url FROM "Image"`);
const seen = new Set(known.map((r) => r.url));
const todo = all.filter((u) => !seen.has(u)).slice(0, LIMIT);

console.log(
  `${all.length} image url(s) in the database (${posts.length} on posts and letters, ` +
    `${entries.length} on Catch-up answers). ${seen.size} already measured, ${todo.length} to do.`
);
if (DRY) {
  for (const u of todo.slice(0, 20)) console.log(`  would measure ${u}`);
  if (todo.length > 20) console.log(`  ...and ${todo.length - 20} more`);
  await client.end();
  process.exit(0);
}

/** The bytes behind one of our public urls. Local dev writes root-relative
 *  paths under public/; production writes absolute ones on the bucket's host. */
async function bytesFor(u) {
  if (u.startsWith("/")) return readFile(path.join(process.cwd(), "public", u.slice(1)));
  const res = await fetch(u);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

let measured = 0;
const failures = [];
/* One at a time, deliberately. This runs against the live bucket that is also
   serving the site, it is a one-off with no deadline, and a fleet of parallel
   fetches is the kind of thing that costs more than it saves. */
for (const [i, u] of todo.entries()) {
  try {
    const facts = await describeImage(await bytesFor(u));
    if (!facts) throw new Error("could not be measured");
    await client.query(
      `INSERT INTO "Image" ("url", "width", "height", "focalX", "focalY", "greyscale", "blurDataUrl")
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT ("url") DO UPDATE SET
         "width" = EXCLUDED."width", "height" = EXCLUDED."height",
         "focalX" = EXCLUDED."focalX", "focalY" = EXCLUDED."focalY",
         "greyscale" = EXCLUDED."greyscale", "blurDataUrl" = EXCLUDED."blurDataUrl"`,
      [u, facts.width, facts.height, facts.focalX, facts.focalY, facts.greyscale, facts.blurDataUrl]
    );
    measured += 1;
    console.log(
      `  ${i + 1}/${todo.length} ${facts.width}x${facts.height}` +
        `${facts.greyscale ? " b&w" : ""} focal ${facts.focalX.toFixed(2)},${facts.focalY.toFixed(2)}  ${u}`
    );
  } catch (err) {
    failures.push([u, err instanceof Error ? err.message : String(err)]);
  }
}

console.log(`\nmeasured ${measured}, failed ${failures.length}`);
for (const [u, why] of failures) console.log(`  ${why}  ${u}`);
await client.end();
