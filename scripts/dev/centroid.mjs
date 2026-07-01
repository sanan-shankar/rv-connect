// Optical-centering measurement for the v2 birds.
// For each bird: rasterize it alone (no disc) on transparency, compute the alpha-weighted centroid
// and the opaque bounding box, in viewBox units (0..100, centre = 50,50). Reports the nudge needed
// to put the visual mass dead-centre and whether it fits inside a safe radius.
import puppeteer from "puppeteer";
import sharp from "sharp";
import { readFileSync, writeFileSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
process.chdir(repoRoot);

const BASE = "http://localhost:3000/preview/centroid";
// Size by visual MASS (area-equivalent radius), not the farthest tip, so birds with a long thin
// tail/bill/crest (drongo, pond heron, kingfisher, peafowl) get a body as big as the round birds.
// A cap keeps that thin part from pushing past the frame.
const TARGET_AREA_R = 40; // each bird's body normalised to this area-equiv radius
const MAXREACH_CAP = 50; // ...but never scale so far that any point exceeds this radius (the frame)
const PXV = 6; // 600px / 100 viewBox units
const ADJUST_PATH = "src/components/common/bird-adjust.json";
const WRITE = !process.argv.includes("--measure-only");

const existing = JSON.parse(readFileSync(ADJUST_PATH, "utf8"));

const browser = await puppeteer.launch({
  executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
  args: ["--no-sandbox"],
});
const page = await browser.newPage();
await page.setViewport({ width: 600, height: 600, deviceScaleFactor: 1 });

await page.goto(`${BASE}?i=0`, { waitUntil: "load", timeout: 30000 });
const count = Number(await page.$eval("[data-count]", (el) => el.getAttribute("data-count")));

const rows = [];
for (let i = 0; i < count; i++) {
  await page.goto(`${BASE}?i=${i}`, { waitUntil: "load", timeout: 30000 });
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
  const cx = sx / sw / PXV, cy = sy / sw / PXV;
  const bx0 = minX / PXV, bx1 = maxX / PXV, by0 = minY / PXV, by1 = maxY / PXV;
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
  const next = {};
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
