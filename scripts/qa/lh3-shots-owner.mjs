/**
 * QA harness, round 2: re-shoot the Letterhead III house-chain matrix
 * against the OWNER'S REAL DATA, not the eight-span _data.ts mock.
 *
 * Round 1 (scripts/qa/lh3-shots.mjs) shot all 34 frames against the mock
 * because nothing in that script ever passed `?fixture=`, so every "does
 * the chain hold up" judgement in that round was made on a chain that
 * cannot reproduce the owner's actual complaint. `?fixture=owner-9` (see
 * _chain-kit.tsx's CHAIN_FIXTURES, and _variant-letterhead-3.tsx which now
 * defaults the whole page to it) is his real nine spans, including the
 * repeated year (Alamanda and Jacaranda both 2021-22) that the mock never
 * had a chance to expose. This script targets that fixture on purpose,
 * plus two stress fixtures (twelve, widest) for the two strongest chains.
 *
 * Kept deliberately separate from lh3-shots.mjs (untouched) rather than
 * folding this in, so round 1's own record of what an 8-span mock looked
 * like is not overwritten: they measure two different fixtures and both
 * are worth keeping on disk.
 *
 * Usage: node scripts/qa/lh3-shots-owner.mjs
 */
import puppeteer from "puppeteer";
import sharp from "sharp";
import { existsSync, mkdirSync, writeFileSync } from "fs";
import { dirname, join, resolve } from "path";
import { fileURLToPath } from "url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
process.chdir(repoRoot);

const dir = "./temporary screenshots/lh3-owner";
const cropDir = join(dir, "crop");
mkdirSync(dir, { recursive: true });
mkdirSync(cropDir, { recursive: true });

const BASE = "http://localhost:3000/lab/profiles?v=letterhead-3";

// The order the owner's brief lists them in.
const CHAIN_KEYS = ["serpentine", "stepped", "route", "rail", "stave", "zigzag"];
const WIDTHS = [1440, 820, 390];
// "The two strongest only" per the brief, checked past nine spans.
const STRONG_CHAINS = ["serpentine", "stepped"];
const STRESS_FIXTURES = ["twelve", "widest"];
const STRESS_WIDTHS = [820, 390];

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
  await waitForChainSettled();
}

/**
 * Polls until the Houses chain block has committed a non-zero height.
 * Copied from lh3-shots.mjs's own waitForChainSettled, including its
 * 2000ms post-ready hold: that wait time was found empirically there
 * (headless Chrome's compositor lagging its own computed-style commit on
 * the Stave treatment specifically), not guessed, and the owner-9 fixture
 * runs the exact same six components so the same lag applies here.
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
      await wait(2000);
      return state;
    }
    await wait(150);
  }
  return "timed-out";
}

/**
 * Full-page capture. Resizes the viewport to the page's real height and
 * settles again BEFORE screenshotting (not via `fullPage: true`), for the
 * same reason lh3-shots.mjs does it this way: Puppeteer's own fullPage
 * capture retriggers `_chain-kit.tsx`'s ResizeObserver a beat before the
 * shutter, which restarts Stave's entrance spring and reliably caught it
 * at ~5% opacity there. Doing the resize ourselves, then shooting plain,
 * removes the resize-right-before-the-shutter step.
 */
async function shot(name) {
  const fullHeight = await page.evaluate(() => document.documentElement.scrollHeight);
  const vp = page.viewport();
  if (fullHeight > vp.height) {
    await page.setViewport({ width: vp.width, height: fullHeight });
    await waitForChainSettled();
  }
  const path = join(dir, `${name}.png`);
  await page.screenshot({ path });
  return resolve(path);
}

/**
 * Reads the Houses block's rectangle (the "Houses" caption plus the chain
 * drawing under it), clipped to the sheet's own box so a narrow chain at
 * 390 never yields a crop rectangle that reaches outside the sheet. PAD
 * is a script-only constant (this crop is never shipped UI, so it is not
 * subject to the app's LiftKit spacing rule): 20px of surrounding paper
 * on every side, enough to prove the block isn't touching the sheet's own
 * edge without pulling in the neighbouring section's text.
 */
async function measureHousesRect() {
  const rect = await page.evaluate(() => {
    const section = [...document.querySelectorAll("section")].find((s) =>
      (s.textContent || "").trim().startsWith("Houses")
    );
    if (!section) return null;
    const r = section.getBoundingClientRect();
    const sheet = document.querySelector('[data-lh3="sheet"]');
    const sr = sheet ? sheet.getBoundingClientRect() : null;
    return {
      top: r.top,
      left: r.left,
      right: r.right,
      bottom: r.bottom,
      sheet: sr ? { top: sr.top, left: sr.left, right: sr.right, bottom: sr.bottom } : null,
    };
  });
  if (!rect) return null;
  const PAD = 20;
  let left = rect.left - PAD;
  let top = rect.top - PAD;
  let right = rect.right + PAD;
  let bottom = rect.bottom + PAD;
  if (rect.sheet) {
    left = Math.max(left, rect.sheet.left);
    top = Math.max(top, rect.sheet.top);
    right = Math.min(right, rect.sheet.right);
    bottom = Math.min(bottom, rect.sheet.bottom);
  }
  const x = Math.max(0, Math.round(left));
  const y = Math.max(0, Math.round(top));
  const width = Math.max(1, Math.round(right - x));
  const height = Math.max(1, Math.round(bottom - y));
  return { x, y, width, height };
}

/**
 * Crops just the Houses block out of an ALREADY-SAVED full-page PNG,
 * using `sharp` to cut pixels rather than asking Puppeteer for a second
 * live screenshot. This is load-bearing, not a style choice: a first pass
 * of this script cropped with a second `page.screenshot({ clip })` call
 * immediately after the full-page shot, and it silently caught the
 * chain's per-pill staggered entrance spring mid-flight almost every
 * time, even though the full-page shot taken a moment earlier was
 * complete (serpentine at 820 rendered ONLY its first pill in the crop,
 * every other pill and its arrow blank; rail at 1440 dropped just
 * Jacaranda, the highest-index pill with the longest stagger delay, and
 * the connector into it). Confirmed by diffing: the full-page PNG for
 * that exact same page state has every pill painted. So the second
 * `page.screenshot()` call itself was the trigger, the same family of bug
 * lh3-shots.mjs already found and fixed for `fullPage: true` (a
 * screenshot call forcing a synchronous layout/viewport step that
 * re-primes the ResizeObserver `_chain-kit.tsx`'s `useChainMetrics`
 * holds, restarting the entrance spring), just proving true for a `clip`
 * capture too, not only a `fullPage` one. Slicing pixels out of the one
 * screenshot Puppeteer already took removes the second live capture
 * entirely, so there is nothing left to re-trigger anything.
 */
async function cropHousesBlock(name, fullPngPath) {
  const rect = await measureHousesRect();
  if (!rect) return null;
  // Belt-and-braces clamp against the PNG's own pixel dimensions: sharp's
  // `extract` throws on a rectangle that reaches even 1px past the image,
  // and the CSS-px rect from getBoundingClientRect() is rounded
  // independently of the PNG's actual size.
  const meta = await sharp(fullPngPath).metadata();
  const width = Math.min(rect.width, meta.width - rect.x);
  const height = Math.min(rect.height, meta.height - rect.y);
  const path = join(cropDir, `${name}.png`);
  // sharp's `extract` wants { left, top, width, height }, not { x, y }.
  await sharp(fullPngPath).extract({ left: rect.x, top: rect.y, width, height }).toFile(path);
  return resolve(path);
}

async function setWidth(width, height = 1000) {
  await page.setViewport({ width, height });
}

/**
 * The measurements the brief asks for, read off the DOM:
 *   - rows: the chain's pills clustered by top position (ROW_EPS below),
 *     each row reporting its own leftmost pill's offset from THE CHAIN
 *     HOST (not the sheet). "Host" is the literal term the codebase uses
 *     (`useChainMetrics`'s `hostRef`, ./_chain-kit.tsx): every one of the
 *     six concepts' root element is `<div ref={hostRef} className={cn(
 *     "relative w-full", className)}>` and nothing else in the chain
 *     wrap shares both those classes, so it is the first (and only)
 *     `.relative.w-full` match inside the wrap.
 *   - chainBlockHeight: the chain wrap's own rendered height (the
 *     `div[data-lh3-ink]` directly under the "Houses" label; same node
 *     lh3-shots.mjs measured).
 *   - longestConnectorRun / overflow checks: identical heuristic to
 *     lh3-shots.mjs (see that file's own long comment for the reasoning:
 *     visible SVG path/line ink plus positioned leaf div/span, both
 *     filtered against the invisible measuring pass), copied rather than
 *     imported because these are two standalone QA scripts.
 *
 * NOTE ON "ROWS" FOR STAVE. Stave draws a same-year repeat (Alamanda,
 * Jacaranda) as two pills stacked in one column ("a chord", per that
 * file's own header comment), not as two pills side by side. Clustering
 * purely by top position therefore counts that stack as two rows, which
 * is pixel-true but not how Stave's own model of "line" works. Flagged
 * inline in the printed table rather than hidden, since the repeated-year
 * section of this report exists specifically to describe that case.
 */
async function measure() {
  return page.evaluate(() => {
    const round = (n) => Math.round(n * 100) / 100;
    const out = {
      rows: [],
      rowCount: 0,
      chainBlockHeight: null,
      longestConnectorRun: null,
      maxVisibleOverflowPx: 0,
      elementsPokingOutsideSheet: 0,
      pageScrollWidth: null,
      pageClientWidth: null,
      pageHasHorizontalScroll: null,
      hostFound: false,
    };

    const sheet = document.querySelector('[data-lh3="sheet"]');
    const housesSection = [...document.querySelectorAll("section")].find((s) =>
      (s.textContent || "").trim().startsWith("Houses")
    );
    const chainWrap = housesSection ? housesSection.querySelector("div[data-lh3-ink]") : null;

    if (chainWrap && sheet) {
      out.chainBlockHeight = round(chainWrap.getBoundingClientRect().height);

      const host = chainWrap.querySelector(".relative.w-full");
      out.hostFound = !!host;
      const hostRect = (host ?? chainWrap).getBoundingClientRect();

      const visible = (el) => getComputedStyle(el).visibility !== "hidden";
      const pills = [...chainWrap.querySelectorAll(".rounded-full.border")].filter(visible);

      // Cluster pills into visual rows by top position. ROW_EPS = 4px: a
      // pill's own row-mates (flex-aligned, same line) read within
      // sub-pixel of each other; 4px is comfortably inside that and well
      // clear of one pill-height (~24px) worth of vertical drift, so it
      // cannot merge two genuinely different rows.
      const ROW_EPS = 4;
      const withRects = pills.map((el) => ({ el, r: el.getBoundingClientRect() }));
      withRects.sort((a, b) => a.r.top - b.r.top || a.r.left - b.r.left);
      const rows = [];
      for (const item of withRects) {
        let row = rows.find((r) => Math.abs(r.top - item.r.top) <= ROW_EPS);
        if (!row) {
          row = { top: item.r.top, items: [] };
          rows.push(row);
        }
        row.items.push(item);
      }
      rows.sort((a, b) => a.top - b.top);
      out.rows = rows.map((r) => {
        const leftMost = Math.min(...r.items.map((i) => i.r.left));
        return { pillCount: r.items.length, leftOffset: round(leftMost - hostRect.left) };
      });
      out.rowCount = rows.length;

      const isInsidePill = (el) => pills.some((p) => p !== el && p.contains(el));
      let maxRun = 0;
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

      const sheetRect = sheet.getBoundingClientRect();
      let maxOverflow = 0;
      let poking = 0;
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

/**
 * The repeated-year check: finds the Alamanda and Jacaranda pills (both
 * 2021-22 in OWNER_CHAIN) and reports, precisely, what sits between them
 * and whether their boxes collide. Two pills are "between" candidates for
 * an svg (an Arrow) or a positioned leaf div/span (Stave's ribbon); this
 * check reports at the svg/element level (not per-<path>) since the
 * question here is "is there an arrow at all", not the arrow's own ink
 * length (that is what `longestConnectorRun` in `measure()` is for).
 */
async function repeatedYearCheck() {
  return page.evaluate(() => {
    const housesSection = [...document.querySelectorAll("section")].find((s) =>
      (s.textContent || "").trim().startsWith("Houses")
    );
    if (!housesSection) return { found: false, reason: "no Houses section" };
    const chainWrap = housesSection.querySelector("div[data-lh3-ink]");
    if (!chainWrap) return { found: false, reason: "no chain wrap" };

    const visible = (el) => getComputedStyle(el).visibility !== "hidden";
    const pills = [...chainWrap.querySelectorAll(".rounded-full.border")].filter(visible);
    const findPill = (house) => pills.find((p) => (p.textContent || "").trim().startsWith(house));
    const a = findPill("Alamanda");
    const j = findPill("Jacaranda");
    if (!a || !j) return { found: false, reason: "pill(s) not found (visible pill count " + pills.length + ")" };

    const ar = a.getBoundingClientRect();
    const jr = j.getBoundingClientRect();
    const round = (n) => Math.round(n * 100) / 100;

    const overlapX = Math.max(0, Math.min(ar.right, jr.right) - Math.max(ar.left, jr.left));
    const overlapY = Math.max(0, Math.min(ar.bottom, jr.bottom) - Math.max(ar.top, jr.top));
    const collide = overlapX > 0.5 && overlapY > 0.5;
    const sameRow = Math.abs(ar.top - jr.top) <= 4;

    const between = [];
    for (const el of chainWrap.querySelectorAll("svg, div, span")) {
      if (el === a || el === j || a.contains(el) || j.contains(el)) continue;
      if (a.parentElement !== null && el.contains(a)) continue; // ancestor wrapper, not a between-element
      if (el.contains(j)) continue;
      if (!visible(el)) continue;
      const tag = el.tagName.toLowerCase();
      if (tag === "div" || tag === "span") {
        // Only leaf, positioned elements count as drawn connectors here
        // (matches measure()'s connector definition); a plain flex-row
        // wrapper div is not itself "something drawn between the pills".
        if (el.children.length !== 0) continue;
        const pos = getComputedStyle(el).position;
        if (pos !== "absolute" && pos !== "relative") continue;
      }
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) continue;
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      let inBetween = false;
      if (sameRow) {
        const lo = Math.min(ar.right, jr.right);
        const hi = Math.max(ar.left, jr.left);
        inBetween = cx >= lo - 1 && cx <= hi + 1;
      } else {
        const lo = Math.min(ar.bottom, jr.bottom);
        const hi = Math.max(ar.top, jr.top);
        inBetween = cy >= lo - 1 && cy <= hi + 1;
      }
      if (inBetween) {
        between.push({
          tag,
          className: (el.getAttribute("class") || "").slice(0, 80),
          w: Math.round(r.width),
          h: Math.round(r.height),
        });
      }
    }

    return {
      found: true,
      sameRow,
      alamanda: { left: round(ar.left), top: round(ar.top), right: round(ar.right), bottom: round(ar.bottom) },
      jacaranda: { left: round(jr.left), top: round(jr.top), right: round(jr.right), bottom: round(jr.bottom) },
      gapPx: sameRow ? round(Math.max(ar.left, jr.left) - Math.min(ar.right, jr.right)) : round(Math.max(ar.top, jr.top) - Math.min(ar.bottom, jr.bottom)),
      collide,
      overlapX: round(overlapX),
      overlapY: round(overlapY),
      between,
    };
  });
}

const shots = {}; // treatment/fixture bucket -> [{ full, crop }]
const crops = {}; // treatment -> [absolute crop paths], for the report
const rows = []; // measurement table rows
const repeatedYearRows = [];

function recordShot(bucket, full, crop) {
  (shots[bucket] ||= []).push({ full, crop });
  if (crop) (crops[bucket] ||= []).push(crop);
}

/* ---------------------------------------------------------------- *
 *  A. Six chain treatments x three widths, owner-9 fixture.
 * ---------------------------------------------------------------- */
for (const chain of CHAIN_KEYS) {
  for (const width of WIDTHS) {
    await setWidth(width, width <= 390 ? 1400 : 1100);
    await go(`${BASE}&fixture=owner-9&chain=${chain}`);
    const m = await measure();
    const full = await shot(`owner9-${chain}-w${width}`);
    const crop = await cropHousesBlock(`owner9-${chain}-w${width}`, full);
    recordShot(chain, full, crop);
    rows.push({ chain, fixture: "owner-9", width, ...m });

    const ry = await repeatedYearCheck();
    repeatedYearRows.push({ chain, width, ...ry });
  }
}

/* ---------------------------------------------------------------- *
 *  B. Serpentine and Stepped only, twelve + widest fixtures, 820/390,
 *     to prove they hold past nine spans.
 * ---------------------------------------------------------------- */
for (const chain of STRONG_CHAINS) {
  for (const fixture of STRESS_FIXTURES) {
    for (const width of STRESS_WIDTHS) {
      await setWidth(width, width <= 390 ? 1600 : 1200);
      await go(`${BASE}&fixture=${fixture}&chain=${chain}`);
      const m = await measure();
      const full = await shot(`${fixture}-${chain}-w${width}`);
      const crop = await cropHousesBlock(`${fixture}-${chain}-w${width}`, full);
      recordShot(`${chain} (${fixture})`, full, crop);
      rows.push({ chain, fixture, width, ...m });
    }
  }
}

/* ---------------------------------------------------------------- *
 *  Table.
 * ---------------------------------------------------------------- */
function fmtRowOffsets(rowList) {
  if (!rowList || rowList.length === 0) return "-";
  return rowList.map((r) => (r.pillCount > 1 ? `${r.leftOffset}(x${r.pillCount})` : `${r.leftOffset}`)).join(", ");
}

const cols = [
  ["chain", "Chain"],
  ["fixture", "Fixture"],
  ["width", "Width"],
  ["rowCount", "# rows"],
  ["rowOffsets", "Per-row 1st-pill L-offset (host)"],
  ["chainBlockHeight", "Block height"],
  ["longestConnectorRun", "Longest connector"],
  ["overflow", "Overflow(px)/#poking"],
  ["scroll", "390: scrollW/clientW"],
];

const tableRows = rows.map((r) => ({
  chain: r.chain,
  fixture: r.fixture,
  width: r.width,
  rowCount: r.rowCount,
  rowOffsets: fmtRowOffsets(r.rows),
  chainBlockHeight: r.chainBlockHeight,
  longestConnectorRun: r.longestConnectorRun,
  overflow: `${r.maxVisibleOverflowPx}px / ${r.elementsPokingOutsideSheet}`,
  scroll: r.width === 390 ? `${r.pageScrollWidth}/${r.pageClientWidth}${r.pageHasHorizontalScroll ? "  <== H-SCROLL" : ""}` : "-",
}));

const widths = cols.map(([key, label]) =>
  Math.max(label.length, ...tableRows.map((r) => String(r[key] ?? "-").length))
);
function fmtLine(cells) {
  return cells.map((c, i) => String(c).padEnd(widths[i])).join("  |  ");
}
const lines = [];
lines.push(fmtLine(cols.map(([, label]) => label)));
lines.push(widths.map((w) => "-".repeat(w)).join("--+--"));
for (const r of tableRows) lines.push(fmtLine(cols.map(([key]) => r[key] ?? "-")));
const table = lines.join("\n");

/* ---------------------------------------------------------------- *
 *  Repeated-year report (Alamanda 2021-22 / Jacaranda 2021-22).
 * ---------------------------------------------------------------- */
const ryLines = [];
ryLines.push("REPEATED YEAR: Alamanda 2021-22 and Jacaranda 2021-22 (owner-9 fixture only).");
ryLines.push("Per treatment per width: what is drawn between the two pills, and whether they collide.");
ryLines.push("");
for (const r of repeatedYearRows) {
  if (!r.found) {
    ryLines.push(`${r.chain.padEnd(11)} w${r.width}: NOT FOUND (${r.reason})`);
    continue;
  }
  const betweenDesc =
    r.between.length === 0
      ? "NOTHING drawn between them (plain gap)"
      : r.between.map((b) => `${b.tag}${b.tag === "svg" ? " (arrow)" : ` [${b.className}]`} ${b.w}x${b.h}px`).join(", ");
  ryLines.push(
    `${r.chain.padEnd(11)} w${r.width}: ${r.sameRow ? "same row" : "different rows"}, ` +
      `gap=${r.gapPx}px, between: ${betweenDesc}, ` +
      `collide=${r.collide}${r.collide ? ` (overlapX=${r.overlapX}px overlapY=${r.overlapY}px)` : ""}`
  );
}
const repeatedYearReport = ryLines.join("\n");

/* ---------------------------------------------------------------- *
 *  Write + print.
 * ---------------------------------------------------------------- */
const rule =
  "The owner's rule: every row's 1st pill L-offset relative to the chain host must read 0 at every width " +
  "(format above is per-row list in top-to-bottom order; \"(xN)\" marks a row holding N stacked pills, e.g. Stave's " +
  "same-year chord). Overflow(px)/#poking must both read 0. At 390, scrollW must equal clientW (no page h-scroll).";

const fileOut = table + "\n\n" + rule + "\n\n" + "=".repeat(70) + "\n\n" + repeatedYearReport + "\n";
writeFileSync(join(dir, "measurements.txt"), fileOut);

console.log("\n" + table + "\n");
console.log(rule + "\n");
console.log(repeatedYearReport + "\n");
console.log(`saved ${join(dir, "measurements.txt")}`);

console.log("\nSCREENSHOTS BY GROUP (full / crop):");
for (const [bucket, entries] of Object.entries(shots)) {
  console.log(`\n  ${bucket}:`);
  for (const e of entries) {
    console.log(`    ${e.full}`);
    if (e.crop) console.log(`      crop: ${e.crop}`);
  }
}

if (errors.length) {
  console.log("\nPAGE ERRORS:");
  for (const e of [...new Set(errors)]) console.log("  " + e);
} else {
  console.log("\nno page errors");
}

await browser.close();
