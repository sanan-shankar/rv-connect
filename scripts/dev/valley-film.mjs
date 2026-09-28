#!/usr/bin/env node
/* ------------------------------------------------------------------ *
 *  valley-film.mjs: the ground the valley film flies over.
 *
 *  Writes, under public/lab/valley/film/ (gitignored, served by the dev
 *  server only, so nothing here reaches a deploy):
 *
 *    dem-inner.png, dem-outer.png   elevation, terrarium-encoded
 *        (R*256 + G + B/256 - 32768 metres), 2048 px square, centred on
 *        the school: inner at zoom 13 (18.6 m/px, 38 km across), outer at
 *        zoom 11 (74 m/px, 152 km across). Mapzen terrarium tiles, AWS
 *        Open Data, no key; SRTM-class (about 30 m) underneath.
 *    dem.json                       where each mosaic sits in the world
 *    imagery/<z>/<x>/<y>.jpg        Esri World Imagery tiles, exactly the
 *        ones the film's camera asks for: the room's own tile rule
 *        (_geo.ts selectTiles) run over every frame of _flight.ts, for
 *        a landscape and a portrait frame
 *    imagery.json                   the list of tiles present
 *
 *  Run: node scripts/dev/valley-film.mjs [--dry]
 *  Re-run after changing the flight: tiles already on disk are kept, so
 *  it only fetches what the new path adds. --dry counts without fetching.
 *
 *  The imagery's licence is not settled for a public page; see
 *  docs/planning/valley/storyboard.md. Hence the gitignore.
 * ------------------------------------------------------------------ */
import { mkdirSync, writeFileSync, existsSync, readFileSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { ORIGIN, MERC_M, mercX, mercY, tileRect, selectTiles, cameraAt, viewOf, demGround, tileHeightRange } from "../../src/app/lab/valley/_geo.ts";
import { FLIGHT, DURATION, ROOTS, maxZoomAt } from "../../src/app/lab/valley/_flight.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const OUT = join(ROOT, "public", "lab", "valley", "film");
/* raw terrarium tiles, kept beside this script so a re-run is free */
const CACHE = join(dirname(fileURLToPath(import.meta.url)), ".valley-film");
const DRY = process.argv.includes("--dry");
const UA = { "User-Agent": "rv-connect-lab/1.0 (one-off fetch for a lab prototype)" };

mkdirSync(OUT, { recursive: true });
mkdirSync(CACHE, { recursive: true });

async function fetchRetry(url, tries = 4) {
  for (let i = 0; ; i++) {
    try {
      const res = await fetch(url, { headers: UA });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`${res.status}`);
      return Buffer.from(await res.arrayBuffer());
    } catch (e) {
      if (i >= tries - 1) throw new Error(`${url}: ${e.message}`);
      await new Promise((r) => setTimeout(r, 800 * (i + 1)));
    }
  }
}

/** Runs jobs with at most `n` in flight. */
async function pool(items, n, job) {
  let next = 0, done = 0;
  const workers = Array.from({ length: n }, async () => {
    while (next < items.length) {
      const i = next++;
      await job(items[i], i);
      if (++done % 50 === 0) process.stdout.write(`${done} `);
    }
  });
  await Promise.all(workers);
}

/* ---- elevation ---------------------------------------------------- */

async function demMosaic(z, size) {
  const n = 2 ** z;
  const cx = mercX(ORIGIN.lon) * n * 256, cy = mercY(ORIGIN.lat) * n * 256;
  const x0 = Math.round(cx - size / 2), y0 = Math.round(cy - size / 2);
  const tx0 = Math.floor(x0 / 256), tx1 = Math.floor((x0 + size - 1) / 256);
  const ty0 = Math.floor(y0 / 256), ty1 = Math.floor((y0 + size - 1) / 256);
  const h = new Float32Array(size * size);
  const tiles = [];
  for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) tiles.push([tx, ty]);
  await pool(tiles, 8, async ([tx, ty]) => {
    const file = join(CACHE, `terrarium-${z}-${tx}-${ty}.png`);
    let buf;
    if (existsSync(file)) buf = readFileSync(file);
    else {
      buf = await fetchRetry(`https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${z}/${tx}/${ty}.png`);
      writeFileSync(file, buf);
    }
    const { data, info } = await sharp(buf).raw().toBuffer({ resolveWithObject: true });
    const ch = info.channels;
    for (let py = 0; py < 256; py++) {
      const gy = ty * 256 + py - y0;
      if (gy < 0 || gy >= size) continue;
      for (let px = 0; px < 256; px++) {
        const gx = tx * 256 + px - x0;
        if (gx < 0 || gx >= size) continue;
        const i = (py * 256 + px) * ch;
        h[gy * size + gx] = data[i] * 256 + data[i + 1] + data[i + 2] / 256 - 32768;
      }
    }
  });
  const rgb = Buffer.alloc(size * size * 3);
  for (let i = 0; i < h.length; i++) {
    const v = h[i] + 32768;
    const r = Math.floor(v / 256), g = Math.floor(v) % 256, b = Math.round((v - Math.floor(v)) * 256) % 256;
    rgb[i * 3] = r; rgb[i * 3 + 1] = g; rgb[i * 3 + 2] = b;
  }
  /* The world square the mosaic covers: texel i spans global pixel x0+i. */
  const west = (x0 / (n * 256) - mercX(ORIGIN.lon)) * MERC_M;
  const north = (y0 / (n * 256) - mercY(ORIGIN.lat)) * MERC_M;
  const span = (size / (n * 256)) * MERC_M;
  return { h, rgb, rect: { x0: west, z0: north, size: span, px: size, zoom: z } };
}

console.log("elevation: zoom 13 and zoom 11 mosaics");
const inner = await demMosaic(13, 2048);
const outer = await demMosaic(11, 2048);
if (!DRY) {
  for (const [name, m] of [["inner", inner], ["outer", outer]]) {
    await sharp(m.rgb, { raw: { width: m.rect.px, height: m.rect.px, channels: 3 } })
      .png({ compressionLevel: 9 }).toFile(join(OUT, `dem-${name}.png`));
  }
  writeFileSync(join(OUT, "dem.json"), JSON.stringify({
    source: "Mapzen terrarium (AWS Open Data), SRTM-class",
    encoding: "terrarium: R*256 + G + B/256 - 32768 metres",
    inner: inner.rect, outer: outer.rect,
  }, null, 2) + "\n");
}

const ground = (x, z) => demGround([inner, outer], x, z);
const rangeCache = new Map();
const range = (z, x, y) => tileHeightRange(ground, rangeCache, z, x, y);

/* ---- the flight's clearance, so a key never dips into a hill ---- */
let worst = Infinity, worstT = 0;
for (let t = 0; t <= DURATION; t += 0.05) {
  const s = cameraAt(FLIGHT, t);
  const c = s.eye[1] - ground(s.eye[0], s.eye[2]);
  if (c < worst) { worst = c; worstT = t; }
}
console.log(`lowest clearance ${worst.toFixed(0)} m above ground at t=${worstT.toFixed(2)}s`);
for (const k of FLIGHT) console.log(`  key t=${k.t}: ${(k.eye[1] - ground(k.eye[0], k.eye[2])).toFixed(0)} m above ground (${ground(k.eye[0], k.eye[2]).toFixed(0)} m)`);

/* ---- which imagery the flight asks for ---------------------------- */
const want = new Set();
const add = (z, x, y) => { for (let zz = z; zz >= 8; zz--) { want.add(`${zz}/${x}/${y}`); x >>= 1; y >>= 1; } };
for (const aspect of [16 / 9, 390 / 844, 1440 / 900]) {
  for (let t = 0; t <= DURATION + 1e-6; t += 1 / 30) {
    const view = viewOf(cameraAt(FLIGHT, Math.min(t, DURATION)), aspect);
    selectTiles(view, ROOTS, range, () => true, () => true, maxZoomAt, (k) => add(k.z, k.x, k.y));
  }
}
const list = [...want].map((s) => s.split("/").map(Number)).sort((a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2]);
const byZoom = {};
for (const [z] of list) byZoom[z] = (byZoom[z] ?? 0) + 1;
console.log(`imagery: ${list.length} tiles`, byZoom);
if (DRY) process.exit(0);

const have = [];
let fetched = 0, blank = 0;
await pool(list, 6, async ([z, x, y]) => {
  const file = join(OUT, "imagery", `${z}`, `${x}`, `${y}.jpg`);
  if (existsSync(file) && statSync(file).size > 0) { have.push([z, x, y]); return; }
  const buf = await fetchRetry(`https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}`);
  /* The server answers "no imagery here" with a small flat-grey tile
     reading "Map data not yet available" (2.5 KB, grey 204). Size alone
     cannot tell it from a tile of solid cloud, so it is told by colour. */
  if (!buf) { blank++; return; }
  if (buf.length < 4000) {
    const { channels } = await sharp(buf).stats();
    if (channels.slice(0, 3).every((c) => Math.abs(c.mean - 204) < 8)) { blank++; return; }
  }
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, buf);
  fetched++;
  have.push([z, x, y]);
});
console.log(`\nfetched ${fetched}, already had ${have.length - fetched}, blank ${blank}`);

/* The server's zoom levels are different photographs: zoom 14 here is a
   greener, darker pass than the zoom 16 under it, so a tile sharpening in
   would change colour as it did. Wherever all four children are on disk,
   the parent is rebuilt from them, from the finest level up, so every
   level the flight sees is the same photograph at a different size. */
const onDisk = new Set(have.map(([z, x, y]) => `${z}/${x}/${y}`));
let rebuilt = 0;
for (let z = 17; z >= 8; z--) {
  const parents = have.filter(([zz]) => zz === z);
  await pool(parents, 8, async ([, x, y]) => {
    const kids = [[0, 0], [1, 0], [0, 1], [1, 1]].map(([i, j]) => join(OUT, "imagery", `${z + 1}`, `${2 * x + i}`, `${2 * y + j}.jpg`));
    if (!kids.every((f, k) => onDisk.has(`${z + 1}/${2 * x + [0, 1, 0, 1][k]}/${2 * y + [0, 0, 1, 1][k]}`) && existsSync(f))) return;
    const tiles = await Promise.all(kids.map((f) => sharp(f).resize(256, 256).toBuffer()));
    const big = await sharp({ create: { width: 512, height: 512, channels: 3, background: "#000" } })
      .composite(tiles.map((input, k) => ({ input, left: (k % 2) * 256, top: Math.floor(k / 2) * 256 })))
      .png().toBuffer();
    await sharp(big).resize(256, 256, { kernel: "lanczos3" }).jpeg({ quality: 90, mozjpeg: true })
      .toFile(join(OUT, "imagery", `${z}`, `${x}`, `${y}.jpg`));
    rebuilt++;
  });
}
console.log(`\nrebuilt ${rebuilt} coarser tiles from their children`);
have.sort((a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2]);
writeFileSync(join(OUT, "imagery.json"), JSON.stringify({
  source: "Esri World Imagery (Maxar and others); lab only, licence unsettled for a public page",
  tiles: have.map(([z, x, y]) => `${z}/${x}/${y}`),
}) + "\n");

/* ---- trees --------------------------------------------------------- *
   The photographs show every crown as a dark, textured green blob; flat
   on the ground they read as a painted carpet from low down. So every
   crown is found and stood up as a tree the room draws in 3D: the
   canopy mask (green, dark, rough, which leaves out the smooth brighter
   green of crop fields), its distance transform, and a greedy packing of
   circles into it, biggest first, so a banyan's canopy becomes a clump
   of crowns rather than one blob. Zoom 17, 1.2 m a pixel, wherever the
   flight fetched it. Written as trees.bin: per tree x, z, crown radius,
   height (metres) and colour (linear 0..1), eight floats with a seed. */
const TZ = 17;
const APRON = 16;
const tiles17 = have.filter(([z]) => z === TZ);
const tileSet = new Set(tiles17.map(([, x, y]) => `${x}/${y}`));
const pixelCache = new Map();
async function pixels(x, y) {
  const k = `${x}/${y}`;
  if (!tileSet.has(k)) return null;
  if (!pixelCache.has(k)) {
    if (pixelCache.size > 64) pixelCache.delete(pixelCache.keys().next().value);
    const { data } = await sharp(join(OUT, "imagery", `${TZ}`, `${x}`, `${y}.jpg`)).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    pixelCache.set(k, data);
  }
  return pixelCache.get(k);
}
const trees = [];
let rng = 1234567;
const rand = () => ((rng = (rng * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
const lin = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const S = 256 + 2 * APRON;
tiles17.sort((a, b) => a[2] - b[2] || a[1] - b[1]);
for (const [, tx, ty] of tiles17) {
  /* the tile with a margin borrowed from its neighbours */
  const rgb = new Float32Array(S * S * 3);
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    const px = await pixels(tx + dx, ty + dy);
    if (!px) continue;
    for (let j = 0; j < 256; j++) {
      const gy = j + dy * 256 + APRON;
      if (gy < 0 || gy >= S) continue;
      for (let i = 0; i < 256; i++) {
        const gx = i + dx * 256 + APRON;
        if (gx < 0 || gx >= S) continue;
        const a = (j * 256 + i) * 3, b = (gy * S + gx) * 3;
        rgb[b] = px[a] / 255; rgb[b + 1] = px[a + 1] / 255; rgb[b + 2] = px[a + 2] / 255;
      }
    }
  }
  const lum = new Float32Array(S * S);
  for (let i = 0; i < S * S; i++) lum[i] = 0.2126 * rgb[i * 3] + 0.7152 * rgb[i * 3 + 1] + 0.0722 * rgb[i * 3 + 2];
  /* roughness: the standard deviation of brightness over 5x5, from
     integral images */
  const I1 = new Float64Array((S + 1) * (S + 1)), I2 = new Float64Array((S + 1) * (S + 1));
  for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) {
    const v = lum[j * S + i], k = (j + 1) * (S + 1) + i + 1;
    I1[k] = v + I1[k - 1] + I1[k - S - 1] - I1[k - S - 2];
    I2[k] = v * v + I2[k - 1] + I2[k - S - 1] - I2[k - S - 2];
  }
  const box = (I, i0, j0, i1, j1) => I[j1 * (S + 1) + i1] - I[j0 * (S + 1) + i1] - I[j1 * (S + 1) + i0] + I[j0 * (S + 1) + i0];
  const mask = new Uint8Array(S * S);
  for (let j = 2; j < S - 2; j++) for (let i = 2; i < S - 2; i++) {
    const k = j * S + i;
    const r = rgb[k * 3], g = rgb[k * 3 + 1], b = rgb[k * 3 + 2], l = lum[k];
    if (!(g - r > 0.015 && g - b > 0.03 && l < 0.35)) continue;
    const m1 = box(I1, i - 2, j - 2, i + 3, j + 3) / 25, m2 = box(I2, i - 2, j - 2, i + 3, j + 3) / 25;
    const sd = Math.sqrt(Math.max(m2 - m1 * m1, 0));
    if (sd > 0.02 || l < 0.22) mask[k] = 1;
  }
  /* chamfer distance to the nearest non-canopy pixel */
  const dt = new Float32Array(S * S);
  for (let k = 0; k < S * S; k++) dt[k] = mask[k] ? 1e6 : 0;
  for (let j = 1; j < S - 1; j++) for (let i = 1; i < S - 1; i++) {
    const k = j * S + i;
    if (!dt[k]) continue;
    dt[k] = Math.min(dt[k], dt[k - 1] + 1, dt[k - S] + 1, dt[k - S - 1] + 1.414, dt[k - S + 1] + 1.414);
  }
  for (let j = S - 2; j > 0; j--) for (let i = S - 2; i > 0; i--) {
    const k = j * S + i;
    if (!dt[k]) continue;
    dt[k] = Math.min(dt[k], dt[k + 1] + 1, dt[k + S] + 1, dt[k + S + 1] + 1.414, dt[k + S - 1] + 1.414);
  }
  const cand = [];
  for (let j = APRON - 8; j < S - APRON + 8; j++) for (let i = APRON - 8; i < S - APRON + 8; i++) {
    const k = j * S + i, d = dt[k];
    if (d < 1.8) continue;
    if (d >= dt[k - 1] && d >= dt[k + 1] && d >= dt[k - S] && d >= dt[k + S]) cand.push([d + rand() * 0.3, i, j]);
  }
  cand.sort((a, b) => b[0] - a[0]);
  const mpp = tileRect(TZ, tx, ty).size / 256;
  const placed = [];
  for (const [d, i, j] of cand) {
    const rp = Math.min(d + 0.6, 8 / mpp);
    let ok = true;
    for (const [pi, pj, pr] of placed) if ((pi - i) ** 2 + (pj - j) ** 2 < (0.8 * (rp + pr)) ** 2) { ok = false; break; }
    if (!ok) continue;
    placed.push([i, j, rp]);
  }
  const rect = tileRect(TZ, tx, ty);
  for (const [i, j, rp] of placed) {
    /* only the crowns whose centre is in this tile; the margin was for
       the distances */
    if (i < APRON || j < APRON || i >= APRON + 256 || j >= APRON + 256) continue;
    let cr = 0, cg = 0, cb = 0, n = 0;
    const ri = Math.ceil(rp);
    for (let v = -ri; v <= ri; v++) for (let u = -ri; u <= ri; u++) {
      if (u * u + v * v > rp * rp) continue;
      const k = (j + v) * S + (i + u);
      if (k < 0 || k >= S * S || !mask[k]) continue;
      cr += lin(rgb[k * 3]); cg += lin(rgb[k * 3 + 1]); cb += lin(rgb[k * 3 + 2]); n++;
    }
    if (!n) continue;
    const rm = rp * mpp;
    const hm = Math.min(22, Math.max(3.5, rm * (1.55 + rand() * 0.6) + 1.5));
    trees.push(rect.x0 + (i - APRON + 0.5) * mpp, rect.z0 + (j - APRON + 0.5) * mpp, rm, hm, cr / n, cg / n, cb / n, rand());
  }
}
writeFileSync(join(OUT, "trees.bin"), Buffer.from(new Float32Array(trees).buffer));
console.log(`trees: ${trees.length / 8} crowns from ${tiles17.length} zoom-${TZ} tiles`);

