#!/usr/bin/env node
/* ------------------------------------------------------------------ *
 *  valley-terrain.mjs: the ground under the school, as a heightmap.
 *
 *  Fetches the public Mapzen "terrarium" elevation tiles (AWS Open Data,
 *  no key) around Rishi Valley School, decodes them to metres, crops a
 *  square of the given size centred on the school, and writes:
 *
 *    public/lab/valley/height-<km>km.png   16-bit height packed into R
 *                                   (high byte) and G (low byte), metres
 *                                   above sea level, north at the top
 *    public/lab/valley/height-<km>km.json  bounds, size, min/max, m per px
 *
 *  Run:  node scripts/dev/valley-terrain.mjs [--km 16] [--size 512] [--zoom 14]
 *
 *  Two crops are kept: 16 km at zoom 14 (the campus and the near hills, about
 *  31 m/px) and 64 km at zoom 12 (the far ridge, Bodikonda over the border in
 *  Karnataka, about 125 m/px). The hills room reads both: fine near the
 *  school, coarse far away, one continuous surface.
 *
 *  The tiles are Web Mercator, which is conformal, so a tile is a ground
 *  square at this latitude and the crop needs no reprojection. Source
 *  data is SRTM-class (about 30 m), so zoom 14 (about 9 m/px here) is
 *  already oversampled and zoom 13 would do; 14 is fetched so the crop
 *  edges land closer to the requested square.
 * ------------------------------------------------------------------ */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";

const SCHOOL = { lat: 13.634, lon: 78.454 }; // Wikipedia: 13.634N 78.454E
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(`--${k}`); return i >= 0 ? Number(args[i + 1]) : d; };
const KM = opt("km", 16);
const SIZE = opt("size", 512);
/* zoom 14 (about 9 m/px here) for the campus crop, zoom 12 (about 37 m/px)
   for the wide one: the source is SRTM-class either way, so a wide crop at
   zoom 14 would be 700 tiles for no extra detail. */
const Z = opt("zoom", 14);
const OUT = join(process.cwd(), "public", "lab", "valley");

const rad = (d) => (d * Math.PI) / 180;
const n = 2 ** Z;
const tileX = (lon) => ((lon + 180) / 360) * n;
const tileY = (lat) => ((1 - Math.log(Math.tan(rad(lat)) + 1 / Math.cos(rad(lat))) / Math.PI) / 2) * n;
/* ground metres per tile pixel at this latitude */
const mPerPx = (40075016.686 * Math.cos(rad(SCHOOL.lat))) / (n * 256);

const cx = tileX(SCHOOL.lon) * 256; // school in global pixel space
const cy = tileY(SCHOOL.lat) * 256;
const half = (KM * 1000) / 2 / mPerPx; // half the crop, in tile pixels
const x0 = Math.floor(cx - half), x1 = Math.ceil(cx + half);
const y0 = Math.floor(cy - half), y1 = Math.ceil(cy + half);
const tx0 = Math.floor(x0 / 256), tx1 = Math.floor((x1 - 1) / 256);
const ty0 = Math.floor(y0 / 256), ty1 = Math.floor((y1 - 1) / 256);
const cropW = x1 - x0, cropH = y1 - y0;

console.log(`school at global px (${cx.toFixed(1)}, ${cy.toFixed(1)}), ${mPerPx.toFixed(2)} m/px, crop ${cropW}x${cropH} px = ${(cropW * mPerPx / 1000).toFixed(2)} km`);
console.log(`tiles x ${tx0}..${tx1}, y ${ty0}..${ty1} (${(tx1 - tx0 + 1) * (ty1 - ty0 + 1)} tiles)`);

const heights = new Float32Array(cropW * cropH);
for (let ty = ty0; ty <= ty1; ty++) {
  for (let tx = tx0; tx <= tx1; tx++) {
    const url = `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${Z}/${tx}/${ty}.png`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${url}: ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    const { data, info } = await sharp(buf).raw().toBuffer({ resolveWithObject: true });
    const ch = info.channels;
    for (let py = 0; py < 256; py++) {
      const gy = ty * 256 + py - y0;
      if (gy < 0 || gy >= cropH) continue;
      for (let px = 0; px < 256; px++) {
        const gx = tx * 256 + px - x0;
        if (gx < 0 || gx >= cropW) continue;
        const i = (py * 256 + px) * ch;
        heights[gy * cropW + gx] = data[i] * 256 + data[i + 1] + data[i + 2] / 256 - 32768;
      }
    }
    process.stdout.write(".");
  }
}
console.log(" fetched");

/* resample the crop to SIZE x SIZE with a box filter */
const out = new Float32Array(SIZE * SIZE);
let min = Infinity, max = -Infinity;
for (let y = 0; y < SIZE; y++) {
  const sy0 = Math.floor((y / SIZE) * cropH), sy1 = Math.max(sy0 + 1, Math.floor(((y + 1) / SIZE) * cropH));
  for (let x = 0; x < SIZE; x++) {
    const sx0 = Math.floor((x / SIZE) * cropW), sx1 = Math.max(sx0 + 1, Math.floor(((x + 1) / SIZE) * cropW));
    let s = 0, c = 0;
    for (let yy = sy0; yy < sy1; yy++) for (let xx = sx0; xx < sx1; xx++) { s += heights[yy * cropW + xx]; c++; }
    const h = s / c;
    out[y * SIZE + x] = h;
    if (h < min) min = h; if (h > max) max = h;
  }
}

/* pack: R high byte, G low byte of round(h) in metres; B unused */
const rgb = Buffer.alloc(SIZE * SIZE * 3);
for (let i = 0; i < SIZE * SIZE; i++) {
  const h = Math.max(0, Math.min(65535, Math.round(out[i])));
  rgb[i * 3] = h >> 8; rgb[i * 3 + 1] = h & 255; rgb[i * 3 + 2] = 0;
}
mkdirSync(OUT, { recursive: true });
await sharp(rgb, { raw: { width: SIZE, height: SIZE, channels: 3 } }).png({ compressionLevel: 9, palette: false }).toFile(join(OUT, `height-${KM}km.png`));

const metresPerPx = (cropW * mPerPx) / SIZE;
const schoolPx = { x: ((cx - x0) / cropW) * SIZE, y: ((cy - y0) / cropH) * SIZE };
const meta = {
  source: `Mapzen terrarium tiles (AWS Open Data), SRTM-class elevation, zoom ${Z}`,
  school: SCHOOL,
  size: SIZE,
  km: (cropW * mPerPx) / 1000,
  metresPerPx,
  min: Math.round(min), max: Math.round(max),
  schoolPx,
  schoolHeight: Math.round(out[Math.round(schoolPx.y) * SIZE + Math.round(schoolPx.x)]),
};
writeFileSync(join(OUT, `height-${KM}km.json`), JSON.stringify(meta, null, 2) + "\n");
console.log(meta);

/* a coarse relief print so the shape can be eyeballed in a terminal */
const ramp = " .:-=+*#%@";
for (let y = 0; y < SIZE; y += SIZE / 32) {
  let line = "";
  for (let x = 0; x < SIZE; x += SIZE / 64) {
    const h = out[Math.floor(y) * SIZE + Math.floor(x)];
    line += ramp[Math.min(9, Math.floor(((h - min) / (max - min + 1e-6)) * 10))];
  }
  console.log(line);
}
/* where are the high points? top 6 local maxima, with bearing from the school */
const peaks = [];
const step = 8;
for (let y = step; y < SIZE - step; y += 2) for (let x = step; x < SIZE - step; x += 2) {
  const h = out[y * SIZE + x];
  let top = true;
  for (let dy = -step; dy <= step && top; dy += 2) for (let dx = -step; dx <= step; dx += 2) {
    if ((dx || dy) && out[(y + dy) * SIZE + x + dx] > h) { top = false; break; }
  }
  if (top) peaks.push({ x, y, h });
}
peaks.sort((a, b) => b.h - a.h);
for (const p of peaks.slice(0, 8)) {
  const dx = (p.x - schoolPx.x) * metresPerPx, dy = (schoolPx.y - p.y) * metresPerPx;
  const bearing = ((Math.atan2(dx, dy) * 180) / Math.PI + 360) % 360;
  console.log(`peak ${Math.round(p.h)} m at ${(Math.hypot(dx, dy) / 1000).toFixed(2)} km, bearing ${bearing.toFixed(0)} deg (px ${p.x},${p.y})`);
}
