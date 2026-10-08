// Renders bird glyphs for a human (or a reviewing agent) to look at, the way the campaign that
// expanded the set in October 2026 looked at them: each bird ALONE at 600px, so a flat edge, a
// stray overlap or a needle tip cannot hide, and the whole set at the 96px the gallery uses and the
// 40px a post header uses, so look-alikes show up where they actually matter.
//
// Same harness as centroid.mjs and generate-bird-photos.mjs: the /lab/centroid probe draws one
// archetype at a time through the real component, a real browser rasterises it, sharp composes.
//
//   npm run dev   (separately, first)
//   node scripts/dev/bird-sheet.mjs                 every archetype
//   node scripts/dev/bird-sheet.mjs --only 32,26    just these indices (ARCHES order)
//   node scripts/dev/bird-sheet.mjs --flip          the mirrored pose as well
//
// Writes to e2e/.shots/birds/ (gitignored scratch, the folder every screenshot tool uses):
//   <index>-<name>.png      the bird alone at 600px on paper
//   sheet.png               every rendered bird at 220px with its name, five to a row
//   sheet-96.png            the same birds at the gallery's 96px
//   sheet-40.png            and at the post header's 40px
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
const OUT_DIR = "e2e/.shots/birds";
const PROBE_PX = 600;
const PAPER = "#F5F2EA";
const COLS = 5;

const argv = process.argv.slice(2);
const onlyArg = argv[argv.indexOf("--only") + 1];
const only = argv.includes("--only") && onlyArg ? onlyArg.split(",").map((n) => Number(n.trim())) : null;
const flip = argv.includes("--flip");

mkdirSync(OUT_DIR, { recursive: true });

const browser = await puppeteer.launch({ executablePath: chromePath(), headless: true, args: ["--no-sandbox"] });
const page = await browser.newPage();
await page.setViewport({ width: PROBE_PX, height: PROBE_PX, deviceScaleFactor: 1 });
await devLogin(page);

await page.goto(`${BASE}?i=0`, { waitUntil: "load", timeout: 45000 });
const count = Number(await page.$eval("[data-count]", (el) => el.getAttribute("data-count")));
const indices = only ?? Array.from({ length: count }, (_, i) => i);

const slug = (s) => s.toLowerCase().replace(/'/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
const rendered = [];
for (const i of indices) {
  await page.goto(`${BASE}?i=${i}${flip ? "&flip=1" : ""}`, { waitUntil: "load", timeout: 45000 });
  await page.addStyleTag({ content: "html,body,*{background:transparent !important;background-image:none !important;}" });
  await new Promise((r) => setTimeout(r, 150));
  const name = await page.$eval("[data-name]", (el) => el.getAttribute("data-name"));
  const buf = await page.screenshot({ omitBackground: true, clip: { x: 0, y: 0, width: PROBE_PX, height: PROBE_PX } });
  const file = `${OUT_DIR}/${i}-${slug(name)}${flip ? "-flip" : ""}.png`;
  await sharp(buf).flatten({ background: PAPER }).png().toFile(file);
  rendered.push({ i, name, buf });
}
await browser.close();

// A contact sheet: `cell` px of bird, a name line under it, COLS to a row.
async function sheet(cell, file) {
  const label = Math.max(12, Math.round(cell * 0.09));
  const pad = Math.round(cell * 0.12);
  const cw = cell + pad * 2;
  const ch = cell + label * 2 + pad;
  const rows = Math.ceil(rendered.length / COLS);
  const composites = [];
  for (let k = 0; k < rendered.length; k++) {
    const { i, name, buf } = rendered[k];
    const x = (k % COLS) * cw + pad;
    const y = Math.floor(k / COLS) * ch + pad;
    composites.push({ input: await sharp(buf).resize(cell, cell).png().toBuffer(), left: x, top: y });
    const text = `<svg width="${cw}" height="${label * 2}"><text x="${cw / 2}" y="${label * 1.2}" font-family="Helvetica, Arial" font-size="${label}" fill="#33302B" text-anchor="middle">${i} ${name.replace(/&/g, "&amp;")}</text></svg>`;
    composites.push({ input: Buffer.from(text), left: x - pad, top: y + cell + Math.round(label * 0.3) });
  }
  await sharp({ create: { width: cw * COLS, height: ch * rows, channels: 3, background: PAPER } })
    .composite(composites)
    .png()
    .toFile(file);
}
const suffix = only ? `-${indices.join("_")}` : "";
await sheet(220, `${OUT_DIR}/sheet${suffix}.png`);
await sheet(96, `${OUT_DIR}/sheet-96${suffix}.png`);
await sheet(40, `${OUT_DIR}/sheet-40${suffix}.png`);
console.log(`${rendered.length} birds rendered to ${OUT_DIR}/ (sheet${suffix}.png, sheet-96${suffix}.png, sheet-40${suffix}.png)`);
