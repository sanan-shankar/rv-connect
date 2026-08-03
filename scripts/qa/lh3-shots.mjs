/**
 * QA harness for the Letterhead III profile concept, specifically the six
 * house-chain treatments (?chain=serpentine|stepped|route|rail|stave|zigzag).
 * The owner's live complaint is a squeezed desktop window, so 820px is
 * covered as its own width, not folded into a "mobile" pass.
 *
 * Modeled on scripts/qa/lh2-states.mjs (puppeteer setup, DOM measurement
 * over PNG-squinting) and scripts/qa/profile-states.mjs (measure-then-shot
 * pairing). Captures the full matrix into `./temporary screenshots/lh3/`
 * and prints + saves a measurement table.
 *
 * Usage: node scripts/qa/lh3-shots.mjs
 */
import puppeteer from "puppeteer";
import { existsSync, mkdirSync, writeFileSync } from "fs";
import { dirname, join, resolve } from "path";
import { fileURLToPath } from "url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
process.chdir(repoRoot);

const dir = "./temporary screenshots/lh3";
mkdirSync(dir, { recursive: true });

const BASE = "http://localhost:3000/lab/profiles?v=letterhead-3";
const LH2_BASE = "http://localhost:3000/lab/profiles?v=letterhead-2";

// Built in the order the concept ships them (see _variant-letterhead-3.tsx,
// "the first is the default, so ?chain= can be omitted"). Kept explicit here
// rather than omitted-for-default so every shot's URL is copy-pasteable.
const CHAIN_KEYS = ["serpentine", "stepped", "route", "rail", "stave", "zigzag"];
const WIDTHS = [1440, 1024, 820, 390];

const chromeCandidates = [
  process.env.PUPPETEER_EXECUTABLE_PATH,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
].filter(Boolean);
const executablePath = chromeCandidates.find((p) => existsSync(p));

const browser = await puppeteer.launch({
  headless: true,
  executablePath,
  args: ["--no-sandbox", "--disable-setuid-sandbox"],
});
const page = await browser.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(`pageerror: ${e.message.split("\n")[0]}`));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(`console.error: ${m.text().slice(0, 200)}`);
});

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function go(url) {
  try {
    await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });
  } catch {
    await wait(2000);
  }
  // Framer springs on the pills carry a per-index delay (0.04 * i) on top of
  // their own duration, and useChainMetrics' hidden measuring pass needs a
  // layout + a ResizeObserver callback + a document.fonts.ready re-measure
  // before the real (non-zero-height) chain paints. A flat 1000ms sleep
  // caught the Stepped treatment at 390px mid-layout (measured a real 0px
  // block that was 120px three seconds later, first found by this harness
  // reporting a chain height of 0 where every other width read >50), so
  // this polls the actual DOM instead of guessing a delay.
  await waitForChainSettled();
}

/**
 * Polls until the Houses chain block has committed a non-zero height, or
 * until it is clear there is no Houses section to wait for (the sparse
 * sample omits it by design). Caps at 4s so a genuinely broken chain
 * (renders nothing, ever) still lets the run continue rather than hang.
 */
async function waitForChainSettled(maxMs = 4000) {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    const state = await page.evaluate(() => {
      const section = [...document.querySelectorAll("section")].find((s) =>
        (s.textContent || "").trim().startsWith("Houses")
      );
      if (!section) return "no-section";
      const wrap = section.querySelector("div[data-lh3-ink]");
      if (!wrap) return "no-wrap";
      return wrap.getBoundingClientRect().height > 0 ? "ready" : "zero-height";
    });
    if (state === "ready" || state === "no-section") {
      // The wrap having height doesn't mean every pill has finished its
      // entrance spring (initial={{opacity:0,y:6}}); the `y` is a CSS
      // transform, which DOES move getBoundingClientRect, so a shot or
      // measurement taken mid-spring would read pills a few px too high.
      //
      // 2000ms, not the first-guess 600ms: measured empirically, not
      // assumed. A 600ms buffer produced screenshots of the Stave chain
      // (_chain-stave.tsx) where every pill but the first was blank paper,
      // and the first pill's text sampled at ~luminance 226 (background is
      // ~239) though getComputedStyle on the very same element already
      // reported its FINAL color (rgb(31,138,76), luminance 99) and
      // opacity:1 - the JS/style layer had committed the end state but
      // headless Chrome's compositor had not yet painted it. Sampling
      // actual pixels (not computed style) at increasing waits found the
      // true paint landing between 1000-1500ms after Stave's OWN longest
      // stagger (ribbon delay 0.18 + 0.05 * i, then a second pill-only
      // spring on top of that): a flat 1500ms was enough, 600ms was not.
      // 2000ms is that finding plus headroom, not a guess.
      await wait(2000);
      return state;
    }
    await wait(150);
  }
  return "timed-out";
}

/**
 * Captures the WHOLE page, but deliberately not via `page.screenshot({
 * fullPage: true })`. Puppeteer's fullPage capture does its own last-instant
 * viewport resize immediately before calling into CDP, and that resize
 * retriggers `_chain-kit.tsx`'s ResizeObserver (the one `useChainMetrics`
 * uses to repack pills against the host's current width) a beat before the
 * shutter. Every treatment shrugs that off except Stave, whose entrance
 * spring restarts on it: every fullPage shot of Stave landed the same
 * ~5%-opacity frame regardless of how long this script waited beforehand
 * (proven by bisecting the wait from 600ms to 5000ms with zero change, then
 * confirming a PLAIN, non-fullPage screenshot at the same wait rendered
 * correctly every time). Resizing the viewport to the page's actual height
 * ourselves, settling again, THEN taking a plain screenshot removes the
 * resize-right-before-the-shutter step, so there is nothing left to race.
 */
async function shot(name) {
  const fullHeight = await page.evaluate(() => document.documentElement.scrollHeight);
  const vp = page.viewport();
  if (fullHeight > vp.height) {
    await page.setViewport({ width: vp.width, height: fullHeight });
    await waitForChainSettled(); // the resize just caused needs its own settle
  }
  const path = join(dir, `${name}.png`);
  await page.screenshot({ path });
  return resolve(path);
}

async function setWidth(width, height = 1000) {
  await page.setViewport({ width, height });
}

/**
 * The measurements the review is actually about, read off the DOM instead of
 * eyeballed off a PNG:
 *   - firstPillLeftOffset: first pill's left edge minus the sheet's CONTENT
 *     left edge (sheet.left + its own padding-left). The owner's rule is
 *     that this is exactly 0; the header comment on _chain-kit.tsx calls out
 *     the prior complaint ("the first pill isn't flush [left]").
 *   - chainBlockHeight: the rendered height of the Houses section's chain
 *     wrapper (the `div[data-lh3-ink]` that is the *only* div-with-that-
 *     attribute under the "Houses" section; the section label is a <p> with
 *     the same attribute, so the div/p split is what disambiguates them).
 *   - longestConnectorRun: the longest single connector element in the
 *     chain, in px. A "connector" is any non-pill leaf under the chain: an
 *     SVG <path>/<line> (every treatment's straight arrows, plus route's
 *     drawn legs and turns) or a leaf div/span that is itself absolutely or
 *     relatively positioned (stave's duration ribbons, which ARE the
 *     connector there per that file's own header comment: "It is also the
 *     connector"). This is deliberately generic across all six layouts
 *     rather than six bespoke selectors, because the whole point of the
 *     number is comparing how long a single visual run gets treatment to
 *     treatment.
 *   - overflow checks: every VISIBLE pill/connector's box checked against
 *     the sheet's own clip boundary (see the inline comment further down
 *     for why this is a clientWidth check on visible elements, not the more
 *     obvious `sheet.scrollWidth - sheet.clientWidth`), plus (per the brief)
 *     the page-level scrollingElement scrollWidth vs clientWidth to prove
 *     no horizontal page scroll.
 *
 * The measurer pass in _chain-kit.tsx's useChainMetrics renders a full
 * hidden copy of every pill (same PILL_CLASS) to measure text widths before
 * packing; it sets `visibility: hidden` on its wrapper. Every candidate
 * element here is filtered on `getComputedStyle(el).visibility !== "hidden"`
 * (visibility inherits, so checking the element itself already reflects the
 * wrapper's hidden state) or the first-pill pick and the connector max would
 * both be silently contaminated by invisible measurement pills.
 */
async function measure() {
  return page.evaluate(() => {
    const round = (n) => Math.round(n * 10) / 10;
    const sheet = document.querySelector('[data-lh3="sheet"]');
    const out = {
      firstPillLeftOffset: null,
      pillCount: 0,
      chainBlockHeight: null,
      longestConnectorRun: null,
      maxVisibleOverflowPx: 0,
      elementsPokingOutsideSheet: 0,
      pageScrollWidth: null,
      pageClientWidth: null,
      pageHasHorizontalScroll: null,
    };
    if (!sheet) return out;

    // `[data-lh3="sheet"]` itself carries no padding: the "equal padding on
    // all four sides" (p-6 sm:p-10) lives on its immediate content child
    // instead (see _variant-letterhead-3.tsx, "EQUAL padding on all four
    // sides"). Reading getComputedStyle off the sheet node would silently
    // return 0 and put "content left" 40px too far left, undercounting the
    // owner's flush-left rule by exactly the sheet's own padding, so find
    // the child that actually carries the padding.
    const sheetRect = sheet.getBoundingClientRect();
    const contentBox = [...sheet.children].find(
      (el) => parseFloat(getComputedStyle(el).paddingLeft || "0") > 0
    );
    const cs = contentBox ? getComputedStyle(contentBox) : getComputedStyle(sheet);
    const contentBoxRect = contentBox ? contentBox.getBoundingClientRect() : sheetRect;
    const contentLeft = contentBoxRect.left + parseFloat(cs.paddingLeft || "0");

    const housesSection = [...document.querySelectorAll("section")].find((s) =>
      (s.textContent || "").trim().startsWith("Houses")
    );
    const chainWrap = housesSection ? housesSection.querySelector("div[data-lh3-ink]") : null;

    if (chainWrap) {
      out.chainBlockHeight = round(chainWrap.getBoundingClientRect().height);

      const visible = (el) => getComputedStyle(el).visibility !== "hidden";
      const pills = [...chainWrap.querySelectorAll(".rounded-full.border")].filter(visible);
      out.pillCount = pills.length;

      if (pills.length) {
        const sorted = pills
          .map((el) => ({ el, r: el.getBoundingClientRect() }))
          .sort((a, b) => (Math.abs(a.r.top - b.r.top) > 2 ? a.r.top - b.r.top : a.r.left - b.r.left));
        out.firstPillLeftOffset = round(sorted[0].r.left - contentLeft);
      }

      const isInsidePill = (el) => pills.some((p) => p !== el && p.contains(el));
      let maxRun = 0;
      let poking = 0;
      for (const el of chainWrap.querySelectorAll("*")) {
        if (!visible(el)) continue;
        if (pills.includes(el) || isInsidePill(el)) continue;
        const tag = el.tagName.toLowerCase();
        const isConnector =
          tag === "path" ||
          tag === "line" ||
          ((tag === "div" || tag === "span") &&
            el.children.length === 0 &&
            (getComputedStyle(el).position === "absolute" ||
              getComputedStyle(el).position === "relative"));
        if (!isConnector) continue;
        const r = el.getBoundingClientRect();
        maxRun = Math.max(maxRun, r.width, r.height);
      }
      out.longestConnectorRun = round(maxRun);

      // "Overflows the sheet" means visually clipped by the sheet's own
      // `overflow-hidden` (see the sheet's className in _variant-letterhead-
      // 3.tsx), which clips at the sheet's OWN border edge, not at the
      // padded content box `contentLeft`/`contentRight` computed above (a
      // pill can legally sit inside the padding gutter without being
      // clipped). `sheet.scrollWidth - sheet.clientWidth` looked like the
      // obvious check but is a false positive here: useChainMetrics'
      // invisible measuring pass (visibility:hidden, `_chain-kit.tsx`) is
      // `absolute` with no width constraint, so it shrink-wraps to every
      // pill unwrapped on one line and reports a scrollWidth ~90px wider
      // than the sheet regardless of chain or width, even though nothing
      // is actually visible there. Checking only VISIBLE elements against
      // the sheet's own clip boundary (its client box) is what the DOM
      // actually renders.
      let maxOverflow = 0;
      const sheetClipLeft = sheetRect.left + sheet.clientLeft;
      const sheetClipRight = sheetClipLeft + sheet.clientWidth;
      for (const el of [...pills, ...chainWrap.querySelectorAll("svg")]) {
        if (!visible(el)) continue;
        const r = el.getBoundingClientRect();
        if (r.width === 0 && r.height === 0) continue;
        const overRight = r.right - sheetClipRight;
        const overLeft = sheetClipLeft - r.left;
        const over = Math.max(overRight, overLeft);
        if (over > 0.5) {
          poking++;
          maxOverflow = Math.max(maxOverflow, over);
        }
      }
      out.elementsPokingOutsideSheet = poking;
      out.maxVisibleOverflowPx = round(maxOverflow);
    }

    if (document.scrollingElement) {
      out.pageScrollWidth = document.scrollingElement.scrollWidth;
      out.pageClientWidth = document.scrollingElement.clientWidth;
      out.pageHasHorizontalScroll = out.pageScrollWidth > out.pageClientWidth + 1;
    }
    return out;
  });
}

const shots = {}; // chain key (or bucket name) -> [absolute paths]
const rows = []; // measurement table rows

function recordShot(bucket, path) {
  (shots[bucket] ||= []).push(path);
}

/* ---------------------------------------------------------------- *
 *  A. Six chain treatments x four widths (1440, 1024, 820, 390).
 *     820 first in intent (the owner's actual complaint window) but
 *     shot in ascending order so the series reads top-to-bottom.
 * ---------------------------------------------------------------- */
for (const chain of CHAIN_KEYS) {
  for (const width of WIDTHS) {
    await setWidth(width, width <= 390 ? 1400 : 1100);
    await go(`${BASE}&chain=${chain}`);
    const m = await measure();
    const path = await shot(`chain-${chain}-w${width}`);
    recordShot(chain, path);
    rows.push({ chain, width, state: "full/bird", ...m });
  }
}

/* ---------------------------------------------------------------- *
 *  B. Sparse sample, default chain (serpentine), 1440 and 390.
 * ---------------------------------------------------------------- */
for (const width of [1440, 390]) {
  await setWidth(width, width <= 390 ? 1400 : 1100);
  await go(`${BASE}&sample=sparse`);
  const m = await measure();
  const path = await shot(`sparse-serpentine-w${width}`);
  recordShot("sparse", path);
  rows.push({ chain: "serpentine (sparse)", width, state: "sparse/bird", ...m });
}

/* ---------------------------------------------------------------- *
 *  C. Photo masthead, default chain (serpentine), 1440 and 390.
 * ---------------------------------------------------------------- */
for (const width of [1440, 390]) {
  await setWidth(width, width <= 390 ? 1400 : 1100);
  await go(`${BASE}&avatar=photo`);
  const m = await measure();
  const path = await shot(`photo-serpentine-w${width}`);
  recordShot("photo", path);
  rows.push({ chain: "serpentine (photo)", width, state: "full/photo", ...m });
}

/* ---------------------------------------------------------------- *
 *  D. The stamp, held: press the colophon and shoot before its
 *     3450ms hold (STAMP_HOLD_MS) elapses. 1440 and 390, with and
 *     without a photo masthead, four shots total. Full-page so the
 *     stamp lands in frame wherever placeStamp() puts it.
 * ---------------------------------------------------------------- */
for (const width of [1440, 390]) {
  for (const avatar of ["bird", "photo"]) {
    await setWidth(width, width <= 390 ? 1400 : 1100);
    const url = avatar === "photo" ? `${BASE}&avatar=photo` : BASE;
    await go(url);
    // The colophon's aria-label always starts with "Admission number ..."
    // (see _variant-letterhead-3.tsx); a plain attribute selector finds it
    // without needing clickText's text-substring matching.
    const clicked = await page.evaluate(() => {
      const btn = document.querySelector('button[aria-label^="Admission number"]');
      if (!btn) return false;
      btn.click();
      return true;
    });
    if (!clicked) console.log(`MISS: no colophon button at width=${width} avatar=${avatar}`);
    await wait(750); // spring settle, well inside the 3450ms hold
    const path = await shot(`stamp-${avatar}-w${width}`);
    recordShot("stamp", path);
    rows.push({ chain: `stamp (${avatar})`, width, state: "stamp held", ...(await measure()) });
  }
}

/* ---------------------------------------------------------------- *
 *  E. Letterhead II, for comparison: 1440 and 390.
 * ---------------------------------------------------------------- */
for (const width of [1440, 390]) {
  await setWidth(width, width <= 390 ? 1400 : 1100);
  await go(LH2_BASE);
  const path = await shot(`compare-letterhead2-w${width}`);
  recordShot("letterhead-2 (comparison)", path);
}

/* ---------------------------------------------------------------- *
 *  Table.
 * ---------------------------------------------------------------- */
const cols = [
  ["chain", "Chain / state"],
  ["width", "Width"],
  ["firstPillLeftOffset", "1st pill L-offset"],
  ["chainBlockHeight", "Block height"],
  ["longestConnectorRun", "Longest connector"],
  ["maxVisibleOverflowPx", "Max overflow px"],
  ["elementsPokingOutsideSheet", "# poking out"],
  ["pageHasHorizontalScroll", "Page h-scroll?"],
];
const widths = cols.map(([key, label]) =>
  Math.max(label.length, ...rows.map((r) => String(r[key] ?? "-").length))
);
function fmtRow(cells) {
  return cells.map((c, i) => String(c).padEnd(widths[i])).join("  |  ");
}
const lines = [];
lines.push(fmtRow(cols.map(([, label]) => label)));
lines.push(widths.map((w) => "-".repeat(w)).join("--+--"));
for (const r of rows) {
  lines.push(fmtRow(cols.map(([key]) => r[key] ?? "-")));
}
const table = lines.join("\n");

console.log("\n" + table + "\n");

const rule = "The owner's rule: 1st pill L-offset must read 0 at every width. Max overflow px and # poking out must both read 0 (measured against VISIBLE elements only, i.e. excluding the invisible measuring pass useChainMetrics always renders). Page h-scroll? must read false at 390.";
writeFileSync(join(dir, "measurements.txt"), table + "\n\n" + rule + "\n");
console.log(`saved measurements.txt`);

console.log("\nSCREENSHOTS BY GROUP:");
for (const [bucket, paths] of Object.entries(shots)) {
  console.log(`\n  ${bucket}:`);
  for (const p of paths) console.log(`    ${p}`);
}

if (errors.length) {
  console.log("\nPAGE ERRORS:");
  for (const e of [...new Set(errors)]) console.log("  " + e);
} else {
  console.log("\nno page errors");
}

await browser.close();
