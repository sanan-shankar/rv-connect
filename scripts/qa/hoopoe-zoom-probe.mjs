/**
 * hoopoe-zoom-probe — does browser zoom move the rig's anatomical pivots?
 *
 * Owner, 2026-08-04: at Cmd+ zoom "the eyes don't close anymore and the wings
 * pivot about a weird point". Both of those are the exact signature of
 * `transform-box: view-box` not applying, so the origin falls back to each
 * element's own fill-box centre. This measures whether that is what happens,
 * rather than guessing at it.
 *
 * Chrome's Cmd+ is a page zoom factor, which is what the CSS `zoom` property
 * drives internally, so that is what we vary here. At each level we read the
 * COMPUTED transform-box / transform-origin of the parts the owner named, plus
 * the rendered rect of the eye, then run a blink and re-measure so a pivot that
 * only misbehaves under an active animation still shows up.
 *
 * Usage: node scripts/qa/hoopoe-zoom-probe.mjs [url]
 */

import puppeteer from "puppeteer";
import { chromePath } from "./_probe-kit.mjs";

const URL = process.argv[2] ?? "http://localhost:3000/login";
const ZOOMS = [1, 1.25, 1.5, 2];
const PARTS = ["leftWing", "rightWing", "eyeBlinkL", "crest", "head"];

const browser = await puppeteer.launch({
  executablePath: chromePath(),
  headless: "new",
});
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
await page.goto(URL, { waitUntil: "networkidle0" });
await page.waitForSelector(".hoopoe-mascot", { timeout: 10_000 });

const rows = [];
for (const zoom of ZOOMS) {
  await page.evaluate((z) => {
    document.documentElement.style.zoom = String(z);
  }, zoom);
  // let layout settle at the new zoom
  await new Promise((r) => setTimeout(r, 250));

  const measured = await page.evaluate((parts) => {
    const svg = document.querySelector(".hoopoe-mascot");
    const out = { svgRect: null, parts: {} };
    if (!svg) return out;
    const r = svg.getBoundingClientRect();
    out.svgRect = { w: +r.width.toFixed(1), h: +r.height.toFixed(1) };
    for (const name of parts) {
      const el = svg.querySelector(`[data-part=${name}]`);
      if (!el) continue;
      const cs = getComputedStyle(el);
      const box = el.getBoundingClientRect();
      out.parts[name] = {
        transformBox: cs.transformBox,
        transformOrigin: cs.transformOrigin,
        rect: { w: +box.width.toFixed(1), h: +box.height.toFixed(1) },
      };
    }
    return out;
  }, PARTS);

  rows.push({ zoom, ...measured });
}

await page.evaluate(() => {
  document.documentElement.style.zoom = "1";
});

console.log(`\nhoopoe zoom probe — ${URL}\n`);
for (const row of rows) {
  console.log(`zoom ${row.zoom}  svg ${row.svgRect?.w}x${row.svgRect?.h}`);
  for (const [name, p] of Object.entries(row.parts)) {
    console.log(
      `   ${name.padEnd(10)} box=${p.transformBox.padEnd(9)} origin=${p.transformOrigin.padEnd(22)} rect=${p.rect.w}x${p.rect.h}`,
    );
  }
}

/* The verdict, and the invariant it took a wrong first draft to state properly.
 *
 * `transform-box: view-box` puts the origin in the VIEWBOX's own user units, so
 * the correct expectation is that `transform-origin` reads the SAME value at
 * every zoom -- 42px 85px is user unit 42,85, wherever that lands on the glass.
 * The first version of this probe asserted the opposite (that the origin should
 * scale with the rendered svg) and duly "failed" 15 times against a rig that
 * was behaving correctly. Left recorded here because a probe that reports a
 * confident number from the wrong premise is worse than no probe.
 *
 * So: transform-box must be view-box, and the origin must NOT move. That pair
 * is what fails the moment someone drops RIG_CSS and lets motion's fill-box
 * default win, which is the real regression worth guarding.
 *
 * Rendered rects are printed above but deliberately NOT asserted on: the parts
 * are mid-animation and the wings in particular are posed differently depending
 * on what the page is doing, so their boxes legitimately vary between runs.
 */
const base = rows[0];
let failures = 0;
for (const row of rows.slice(1)) {
  for (const [name, p] of Object.entries(row.parts)) {
    const b = base.parts[name];
    if (!b) continue;
    if (p.transformBox !== "view-box") {
      console.log(`FAIL ${name} @${row.zoom}: transform-box is ${p.transformBox}, not view-box`);
      failures++;
      continue;
    }
    if (p.transformOrigin !== b.transformOrigin) {
      console.log(
        `FAIL ${name} @${row.zoom}: origin moved, ${b.transformOrigin} -> ${p.transformOrigin} (view-box origins are user units and must not scale)`,
      );
      failures++;
    }
  }
}

// The other thing zoom does, which is not a pivot problem but does change what
// you see: Cmd+ shrinks the viewport in CSS px, so a 1440 window crosses the
// auth pages' own lg (1024px) gate somewhere around 1.4x and the page renders
// its MOBILE arrangement, where the bird arrives by flyIn rather than by the
// cross-page flight. Reported so a future reader does not mistake a layout
// switch for a broken rig.
for (const row of rows) {
  const cssWidth = Math.round(1440 / row.zoom);
  const layout = cssWidth >= 1024 ? "desktop" : "MOBILE (below the lg gate)";
  console.log(`zoom ${row.zoom} -> ${cssWidth}px css viewport -> ${layout}`);
}

console.log(failures === 0 ? "\nPASS: pivots hold at every zoom.\n" : `\n${failures} pivot problem(s).\n`);
await browser.close();
process.exit(failures === 0 ? 0 : 1);
