#!/usr/bin/env node
/* ------------------------------------------------------------------ *
 *  Look at an album before import-album.mjs files it, and leave out
 *  what would make the Collection worse.
 *
 *  WHY. A member's dump of their phone and the class camera is not an
 *  album: it is every burst, every pocket shot and every copy WhatsApp
 *  made of a photograph that is already there. Filing all of it buries
 *  the good ones. The owner, 2026-10-28, before 15 GB of Class of 2025
 *  photographs went in: "I don't want to upload trashy photos. Trashy
 *  in just super bad quality, duplicates, blurred, or fully black ...
 *  completely overexposed ... I'm not going to be too picky ... if you
 *  can't tell what's going on, something like that, we don't want
 *  that." And: "first, let's trim it, and then upload it."
 *
 *  So this measures, and a session judges. Nothing here decides that a
 *  photograph is bad: the numbers only choose what the session looks at
 *  hardest, because a sharpness score cannot tell a misty hillside from
 *  a shaken camera and a person can.
 *
 *  THREE STEPS, the album itself only ever read:
 *
 *    node scripts/dev/screen-album.mjs --album <dir>            measure
 *    node scripts/dev/screen-album.mjs --album <dir> --sheets   contact sheets:
 *         all (every photograph, date order), groups (one per row),
 *         band (near-miss pairs), flagged (large)
 *       ...the session looks, and writes verdicts.json...
 *    node scripts/dev/screen-album.mjs --album <dir> --stage    lay out the keepers
 *
 *  then import-album.mjs --album <work>/staging --dates <work>/dates.tsv.
 *  In between, `--look 12,34` draws those photographs large from the
 *  originals, and `--regroup` re-derives the numbering and the groups after
 *  a threshold below changes, without measuring again. `--name <slug>` names
 *  the working folder when two albums share a folder name.
 *
 *  The working folder is scripts/dev/.album-screen/<album>/, gitignored
 *  by the `scripts/dev/.*\/` line. It holds thumbnails of real people:
 *  never commit it, never move anything out of it.
 *
 *  verdicts.json, written by the session:
 *    { "reject": { "<rel>": "why" },
 *      "date":   { "<rel>": "2023-04" | "2023" },
 *      "turn":   { "<rel>": 90 | 180 | 270 } }
 *  `date` is only for a photograph whose file and name both say nothing
 *  but whose picture does (a date printed on it by the camera app): a year
 *  is enough, and a guess at a month is not allowed in. `turn` is clockwise,
 *  for a screenshot or a Snapchat save that was stored on its side with no
 *  EXIF to say so; the staged copy gains an Orientation tag and nothing else,
 *  so the pixels the import encodes are the original's.
 * ------------------------------------------------------------------ */

import { existsSync } from "node:fs";
import { readdir, readFile, writeFile, mkdir, symlink } from "node:fs/promises";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import path from "node:path";
import sharp from "sharp";
import { argv } from "./_cli.mjs";
import { sharpImage } from "../../src/lib/image.ts";
import { exifStamp, parseExifStamp } from "../../src/lib/exif-date.ts";
import { exifBlockOf } from "../../src/lib/collection-image.ts";
import { filenameDate } from "../../src/lib/taken-date.ts";

function die(message) {
  console.error(message);
  process.exit(1);
}

const { flag, value } = argv();
const ALBUM = value("--album", null);
if (!ALBUM) die("--album <dir> is required");
const SLUG = value("--name", path.basename(path.resolve(ALBUM)).toLowerCase().replace(/[^a-z0-9]+/g, "-"));
const OUT = path.join(process.cwd(), "scripts", "dev", ".album-screen", SLUG);
const THIS_YEAR = new Date().getFullYear();

/* What gets measured: the formats a phone dump holds. Camera RAW names are
   in because in a dump they are often JPEGs renamed (all eight CR2s in ISC
   255 were); a file sharp still cannot open goes through `sips` below. A
   video is listed and left out: the archive is photographs. */
const IMAGE = /\.(jpe?g|png|heic|heif|avif|webp|gif|cr2|tiff?)$/i;
const VIDEO = /\.(mp4|mov|m4v|3gp|avi)$/i;

/* The size every measurement is taken at. A blur score depends on scale, and
   the question is whether a photograph reads at the size a member sees it,
   not whether a 24MP original is pin-sharp at 100%: 1024px on the long side
   is a phone screen's worth. */
const MEASURE_PX = 1024;

/* What the numbers flag for a closer look, never what they reject. Starting
   points, not tuned values: on ISC 255 they flagged 165 photographs, 7 of
   those went, and the other 4 that went were found on the overview sheets.
   That is why the session reads every sheet, not only the flagged one. */
const FLAG = {
  /* "Fully black": the 99th-percentile pixel is still near black, so there
     is no lit detail at all, not a dark room with a lamp in it. */
  blackP99: 40,
  /* Dark enough to look at: a night photograph can be fine, a lens cap is not. */
  darkMean: 35,
  /* "Completely overexposed to the point where it's white": even the
     darkest percent of the frame is pale. */
  whiteP1: 200,
  /* The sharpest few tiles still have almost no edges in them. Measured as
     the mean Laplacian variance of the three sharpest tiles of a 6x6 grid,
     so a sharp face against a soft background passes. */
  blurTop3: 60,
  /* Below this on the long side a photograph is a thumbnail somebody saved. */
  smallPx: 800,
};

/* Which photographs might be one photograph taken twice. Calibrated on ISC
   255 against pairs judged by eye: a repeat of the same moment measured 2 to
   16 bits apart, and so did two different moments of one scene (a dancer in
   two poses measured 4), because the background is most of the hash. No
   threshold separates those, so the hash only PROPOSES a group and the
   session decides which of it to keep. These limits decide how it is shown.
   Within a minute, 16 bits makes a group; outside a minute it has to be the
   same picture outright (5 bits), which is what a re-encoded copy looks like.
   Up to BAND_BITS past the group limit, a neighbouring pair is drawn on the
   band sheets instead: on ISC 255 that band held 157 pairs and 87 of them
   were the same photograph twice, too many to leave to the overview. */
const SAME_BITS = 5;
const BURST_BITS = 16;
const BAND_BITS = 22;
const NEAR_SECONDS = 60;

/* ------------------------------------------------------------------ *
 *  A date from the file NAME, for the files whose EXIF says nothing.
 *
 *  The app's own reading comes first: `filenameDate` (src/lib/taken-date.ts)
 *  takes a camera's year, month and day out of a name, the answer the
 *  contribute pop-up would offer for the same file.
 *
 *  Past that, and ON PURPOSE past what the app will offer, the names that
 *  say when a file ARRIVED: a WhatsApp copy's is the day it was received, a
 *  screenshot's is when the screen was captured, a saved image's millisecond
 *  name is when it was saved. `NAME_NOT_TAKEN` refuses the first two for a
 *  suggestion, because a contributor would take them for when the picture
 *  was taken. An import is a different question. The owner asked for a date
 *  on every photograph (2026-10-28: "make sure you have, well, at least the
 *  dates for everything"), a class shares its photographs the week they are
 *  taken, and a screenshot of a video call IS the moment. So these are read,
 *  marked "arrival", counted in every summary, and listed in dates.tsv like
 *  any other date the file does not carry: what the run files is never a
 *  surprise, and a batch that should not trust them can say so.
 * ------------------------------------------------------------------ */
const ARRIVAL = [
  // IMG-20230512-WA0001: the day WhatsApp received it, with no time in the name
  [/(?:^|\D)(20\d\d)(\d\d)(\d\d)-WA\d+/i, (m) => m.slice(1, 4)],
  // PHOTO-2024-03-02-18-21-07: WhatsApp's export on iOS
  [/PHOTO-(20\d\d)-(\d\d)-(\d\d)-(\d\d)-(\d\d)-(\d\d)/, (m) => m.slice(1, 7)],
  // Screenshot_20210125-105640, Screenshot_2020_1213_114541
  [/screenshot[_-](20\d\d)_?(\d\d)(\d\d)[_-](\d\d)(\d\d)(\d\d)/i, (m) => m.slice(1, 7)],
  // Screen Shot 2021-09-22 at 9.06.16 AM, macOS
  [/screen ?shot (20\d\d)-(\d\d)-(\d\d) at (\d\d?)\.(\d\d)\.(\d\d)/i, (m) => m.slice(1, 7)],
  // 1633851001768.jpg: milliseconds since 1970, 2017 to 2027
  [/^(1[5-7]\d{11})(?:\D|$)/, (m) => {
    const d = new Date(Number(m[1]));
    return [d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate(), d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds()];
  }],
];

const pad = (n) => String(n).padStart(2, "0");

function nameDate(name) {
  for (const [re, parts] of ARRIVAL) {
    const m = re.exec(name);
    if (!m) continue;
    const [y, mo, d, h, mi, s] = parts(m).map(Number);
    if (y > THIS_YEAR || mo < 1 || mo > 12 || d < 1 || d > 31 || h > 23) continue;
    /* A clock only when the name carries one: a day given a made-up noon
       would make every WhatsApp copy received that day look like a burst. */
    const at = `${y}-${pad(mo)}-${pad(d)}` + (h === undefined ? "" : ` ${pad(h)}:${pad(mi)}:${pad(s)}`);
    return { year: y, month: mo, at, source: "arrival" };
  }
  const camera = filenameDate(name, THIS_YEAR);
  return camera && { year: camera.year, month: camera.month, at: `${camera.year}-${pad(camera.month)}-${pad(camera.day)}`, source: "camera name" };
}

/* ------------------------------------------------------------------ *
 *  The hash. pHash, because it survives a re-encode and a resize, which is
 *  what WhatsApp does to a camera's photograph.
 * ------------------------------------------------------------------ */
const COS = Array.from({ length: 8 }, (_, u) => Float64Array.from({ length: 32 }, (_, x) => Math.cos(((2 * x + 1) * u * Math.PI) / 64)));

function phash(g32) {
  const coeffs = [];
  for (let u = 0; u < 8; u++)
    for (let v = 0; v < 8; v++) {
      let s = 0;
      for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) s += g32[y * 32 + x] * COS[u][y] * COS[v][x];
      coeffs.push(s);
    }
  const median = coeffs.slice(1).sort((a, b) => a - b)[31];
  return chunk(coeffs.map((c) => c > median), 4).map((n) => n.reduce((a, b) => a * 2 + b, 0).toString(16)).join("");
}

/* The 64 bits as two words, read once: comparing every pair of 2,609
   photographs is 3.4 million comparisons, and parsing the hex inside that
   loop was four seconds of a run. */
const words = (hex) => [parseInt(hex.slice(0, 8), 16) | 0, parseInt(hex.slice(8, 16), 16) | 0];

function popcount(x) {
  x -= (x >>> 1) & 0x55555555;
  x = (x & 0x33333333) + ((x >>> 2) & 0x33333333);
  return Math.imul((x + (x >>> 4)) & 0x0f0f0f0f, 0x01010101) >>> 24;
}

const distance = (a, b) => popcount(a[0] ^ b[0]) + popcount(a[1] ^ b[1]);

/* ------------------------------------------------------------------ *
 *  One file, measured.
 * ------------------------------------------------------------------ */
async function walk(dir, rel = "") {
  const out = [];
  for (const e of (await readdir(dir, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
    if (e.name.startsWith(".")) continue;
    const r = rel ? `${rel}/${e.name}` : e.name;
    if (e.isDirectory()) out.push(...(await walk(path.join(dir, e.name), r)));
    else out.push(r);
  }
  return out;
}

/* The one decode every measurement and the thumbnail are cut from. */
const upright = (buf) =>
  sharpImage(buf).rotate().resize(MEASURE_PX, MEASURE_PX, { fit: "inside", withoutEnlargement: true }).removeAlpha().raw().toBuffer({ resolveWithObject: true });

/* Everything that depends only on the bytes. A byte-identical copy shares it:
   ISC 255 held 366 of them, and each used to be decoded again. */
const byBytes = new Map();

async function measurePixels(rel, raw, sha1) {
  let buf = raw, from = null, decoded;
  try {
    decoded = await upright(buf);
  } catch {
    /* A file sharp cannot open (a real HEIF, here) is converted once with
       macOS's own `sips`, which keeps the EXIF block, and the copy is what
       gets measured and later staged. The original is never touched. */
    from = path.join("converted", rel.replace(/\.[^.]+$/, ".jpg"));
    await mkdir(path.dirname(path.join(OUT, from)), { recursive: true });
    execFileSync("sips", ["-s", "format", "jpeg", "-s", "formatOptions", "95", path.join(ALBUM, rel), "--out", path.join(OUT, from)], { stdio: "ignore" });
    buf = await readFile(path.join(OUT, from));
    decoded = await upright(buf);
  }

  const stamp = exifStamp(await exifBlockOf(buf), THIS_YEAR);
  const shot = stamp && parseExifStamp(stamp, THIS_YEAR);
  const meta = await sharpImage(buf).metadata();
  const { width, height } = meta.autoOrient ?? meta;

  const { width: W, height: H, channels } = decoded.info;
  const rgb = { raw: { width: W, height: H, channels } };
  const g = await sharp(decoded.data, rgb).greyscale().raw().toBuffer();

  const hist = new Uint32Array(256);
  let sum = 0;
  for (let k = 0; k < g.length; k++) { hist[g[k]]++; sum += g[k]; }
  const pct = (q) => { let acc = 0; for (let v = 0; v < 256; v++) { acc += hist[v]; if (acc >= q * g.length) return v; } return 255; };

  /* Laplacian variance per tile of a 6x6 grid. */
  const T = 6, tiles = [];
  for (let ty = 0; ty < T; ty++)
    for (let tx = 0; tx < T; tx++) {
      const x0 = Math.max(1, Math.floor((tx * W) / T)), x1 = Math.min(W - 1, Math.floor(((tx + 1) * W) / T));
      const y0 = Math.max(1, Math.floor((ty * H) / T)), y1 = Math.min(H - 1, Math.floor(((ty + 1) * H) / T));
      let s = 0, s2 = 0, c = 0;
      for (let y = y0; y < y1; y++)
        for (let x = x0; x < x1; x++) {
          const i = y * W + x;
          const l = 4 * g[i] - g[i - 1] - g[i + 1] - g[i - W] - g[i + W];
          s += l; s2 += l * l; c++;
        }
      tiles.push(c ? s2 / c - (s / c) ** 2 : 0);
    }
  tiles.sort((a, b) => b - a);

  /* `.greyscale()` again on the way out: sharp hands a one-channel raw input
     back as three channels after a resize, and a hash read off that buffer is
     a hash of the top third of the picture. */
  const g32 = await sharp(g, { raw: { width: W, height: H, channels: 1 } }).resize(32, 32, { fit: "fill" }).greyscale().raw().toBuffer();

  const thumb = `thumbs/${sha1.slice(0, 16)}.jpg`;
  await sharp(decoded.data, rgb).resize(400, 400, { fit: "inside" }).jpeg({ quality: 78 }).toFile(path.join(OUT, thumb));

  return {
    shot: shot && { year: shot.year, month: shot.month, source: "exif", at: stamp.replace(/^(\d{4}):(\d\d):(\d\d)/, "$1-$2-$3").slice(0, 19) },
    fields: {
      from, thumb, width, height,
      mean: Math.round(sum / g.length), p1: pct(0.01), p99: pct(0.99),
      lapTop3: Math.round((tiles[0] + tiles[1] + tiles[2]) / 3),
      phash: phash(g32),
    },
  };
}

async function measure(rel) {
  const name = path.basename(rel);
  if (VIDEO.test(name)) return { rel, kind: "video" };
  if (!IMAGE.test(name)) return { rel, kind: "other" };

  const raw = await readFile(path.join(ALBUM, rel));
  const sha1 = createHash("sha1").update(raw).digest("hex");
  if (!byBytes.has(sha1)) byBytes.set(sha1, measurePixels(rel, raw, sha1));
  let pixels;
  try {
    pixels = await byBytes.get(sha1);
  } catch (e) {
    return { rel, kind: "image", sha1, error: `cannot decode: ${e.message}` };
  }
  /* The shutter's date if the bytes have one, else the name's: the name is
     the one thing two copies of the same bytes do not share. */
  return { rel, kind: "image", sha1, ...pixels.fields, date: pixels.shot ?? nameDate(name) };
}

/* ------------------------------------------------------------------ *
 *  What to look at hardest, and which photographs are the same one.
 * ------------------------------------------------------------------ */
function flagsOf(r) {
  const f = [];
  if (r.p99 < FLAG.blackP99) f.push("black");
  else if (r.mean < FLAG.darkMean) f.push("dark");
  if (r.p1 > FLAG.whiteP1) f.push("white");
  if (r.lapTop3 < FLAG.blurTop3) f.push("blur");
  if (Math.max(r.width, r.height) < FLAG.smallPx) f.push("small");
  if (!r.date) f.push("undated");
  if (/screen ?shot/i.test(r.rel)) f.push("screenshot");
  return f;
}

/* Seconds since 1970, for a date that carries a clock and only then: a day
   with no time can never make two photographs a burst. */
const seconds = (r) => (r.date?.at?.length === 19 ? Date.parse(r.date.at.replace(" ", "T") + "Z") / 1000 : null);

function groupDuplicates(images) {
  const parent = images.map((_, k) => k);
  const find = (k) => (parent[k] === k ? k : (parent[k] = find(parent[k])));
  const hashes = images.map((r) => words(r.phash));
  for (let a = 0; a < images.length; a++)
    for (let b = a + 1; b < images.length; b++) {
      const A = images[a], B = images[b];
      if (A.sha1 === B.sha1) { parent[find(b)] = find(a); continue; }
      const d = distance(hashes[a], hashes[b]);
      if (d > BURST_BITS) continue;
      /* An undated photograph has no clock to make it a burst, so it has to
         be the same picture outright. Letting it match loosely chained a
         group photograph of six into three boys in blue. */
      const ta = seconds(A), tb = seconds(B);
      const near = ta !== null && tb !== null && Math.abs(ta - tb) <= NEAR_SECONDS;
      if (d <= SAME_BITS || near) parent[find(b)] = find(a);
    }
  /* The suggested keeper: the sharpest, then the largest. An exact copy loses
     to its first occurrence whatever the scores say, since they are one file. */
  return [...Map.groupBy(images, (_, k) => find(k)).values()]
    .filter((g) => g.length > 1)
    .map((g) => g.sort((x, y) => y.lapTop3 - x.lapTop3 || y.width * y.height - x.width * x.height));
}

/* ------------------------------------------------------------------ *
 *  Contact sheets.
 * ------------------------------------------------------------------ */
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

async function sheet(file, rows, tile) {
  const gap = 4, labelH = 18;
  const cols = Math.max(...rows.map((r) => r.length));
  const W = gap + cols * (tile + gap), H = gap + rows.length * (tile + labelH + gap);
  const layers = [];
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">`;
  for (const [ry, row] of rows.entries())
    for (const [cx, cell] of row.entries()) {
      const x = gap + cx * (tile + gap), y = gap + ry * (tile + labelH + gap);
      const { data, info } = await sharp(path.join(OUT, cell.r.thumb)).resize(tile, tile, { fit: "inside" }).toBuffer({ resolveWithObject: true });
      layers.push({ input: data, left: x + ((tile - info.width) >> 1), top: y + ((tile - info.height) >> 1) });
      if (cell.ring) svg += `<rect x="${x + 1}" y="${y + 1}" width="${tile - 2}" height="${tile - 2}" fill="none" stroke="${cell.ring}" stroke-width="3"/>`;
      svg += `<text x="${x + 2}" y="${y + tile + 14}" font-family="Helvetica" font-size="13" fill="${cell.colour ?? "#ddd"}">${esc(cell.label)}</text>`;
    }
  layers.push({ input: Buffer.from(svg + "</svg>"), left: 0, top: 0 });
  await mkdir(path.dirname(file), { recursive: true });
  await sharp({ create: { width: W, height: H, channels: 3, background: "#1c1c1c" } }).composite(layers).jpeg({ quality: 82 }).toFile(file);
}

function chunk(list, n) {
  return Array.from({ length: Math.ceil(list.length / n) }, (_, k) => list.slice(k * n, k * n + n));
}

/* Rows onto numbered sheets of one family. Answers how many it drew, so a
   summary can never disagree with the page size. */
async function pages(family, rows, perSheet, tile) {
  const sheets = chunk(rows, perSheet);
  for (const [k, page] of sheets.entries()) await sheet(path.join(OUT, "sheets", `${family}-${String(k + 1).padStart(3, "0")}.jpg`), page, tile);
  return sheets.length;
}

/* ------------------------------------------------------------------ *
 *  The run.
 * ------------------------------------------------------------------ */
const SCREEN = path.join(OUT, "screen.json");
const loadScreen = async () => JSON.parse(await readFile(SCREEN, "utf8"));
/* Where a photograph's bytes are: the converted copy if there is one. The
   stage hands this to the import, and --look shows it. */
const sourceOf = (r) => (r.from ? path.join(OUT, r.from) : path.resolve(ALBUM, r.rel));

/* Numbering, flags and groups, from the measurements alone. Date order, so a
   burst sits together on the sheets and the undated come last; the order is
   total, so the numbers on a sheet stay the numbers after a --regroup. */
function derive(images) {
  images.sort((a, b) => (a.date?.at ?? "9999").localeCompare(b.date?.at ?? "9999") || a.rel.localeCompare(b.rel));
  images.forEach((r, k) => { r.i = k + 1; r.flags = flagsOf(r); delete r.group; delete r.groupBest; });
  const groups = groupDuplicates(images);
  groups.forEach((g, k) => g.forEach((r, j) => { r.group = k + 1; r.groupBest = j === 0; }));
  return groups;
}

const LOOK = value("--look", null);
const MEASURE = ![flag("--regroup"), LOOK, flag("--sheets"), flag("--stage")].some(Boolean);

if (MEASURE) {
  await mkdir(path.join(OUT, "thumbs"), { recursive: true });
  const files = await walk(ALBUM);
  console.log(`album  ${ALBUM}\nfiles  ${files.length}\nwork   ${OUT}`);
  const records = [];
  const queue = [...files];
  let seen = 0;
  await Promise.all(Array.from({ length: 6 }, async () => {
    for (let rel = queue.shift(); rel; rel = queue.shift()) {
      try { records.push(await measure(rel)); }
      catch (e) { records.push({ rel, kind: "image", error: e.message }); }
      if (++seen % 200 === 0) console.log(`  ${seen}/${files.length}`);
    }
  }));

  const images = records.filter((r) => r.kind === "image" && !r.error);
  const groups = derive(images);
  const rest = records.filter((r) => r.kind !== "image" || r.error);
  await writeFile(SCREEN, JSON.stringify({ album: path.resolve(ALBUM), measuredAt: new Date().toISOString(), images, rest }, null, 1));

  const count = (f) => images.filter((r) => r.flags.includes(f)).length;
  const dated = (source) => images.filter((r) => r.date?.source === source).length;
  console.log(`\nimages ${images.length}   videos ${rest.filter((r) => r.kind === "video").length}   other ${rest.filter((r) => r.kind === "other").length}   unreadable ${rest.filter((r) => r.error).length}`);
  console.log(`dated  exif ${dated("exif")}   camera name ${dated("camera name")}   arrival ${dated("arrival")}   none ${count("undated")}`);
  console.log(`flags  ${["black", "dark", "white", "blur", "small", "screenshot"].map((f) => `${f} ${count(f)}`).join("   ")}`);
  console.log(`dupes  ${groups.length} groups holding ${groups.reduce((n, g) => n + g.length, 0)} photographs (${images.length - byBytes.size} byte-identical copies)`);
  for (const r of rest.filter((r) => r.error)) console.log(`  UNREADABLE ${r.rel}: ${r.error}`);
}

/* Re-derive without re-measuring, after a threshold above changes. */
if (flag("--regroup")) {
  const screen = await loadScreen();
  const groups = derive(screen.images);
  await writeFile(SCREEN, JSON.stringify(screen, null, 1));
  console.log(`regrouped: ${groups.length} groups holding ${groups.reduce((n, g) => n + g.length, 0)} photographs`);
}

/* A few photographs large, straight from the originals: a 190px tile can
   show that a frame is soft, not whether you can tell what is going on. */
if (LOOK) {
  const { images } = await loadScreen();
  const want = LOOK.split(",").map(Number);
  const picked = want.map((i) => images.find((r) => r.i === i)).filter(Boolean);
  for (const r of picked) {
    r.thumb = `thumbs/look-${r.sha1.slice(0, 16)}.jpg`;
    await sharpImage(await readFile(sourceOf(r))).rotate().resize(1000, 1000, { fit: "inside" }).jpeg({ quality: 85 }).toFile(path.join(OUT, r.thumb));
  }
  const out = path.join(OUT, "sheets", `look-${want.slice(0, 3).join("-")}.jpg`);
  await sheet(out, chunk(picked.map((r) => ({ r, label: `${r.i} ${r.rel} s${r.lapTop3} m${r.mean}` })), 2), 760);
  console.log(out);
}

if (flag("--sheets")) {
  const { images: measured } = await loadScreen();
  /* A byte-identical copy is the same photograph and needs no second look, so
     every sheet shows each file once. */
  const shown = new Set();
  const images = measured.filter((r) => !shown.has(r.sha1) && shown.add(r.sha1));
  const short = { black: "BLK", dark: "dk", white: "WHT", blur: "blur", small: "sm", undated: "nd", screenshot: "scr" };
  const label = (r) => `${r.i}${r.flags.length ? " " + r.flags.map((f) => short[f]).join(",") : ""}${r.group ? ` g${r.group}` : ""}`;
  const colour = (r) => (r.flags.some((f) => ["black", "white", "blur", "small"].includes(f)) ? "#ff7a6b" : r.group ? "#f5c542" : "#ddd");

  const all = await pages("all", chunk(images.map((r) => ({ r, label: label(r), colour: colour(r) })), 8), 6, 190);

  const groupRows = [...Map.groupBy(images.filter((r) => r.group), (r) => r.group).values()]
    .filter((g) => g.length > 1)
    .flatMap((g) =>
      chunk(g.sort((x, y) => Number(y.groupBest) - Number(x.groupBest) || x.i - y.i), 8).map((part) =>
        part.map((r) => ({ r, ring: r.groupBest ? "#3ccf6b" : null, label: `${r.i} g${r.group} s${r.lapTop3} ${r.width}x${r.height}` }))
      )
    );
  const grouped = await pages("groups", groupRows, 7, 190);

  /* Neighbours in date order, under a minute apart and in no group together,
     drawn two by two with the pair's number under the first of them. */
  const band = [];
  for (let k = 1; k < images.length; k++) {
    const A = images[k - 1], B = images[k], ta = seconds(A), tb = seconds(B);
    if (ta === null || tb === null || tb - ta > NEAR_SECONDS || (A.group && A.group === B.group)) continue;
    const d = distance(words(A.phash), words(B.phash));
    if (d > BURST_BITS && d <= BAND_BITS) band.push({ A, B, d });
  }
  const banded = await pages("band", chunk(band, 4).map((row) => row.flatMap(({ A, B, d }) => [{ r: A, label: `${A.i} | ${B.i}  p${d}` }, { r: B, label: "" }])), 6, 190);

  const flagged = images.filter((r) => r.flags.some((f) => f !== "undated"));
  const large = await pages("flagged", chunk(flagged.map((r) => ({ r, label: `${label(r)} m${r.mean} p1:${r.p1} p99:${r.p99} s${r.lapTop3}`, colour: colour(r) })), 4), 3, 380);

  console.log(`sheets in ${path.join(OUT, "sheets")}: ${all} all, ${grouped} groups, ${banded} band (${band.length} pairs), ${large} flagged`);
}

/* EXIF Orientation for "show this turned clockwise by". */
const TURN_TAG = { 90: 6, 180: 3, 270: 8 };

/* A copy of the file with an Orientation tag, which `.rotate()` in the import
   honours: the turn is a fact about how the picture is displayed, so it goes
   where the app already reads that fact, and the pixels are never re-encoded
   on the way. Refused for a file that already says how to turn itself,
   because the session judged the picture as that tag showed it and two
   turns do not add up the way the numbers suggest. */
async function turned(rel, source, deg) {
  const had = (await sharp(source).metadata()).orientation ?? 1;
  if (had !== 1) die(`${rel} already carries Orientation ${had}; turn it by hand`);
  const out = path.join(OUT, "turned", rel);
  await mkdir(path.dirname(out), { recursive: true });
  execFileSync("exiftool", ["-q", "-o", out, "-n", `-Orientation=${TURN_TAG[deg]}`, source]);
  return out;
}

if (flag("--stage")) {
  const { images } = await loadScreen();
  const verdicts = JSON.parse(await readFile(path.join(OUT, "verdicts.json"), "utf8"));
  const reject = verdicts.reject ?? {}, dated = verdicts.date ?? {}, turn = verdicts.turn ?? {};
  const known = new Set(images.map((r) => r.rel));
  /* A verdict for a file the screen never measured is a typo, and a typo
     here either keeps a photograph meant to go or drops one meant to stay. */
  const strays = [...Object.keys(reject), ...Object.keys(dated), ...Object.keys(turn)].filter((rel) => !known.has(rel));
  if (strays.length) die(`verdicts.json names files the screen does not know:\n  ${strays.join("\n  ")}`);
  const badTurn = Object.entries(turn).find(([rel, deg]) => !TURN_TAG[deg] || reject[rel]);
  if (badTurn) die(`verdicts.json: cannot turn ${badTurn[0]} by ${badTurn[1]} (90, 180 or 270, and not a rejected file)`);

  const staging = path.join(OUT, "staging");
  if (existsSync(staging)) die(`${staging} already exists. It is what an import reads, so it is never rebuilt over: move it aside first.`);

  const keep = images.filter((r) => !reject[r.rel]);
  const lines = [], undated = [], names = new Set();
  for (const r of keep) {
    /* Flattened to the album's top folder, because import-album.mjs reads
       <album>/<folder>/<file>. The staged name is the row's sourceKey, so two
       files that flatten to one name would make one of them vanish. */
    const top = r.rel.split("/")[0];
    const staged = `${top}/${path.basename(r.from ?? r.rel)}`;
    if (names.has(staged)) die(`two keepers flatten to ${staged}`);
    names.add(staged);
    await mkdir(path.join(staging, top), { recursive: true });
    await symlink(turn[r.rel] ? await turned(r.rel, sourceOf(r), turn[r.rel]) : sourceOf(r), path.join(staging, staged));
    /* The EXIF date travels in the file itself and import-album reads it
       there. Only a date from the name, or one the session gave, goes in the
       list, and the session's wins because it was given on purpose. */
    const when = dated[r.rel] ?? (r.date && r.date.source !== "exif" ? `${r.date.year}-${pad(r.date.month)}` : null);
    if (when) lines.push(`${staged}\t${when}`);
    else if (!r.date) undated.push(r.rel);
  }
  await writeFile(path.join(OUT, "dates.tsv"), lines.join("\n") + "\n");

  const why = {};
  for (const reason of Object.values(reject)) why[reason.split(":")[0]] = (why[reason.split(":")[0]] ?? 0) + 1;
  console.log(`kept ${keep.length} of ${images.length}; left out ${images.length - keep.length}`);
  for (const [reason, n] of Object.entries(why).sort((a, b) => b[1] - a[1])) console.log(`  ${String(n).padStart(4)}  ${reason}`);
  console.log(`dates.tsv carries ${lines.length} dates the files themselves do not`);
  if (undated.length) console.log(`STILL UNDATED, import-album will refuse them: ${undated.join(", ")}`);
  console.log(`\nnext: node scripts/dev/import-album.mjs --album ${path.relative(process.cwd(), staging)} --dates ${path.relative(process.cwd(), path.join(OUT, "dates.tsv"))} --as <email>`);
}
