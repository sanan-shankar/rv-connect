// Optical-centering measurement for the v2 birds.
// For each bird: rasterize it alone (no disc) on transparency, compute the alpha-weighted centroid
// and the opaque bounding box, in viewBox units (0..100, centre = 50,50). Reports the nudge needed
// to put the visual mass dead-centre and whether it fits inside a safe radius.
import puppeteer from "puppeteer";
import sharp from "sharp";
import { readFileSync, writeFileSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { chromePath, loadEnv } from "../qa/_probe-kit.mjs";
import { devLogin } from "../qa/_dev-login.mjs";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
process.chdir(repoRoot);
loadEnv(repoRoot);

// /preview was folded into /lab on 2026-07-30 and its URLs are not redirected, so this pointed at
// a 404 until 2026-08-04.
const BASE = "http://localhost:3000/lab/centroid";
// Size by visual MASS (area-equivalent radius), not the farthest tip, so birds with a long thin
// tail/bill/crest (drongo, pond heron, kingfisher, peafowl) get a body as big as the round birds.
// A cap keeps that thin part from pushing past the frame.
const TARGET_AREA_R = 40; // each bird's body normalised to this area-equiv radius
// 47, not 50: the app's <svg viewBox="0 0 100 100"> clips at the box, so a point at 50 is a point
// cut flat by the frame. Three units of margin keep every bill tip, fork and crest whole at 40px.
const MAXREACH_CAP = 47;
// The probe is read with ?pad=1 (viewBox -12.5..112.5), so a shape that runs PAST the frame is seen
// and measured instead of clipped away. Until 2026-10-08 the script measured the clipped box: it
// could not see overflow, so it converged birds with their bill tips at or past the edge, which is
// exactly the "sharply cut off" beak the owner kept pointing at (Pond Heron, Egret, Kingfisher).
const PAD = 12.5;
const PXV = 600 / (100 + 2 * PAD); // 4.8 px per viewBox unit in the padded frame
const toUnit = (px) => px / PXV - PAD;
const ADJUST_PATH = "src/components/common/bird-adjust.json";
const WRITE = !process.argv.includes("--measure-only");
// `--only 51,52` measures and corrects just those indices (ARCHES order) and leaves every other
// bird's entry exactly as it was. Added for the 2026-10 birds expansion: re-running the whole set
// to seat one new bird re-measures the fifty that did not change and nudges each by a fraction of
// a unit, which moves pixels on every avatar in the app for no reason.
const onlyArg = process.argv[process.argv.indexOf("--only") + 1];
const ONLY = process.argv.includes("--only") && onlyArg ? new Set(onlyArg.split(",").map((n) => Number(n.trim()))) : null;

const existing = JSON.parse(readFileSync(ADJUST_PATH, "utf8"));

const browser = await puppeteer.launch({
  executablePath: chromePath(),
  headless: true,
  args: ["--no-sandbox"],
});
const page = await browser.newPage();
await page.setViewport({ width: 600, height: 600, deviceScaleFactor: 1 });
// /lab is admin-only (audit M19), so the probe signs in the way every QA script does. Without this
// the page is the sign-in redirect, which has no [data-count], and the script died on line one of
// its loop from the day the gate landed until 2026-10-08.
await devLogin(page);

await page.goto(`${BASE}?i=0&pad=1`, { waitUntil: "load", timeout: 30000 });
const count = Number(await page.$eval("[data-count]", (el) => el.getAttribute("data-count")));

const rows = [];
for (let i = 0; i < count; i++) {
  if (ONLY && !ONLY.has(i)) continue;
  await page.goto(`${BASE}?i=${i}&pad=1`, { waitUntil: "load", timeout: 30000 });
  await page.addStyleTag({ content: "html,body,#__next,*{background:transparent !important;background-color:transparent !important;background-image:none !important;}" });
  await new Promise((r) => setTimeout(r, 250));
  const name = await page.$eval("[data-name]", (el) => el.getAttribute("data-name"));
  const buf = await page.screenshot({ omitBackground: true, clip: { x: 0, y: 0, width: 600, height: 600 } });
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  let sw = 0, sx = 0, sy = 0;
  let minX = width, maxX = 0, minY = height, maxY = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const a = data[(y * width + x) * channels + 3];
      if (a < 24) continue;
      const w = a / 255;
      sw += w; sx += x * w; sy += y * w;
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
    }
  }
  if (sw === 0) { rows.push({ i, name, empty: true }); continue; }
  const cx = toUnit(sx / sw), cy = toUnit(sy / sw);
  const bx0 = toUnit(minX), bx1 = toUnit(maxX), by0 = toUnit(minY), by1 = toUnit(maxY);
  // furthest the silhouette reaches from the TARGET centre (50,50)
  const reach = Math.max(50 - bx0, bx1 - 50, 50 - by0, by1 - 50);
  // area-equivalent radius: the radius of a disc with the same opaque area (the "body size")
  const rArea = Math.sqrt(sw / Math.PI) / PXV;
  rows.push({
    i, name,
    cx: +cx.toFixed(1), cy: +cy.toFixed(1),
    dx: +(50 - cx).toFixed(1), dy: +(50 - cy).toFixed(1),
    bbox: `${bx0.toFixed(0)}-${bx1.toFixed(0)} x ${by0.toFixed(0)}-${by1.toFixed(0)}`,
    w: +(bx1 - bx0).toFixed(0), h: +(by1 - by0).toFixed(0),
    reach: +reach.toFixed(1),
    rArea: +rArea.toFixed(1),
  });
}
await browser.close();

console.log("\n#   bird            centroid     nudge(dx,dy)   rArea  reach  flags");
console.log("-".repeat(86));
for (const r of rows) {
  if (r.empty) { console.log(`${String(r.i).padEnd(3)} ${String(r.name).padEnd(15)} EMPTY`); continue; }
  const flags = [];
  if (Math.abs(r.dx) > 1.0 || Math.abs(r.dy) > 1.0) flags.push(`OFF-CENTRE`);
  if (r.reach > MAXREACH_CAP + 1.5) flags.push(`OVER-FRAME(${r.reach})`);
  // body too small only matters if it is NOT held back by the frame cap
  if (r.rArea < TARGET_AREA_R - 2.5 && r.reach < MAXREACH_CAP - 1.5) flags.push(`small-body(${r.rArea})`);
  console.log(
    `${String(r.i).padEnd(3)} ${String(r.name).padEnd(15)} ` +
    `(${String(r.cx).padStart(4)},${String(r.cy).padStart(4)})  ` +
    `(${String(r.dx).padStart(5)},${String(r.dy).padStart(5)})   ` +
    `${String(r.rArea).padStart(4)}  ${String(r.reach).padStart(4)}   ${flags.join(" ")}`
  );
}
const bad = rows.filter((r) => !r.empty && (
  Math.abs(r.dx) > 1.0 || Math.abs(r.dy) > 1.0 ||
  r.reach > MAXREACH_CAP + 1.5 ||
  (r.rArea < TARGET_AREA_R - 2.5 && r.reach < MAXREACH_CAP - 1.5)
));
console.log("-".repeat(86));
console.log(`${rows.length} birds. ${bad.length} need attention (centroid off, body too small, or over the frame).`);

if (WRITE) {
  // Compose an incremental correction onto the existing adjust. The measured centroid already
  // reflects existing; new transform T_new is applied on top, so:
  //   s = s_new * s_old ;  t = s_new * t_old + t_new
  // s_new sizes by visual mass (TARGET_AREA_R / rArea) but is capped so the farthest point never
  // exceeds the frame (MAXREACH_CAP / reach); t_new = s_new * (dx,dy) zeroes the residual offset.
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  // With --only, every bird not re-measured keeps its entry untouched.
  const next = ONLY ? { ...existing } : {};
  for (const r of rows) {
    if (r.empty) continue;
    const old = existing[r.name] || {};
    const so = old.s ?? 1, tox = old.x ?? 0, toy = old.y ?? 0;
    const sn = clamp(Math.min(TARGET_AREA_R / r.rArea, MAXREACH_CAP / r.reach), 0.55, 1.9);
    const tnx = sn * r.dx, tny = sn * r.dy;
    const s = clamp(so * sn, 0.55, 1.9);
    const x = sn * tox + tnx;
    const y = sn * toy + tny;
    next[r.name] = { x: +x.toFixed(2), y: +y.toFixed(2), s: +s.toFixed(3) };
  }
  writeFileSync(ADJUST_PATH, JSON.stringify(next, null, 2) + "\n");
  console.log(`Wrote ${Object.keys(next).length} corrections to ${ADJUST_PATH}. Re-run to converge.`);
}
