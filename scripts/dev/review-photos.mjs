#!/usr/bin/env node
/* ------------------------------------------------------------------ *
 *  Go through a folder of photographs one at a time, on this Mac, and
 *  say which stay: keep or drop, important or not, when, who, what.
 *
 *  WHY. The owner, 2026-11-04, on the Centenary folder (770 photographs
 *  once copies were out): deciding in Finder is hard, and so is adding a
 *  name or a date to one picture, or marking a poor-quality one as worth
 *  keeping because of who is in it. And: nothing goes up to the site,
 *  not even to the review room, until he has cut it down by hand. So this
 *  is local and only local. It reads the folder, writes one JSON file of
 *  his decisions beside it, and never moves, renames or deletes a photo:
 *  "Drop" is a mark, and acting on the marks is a separate, later step.
 *
 *  Run:  node scripts/dev/review-photos.mjs --album "<folder>" [--port 4410]
 *  then open http://localhost:4410 . Ctrl-C stops it; nothing is lost,
 *  every change is on disk the moment it is made.
 *
 *  WHAT IT READS, beside the album, in <album>/.catalogue/:
 *    catalogue.json  optional, one entry per photograph:
 *        { suggest: "1976" | "2004-09" | "1970s" | "",
 *          trust: "camera" | "label" | "no",
 *          evidence: "a sentence saying where the date came from",
 *          caption: "a caption the file name already carried",
 *          by: "the photographer, from EXIF", from: "where it used to be" }
 *      The Centenary folder's was built by the session that sorted it; an
 *      album without one still works, it just has no date evidence to show.
 *  WHAT IT WRITES:
 *    decisions.json  { "<path>": { verdict, star, when, date, people, caption, at } }
 *      `when` is what he typed ("late 1960s"); `date` is the Collection's own
 *      reading of it, photoDate() out of src/lib/collection.ts, so the import
 *      that follows files exactly what this page told him it would.
 *      written whole, atomically (temp file, then rename), on every change;
 *    decisions.log   one JSON line per change, appended, so a bad edit can be
 *      walked back even after decisions.json has moved on.
 *    previews/       small JPEGs for the filmstrip, so the second visit is fast.
 *
 *  Folders whose name starts with "_" or "." are not shown: that is where the
 *  set-aside pile and the catalogue itself live.
 * ------------------------------------------------------------------ */

import { createServer } from "node:http";
import { readdir, readFile, writeFile, rename, appendFile, mkdir, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import os from "node:os";
import sharp from "sharp";
import { argv } from "./_cli.mjs";
import { BUCKETS, MONTHS, PHOTO_YEAR_MIN, photoDate, takenLabel } from "../../src/lib/collection.ts";
import { MAX_INPUT_PIXELS } from "../../src/lib/upload-shared.ts";

const run = promisify(execFile);
const { value } = argv();
const given = value("--album", null);
const ALBUM = given && path.resolve(given);
if (!ALBUM || !existsSync(ALBUM)) {
  console.error('--album "<folder>" is required, and must exist');
  process.exit(1);
}
const PORT = Number(value("--port", "4410"));
const CAT = path.join(ALBUM, ".catalogue");
const PREVIEWS = path.join(CAT, "previews");
const DECISIONS = path.join(CAT, "decisions.json");
await mkdir(PREVIEWS, { recursive: true });

/* Formats a camera, a scanner or a phone produces. A browser shows none of
   TIFF and NEF, so every picture goes out through sharp as a JPEG anyway. */
const IMAGE = /\.(jpe?g|jfif|png|webp|tiff?|heic|nef)$/i;
/* The ones libvips cannot decode (HEVC HEIC, Nikon RAW) and macOS can. By
   extension rather than by catching a failure, because sharp will happily
   read a NEF's thumbnail-sized embedded preview and call that success. */
const VIA_SIPS = /\.(heic|nef)$/i;

async function walk(dir, rel = "") {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    if (e.name.startsWith(".")) continue;
    const r = rel ? `${rel}/${e.name}` : e.name;
    // "_" hides a FOLDER only: cameras name files _XQD8134.JPG and _MG_9122.JPG.
    if (e.isDirectory()) {
      if (!e.name.startsWith("_")) out.push(...(await walk(path.join(dir, e.name), r)));
    }
    else if (IMAGE.test(e.name)) out.push(r);
  }
  return out;
}

const collator = new Intl.Collator("en", { numeric: true, sensitivity: "base" });
const items = (await walk(ALBUM)).sort((a, b) => {
  const fa = path.dirname(a), fb = path.dirname(b);
  return fa === fb ? collator.compare(path.basename(a), path.basename(b)) : collator.compare(fa, fb);
});
const known = new Set(items);

const readJson = async (file, fallback) => {
  try {
    return JSON.parse(await readFile(file, "utf8"));
  } catch {
    return fallback;
  }
};
const catalogue = await readJson(path.join(CAT, "catalogue.json"), {});
const decisions = await readJson(DECISIONS, {});

/* ---- When: free text read with the Collection's own rule ---------------
   He types the way people talk about old photographs ("late 1960s", "c.
   1976", "March 1976"). This turns that into the {year, month} pair the
   contribute form produces -- a three-digit year is a decade there -- and
   photoDate() does the rest, so a date the site would file as undated (one
   before the school's founding, say) is said to be undated here as well. */
const THIS_YEAR = new Date().getFullYear();
function typedFrom(text) {
  const t = String(text ?? "").trim().toLowerCase().replace(/[’']/g, "'");
  if (!t) return null;
  let m;
  if ((m = t.match(/^(?:early |mid |late |the )?(\d{3})0'?s$/))) return { year: m[1], month: "" };
  if ((m = t.match(/^(?:early |mid |late |the )?'?([2-9])0'?s$/))) return { year: `19${m[1]}`, month: "" };
  // "2004-09" is a month; "1961-62" is a school year. A second half of 1 to 12 is a month.
  if ((m = t.match(/^(\d{4})-(\d{1,2})$/)) && Number(m[2]) >= 1 && Number(m[2]) <= 12) return { year: m[1], month: MONTHS[Number(m[2]) - 1] };
  if ((m = t.match(/^(?:c\.?|about|circa|~)?\s*(\d{4})(?:\s*[-–/]\s*\d{2,4})?$/))) return { year: m[1], month: "" };
  if ((m = t.match(/^(?:\d{1,2}(?:st|nd|rd|th)? )?([a-z]{3,9})\.?,? (\d{4})$/))) {
    const month = MONTHS.find((x) => x.toLowerCase().startsWith(m[1].slice(0, 3)));
    if (month) return { year: m[2], month };
  }
  return { bad: true };
}
function reading(text) {
  const typed = typedFrom(text);
  if (!typed) return { date: null, label: null };
  if (typed.bad) return { bad: "Can't read that. Try 1976, March 1976, or 1970s." };
  const date = photoDate(typed, THIS_YEAR);
  if (date.datePrecision === "unknown") {
    return { bad: `The site files dates from ${PHOTO_YEAR_MIN} to ${THIS_YEAR}; this one would go up undated.` };
  }
  return { date, label: takenLabel(date) };
}

/* One write at a time. Two quick key presses must not race two renames onto
   the same file, so every save joins the end of one promise chain. */
let writing = Promise.resolve();
function save(p, patch) {
  if ("when" in patch) patch = { ...patch, date: reading(patch.when).date ?? null };
  decisions[p] = { ...decisions[p], ...patch, at: new Date().toISOString() };
  const line = JSON.stringify({ p, ...patch, at: decisions[p].at }) + "\n";
  writing = writing.then(async () => {
    const tmp = `${DECISIONS}.${process.pid}.tmp`;
    await writeFile(tmp, JSON.stringify(decisions, null, 1));
    await rename(tmp, DECISIONS);
    await appendFile(path.join(CAT, "decisions.log"), line);
  });
  return writing;
}

/* Pictures out as JPEGs. The filmstrip's 320px copies are kept on disk (770
   of them is ~25MB) and mozjpeg-encoded, once. The large one is made fresh,
   with plain libjpeg: mozjpeg took 482ms against 93ms on a 24MP original for
   a smaller file that crosses nothing but loopback. Caching every 2000px copy
   would be a third of a gigabyte, so only the last few are held in memory,
   which is enough to make stepping back free. */
const SIZES = {
  thumb: { px: 320, quality: 72, mozjpeg: true, onDisk: true },
  large: { px: 2000, quality: 84, mozjpeg: false, onDisk: false },
};
const cachePath = (p) => path.join(PREVIEWS, `${Buffer.from(p).toString("base64url").slice(-120)}-thumb.jpg`);

async function cachedThumb(p) {
  const file = cachePath(p);
  if (!existsSync(file)) return null;
  return (await stat(file)).mtimeMs >= (await stat(path.join(ALBUM, p))).mtimeMs ? readFile(file) : null;
}

async function render(p, size) {
  const { px, quality, mozjpeg, onDisk } = SIZES[size];
  let input = path.join(ALBUM, p);
  if (VIA_SIPS.test(p)) {
    const out = path.join(os.tmpdir(), `review-${process.pid}-${path.basename(p)}.jpg`);
    await run("sips", ["-s", "format", "jpeg", input, "--out", out]);
    input = out;
  }
  /* The import's decode rules (src/lib/image.ts sharpImage): a file this page
     cannot open is one import-album.mjs would refuse, and it is better found
     now, while he is looking at it, than at the end of a run. */
  const buf = await sharp(input, { failOn: "error", limitInputPixels: MAX_INPUT_PIXELS })
    .rotate()
    .resize(px, px, { fit: "inside", withoutEnlargement: true })
    .jpeg({ quality, mozjpeg })
    .toBuffer();
  if (onDisk) await writeFile(cachePath(p), buf);
  return buf;
}

/* At most four THUMBNAIL decodes at once: a filmstrip scrolled fast asks for
   dozens, and thirty parallel 24MP decodes would stall everything. The large
   picture does not queue at all. It is the one being looked at, and on first
   open it otherwise waited behind every thumbnail the strip had asked for. */
let active = 0;
const queue = [];
const limited = (fn) =>
  new Promise((resolve, reject) => {
    const go = () => {
      active++;
      fn().then(resolve, reject).finally(() => {
        active--;
        queue.shift()?.();
      });
    };
    if (active < 4) go();
    else queue.push(go);
  });

/* Larges: one decode per picture however many requests ask (the page asks
   for the next two ahead, and a held arrow key repeats), and the last six
   kept, newest last. */
const inFlight = new Map();
const recent = new Map();
function large(p) {
  if (recent.has(p)) {
    const buf = recent.get(p);
    recent.delete(p);
    recent.set(p, buf);
    return Promise.resolve(buf);
  }
  if (!inFlight.has(p)) {
    inFlight.set(p, render(p, "large").then((buf) => {
      recent.set(p, buf);
      if (recent.size > 6) recent.delete(recent.keys().next().value);
      return buf;
    }).finally(() => inFlight.delete(p)));
  }
  return inFlight.get(p);
}
const picture = async (p, size) =>
  size === "large" ? large(p) : (await cachedThumb(p)) ?? limited(() => render(p, "thumb"));

const PAGE = new URL("./review-photos.html", import.meta.url);

const server = createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  try {
    if (req.method === "GET" && url.pathname === "/") {
      res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      return res.end(await readFile(PAGE, "utf8"));
    }
    if (req.method === "GET" && url.pathname === "/api/state") {
      const list = items.map((p) => ({ p, cat: catalogue[p] ?? null }));
      res.writeHead(200, { "content-type": "application/json" });
      // The Collection's bucket order, so the sidebar is read the way the site is.
      const order = BUCKETS.map((b) => b.label);
      return res.end(JSON.stringify({ album: path.basename(ALBUM), items: list, decisions, order }));
    }
    if (req.method === "GET" && url.pathname === "/api/when") {
      res.writeHead(200, { "content-type": "application/json" });
      return res.end(JSON.stringify(reading(url.searchParams.get("t"))));
    }
    if (req.method === "GET" && url.pathname === "/img") {
      const p = url.searchParams.get("p");
      const size = url.searchParams.get("s") === "large" ? "large" : "thumb";
      // Only a path the walk found: nothing outside the album, ever.
      if (!known.has(p)) return res.writeHead(404).end();
      const buf = await picture(p, size);
      res.writeHead(200, { "content-type": "image/jpeg", "cache-control": "max-age=3600" });
      return res.end(buf);
    }
    if (req.method === "POST" && url.pathname === "/api/decide") {
      let body = "";
      for await (const chunk of req) {
        body += chunk;
        if (body.length > 20_000) return res.writeHead(413).end();
      }
      const { p, patch } = JSON.parse(body);
      if (!known.has(p)) return res.writeHead(404).end();
      const allowed = ["verdict", "star", "when", "people", "caption"];
      const clean = Object.fromEntries(Object.entries(patch ?? {}).filter(([k]) => allowed.includes(k)));
      await save(p, clean);
      res.writeHead(200, { "content-type": "application/json" });
      return res.end(JSON.stringify(decisions[p]));
    }
    res.writeHead(404).end();
  } catch (err) {
    console.error(err);
    res.writeHead(500, { "content-type": "text/plain" }).end(String(err.message ?? err));
  }
});

// 127.0.0.1, not 0.0.0.0: these are photographs of real people, and the
// café's wifi has no business seeing them.
server.listen(PORT, "127.0.0.1", () => {
  const done = Object.values(decisions).filter((d) => d.verdict).length;
  console.log(`${items.length} photographs, ${done} decided`);
  console.log(`open http://localhost:${PORT}`);
});
