#!/usr/bin/env node
/* ------------------------------------------------------------------ *
 *  wall-atlas.mjs: every Collection thumbnail packed onto a few sheets,
 *  for /lab/years/wall.
 *
 *  The wall draws all 1,800-odd photographs at once, and at that size
 *  each one is twenty to sixty pixels across. Loading 1,800 separate
 *  480px thumbnails for that is 60 MB and 1,800 requests; a texture atlas
 *  is two files. So this reads every approved photograph, fetches its
 *  thumbnail from the image host, fits it inside a 64px square keeping
 *  its own shape, and shelf-packs the results into 2048px WebP sheets:
 *
 *    public/lab/wall/atlas-<n>.webp   the sheets, about 1,000 tiles each
 *    public/lab/wall/atlas.json       id -> { sheet, x, y, w, h }
 *
 *  THE FOLDER IS GITIGNORED. These are real photographs, some of them a
 *  class's own, and nothing under public/ may reach the demo domain or a
 *  deploy. The dev server serves them; the room says "run this" when the
 *  file is missing. The production shape of this is the same script
 *  writing to R2 behind the visibility rule; that is not built.
 *
 *  Run:  node scripts/dev/wall-atlas.mjs [--tile 64] [--sheet 2048]
 *
 *  Read-only against the database. Skips a thumbnail the host no longer
 *  has (two of the 96 valley rows answered 404 on 2026-09-16) and says so.
 *  About a minute for 1,815.
 * ------------------------------------------------------------------ */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import pg from "pg";
import sharp from "sharp";
import { databaseUrl } from "./_env.mjs";

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(`--${k}`); return i >= 0 ? Number(args[i + 1]) : d; };
const TILE = opt("tile", 64);
const SHEET = opt("sheet", 2048);
const OUT = join(process.cwd(), "public", "lab", "wall");
const CONCURRENCY = 12;

const { url } = databaseUrl(".env");
const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await client.connect();
const { rows } = await client.query(
  `SELECT id, "thumbUrl", width, height FROM "Photo" WHERE approved AND NOT "isHidden" ORDER BY "takenKey" DESC, id DESC`
);
await client.end();
console.log(`${rows.length} photographs`);

/* fetch and shrink, a dozen at a time */
const tiles = new Array(rows.length).fill(null);
let next = 0, missing = 0;
async function worker() {
  while (next < rows.length) {
    const i = next++;
    const r = rows[i];
    try {
      const res = await fetch(r.thumbUrl);
      const buf = Buffer.from(await res.arrayBuffer());
      if (!res.ok || buf.length < 100) { missing++; console.log(`  missing ${res.status} ${r.id}`); continue; }
      const img = sharp(buf).resize(TILE, TILE, { fit: "inside", withoutEnlargement: false });
      const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
      tiles[i] = { id: r.id, w: info.width, h: info.height, ch: info.channels, data };
    } catch (e) {
      missing++;
      console.log(`  failed ${r.id}: ${e.message}`);
    }
    if (i % 200 === 0) console.log(`  ${i}/${rows.length}`);
  }
}
await Promise.all(Array.from({ length: CONCURRENCY }, worker));

/* shelf packing: rows TILE tall, tiles placed left to right by width */
mkdirSync(OUT, { recursive: true });
const index = {};
let sheetNo = 0, x = 0, y = 0;
let composites = [];
const flush = async () => {
  if (!composites.length) return;
  await sharp({ create: { width: SHEET, height: SHEET, channels: 3, background: "#1c1a17" } })
    .composite(composites)
    .webp({ quality: 82 })
    .toFile(join(OUT, `atlas-${sheetNo}.webp`));
  console.log(`  wrote atlas-${sheetNo}.webp (${composites.length} tiles)`);
  composites = [];
  sheetNo++;
  x = 0; y = 0;
};
for (const t of tiles) {
  if (!t) continue;
  if (x + t.w > SHEET) { x = 0; y += TILE; }
  if (y + TILE > SHEET) await flush();
  const rgb = t.ch === 3 ? t.data : stripAlpha(t.data, t.w * t.h);
  composites.push({ input: rgb, raw: { width: t.w, height: t.h, channels: 3 }, left: x, top: y });
  index[t.id] = { s: sheetNo, x, y, w: t.w, h: t.h };
  x += t.w;
}
await flush();
writeFileSync(join(OUT, "atlas.json"), JSON.stringify({ tile: TILE, sheet: SHEET, sheets: sheetNo, tiles: index }));
console.log(`done: ${Object.keys(index).length} tiles on ${sheetNo} sheets, ${missing} missing`);

function stripAlpha(data, px) {
  const out = Buffer.alloc(px * 3);
  for (let i = 0; i < px; i++) { out[i * 3] = data[i * 4]; out[i * 3 + 1] = data[i * 4 + 1]; out[i * 3 + 2] = data[i * 4 + 2]; }
  return out;
}
