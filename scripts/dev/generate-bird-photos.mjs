// Rasterizes every bird glyph BirdAvatar can hand a member -- both poses of all 51 archetypes
// (50 hashable + the reserved Indian Roller) -- to public/images/birds/{species}-{flip}.png.
//
// Why precomputed rather than rendered per request: BirdGlyphV2 is JSX, and this stack's app/
// directory refuses to compile a manual `react-dom/server` call inside it (see the note in
// src/lib/hoopoe-geometry.ts, hit first by the app icon). The set is also small and finite -- BG_MODE
// is "none", so a bird's PIXELS depend only on its species and its left/right pose, never on the
// per-member disc colour -- so there is no per-request work worth doing at all: this script runs
// once (or whenever a bird's linework or bird-adjust.json changes) and every profile's Save Contact
// download (src/app/(main)/profile/[id]/page.tsx) just reads the file that matches that member's
// already-computed species + pose.
//
// Same harness shape as centroid.mjs: navigate a real Next.js page (which compiles this JSX the
// ordinary way) and let a real browser rasterize it, rather than fighting the framework.
//
//   npm run dev   (separately, first)
//   node scripts/dev/generate-bird-photos.mjs
import puppeteer from "puppeteer";
import sharp from "sharp";
import { mkdirSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { chromePath, loadEnv } from "../qa/_probe-kit.mjs";
import { devLogin } from "../qa/_dev-login.mjs";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
process.chdir(repoRoot);
loadEnv(repoRoot);

const BASE = "http://localhost:3000/lab/centroid";
const OUT_DIR = "public/images/birds";
// The probe draws at 600 CSS px; a 0.8 device scale rasterizes that at 480, enough for a contact
// photo shown full-bleed on a phone, and still a few KB of flat colour.
const PROBE_PX = 600;
const SCALE = 0.8;
// An address book is not the app. Every phone crops a contact photo to a circle, and some paint a
// transparent pixel black, so each bird sits on --card (the surface it usually rests on in the app),
// drawn through the probe's pad=1 frame: 125 units instead of 100, so the bird fills 80% and a tip
// that runs past its box (the Coucal's tail, ~53 units from centre) is drawn whole and lands at ~43
// of the circle's 62.5 -- the crop never takes a crest or a bill.
const PAPER = "#F5F2EA";

mkdirSync(OUT_DIR, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: chromePath(),
  headless: true,
  args: ["--no-sandbox"],
});
const page = await browser.newPage();
await page.setViewport({ width: PROBE_PX, height: PROBE_PX, deviceScaleFactor: SCALE });
// /lab is admin-only (audit M19), so the probe signs in as ADMIN_EMAIL the way every QA script does.
await devLogin(page);

await page.goto(`${BASE}?i=0`, { waitUntil: "load", timeout: 30000 });
const count = Number(await page.$eval("[data-count]", (el) => el.getAttribute("data-count")));

let written = 0;
for (let i = 0; i < count; i++) {
  for (const flip of [0, 1]) {
    await page.goto(`${BASE}?i=${i}&flip=${flip}&pad=1`, { waitUntil: "load", timeout: 30000 });
    await page.addStyleTag({
      content:
        "html,body,#__next,*{background:transparent !important;background-color:transparent !important;background-image:none !important;}",
    });
    await new Promise((r) => setTimeout(r, 150));
    const buf = await page.screenshot({
      omitBackground: true,
      clip: { x: 0, y: 0, width: PROBE_PX, height: PROBE_PX },
    });
    await sharp(buf).flatten({ background: PAPER }).png({ palette: true }).toFile(`${OUT_DIR}/${i}-${flip}.png`);
    written++;
  }
}
await browser.close();

console.log(`${written} bird photos written to ${OUT_DIR}/ (${count} species x 2 poses)`);
