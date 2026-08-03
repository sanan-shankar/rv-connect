/**
 * Reading-order probe for the six house-chain treatments, owner-9 fixture.
 *
 * lh3-shots-owner.mjs already measured geometry (rows, flush-left offsets,
 * overflow). It does NOT measure the one thing the reading lens actually
 * asks about: how many times the eye has to REVERSE direction to get from
 * Golden to Duranta, and how much of each row is pill versus empty lane.
 *
 * Two numbers per treatment per width:
 *   - reversals: walk the pills in CHRONOLOGICAL order (matched by house
 *     name against OWNER_CHAIN's own order, because DOM order is NOT
 *     chronological in every treatment: the serpentine emits each
 *     right-to-left row already reversed, so trusting DOM order scored it
 *     a flattering 1 when the eye actually turns 3 times) and count how
 *     many consecutive pairs move LEFTWARD
 *     (next pill's centre x is left of the current one's by more than
 *     REVERSAL_EPS). A pure top-to-bottom list scores 0. A boustrophedon
 *     scores once per turn. REVERSAL_EPS = 8px: half a pill's own corner
 *     radius, big enough that a pill sitting a hair left of the one above
 *     it in the SAME column (Stave's stacked same-year chord) is not
 *     miscounted as a leftward move, small enough that a real row reversal
 *     (tens to hundreds of px) always trips it.
 *   - inkRatio: summed pill width divided by (rowCount x host width). The
 *     owner's complaint about the shipped chain was "most of each line is
 *     just arrows", so this is his complaint expressed as a fraction:
 *     higher means more of the line is houses, less is empty lane.
 *
 * Usage: node scripts/qa/lh3-owner-reading-probe.mjs
 */
import puppeteer from "puppeteer";
import { existsSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

process.chdir(resolve(dirname(fileURLToPath(import.meta.url)), "../.."));

const BASE = "http://localhost:3000/lab/profiles?v=letterhead-3";
const CHAINS = ["serpentine", "stepped", "route", "rail", "stave", "zigzag"];
const WIDTHS = [1440, 820, 390];

const executablePath = [
  process.env.PUPPETEER_EXECUTABLE_PATH,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
].filter(Boolean).find((p) => existsSync(p));

const browser = await puppeteer.launch({
  headless: true,
  executablePath,
  args: ["--no-sandbox", "--disable-setuid-sandbox"],
});
const page = await browser.newPage();
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const rows = [];
for (const chain of CHAINS) {
  for (const width of WIDTHS) {
    await page.setViewport({ width, height: width <= 390 ? 1400 : 1100 });
    try {
      await page.goto(`${BASE}&fixture=owner-9&chain=${chain}`, {
        waitUntil: "networkidle2",
        timeout: 30000,
      });
    } catch {
      /* fall through to the settle wait below */
    }
    // Same 2000ms settle the shot harness uses: headless Chrome's compositor
    // lags the chain's entrance spring, and a pill mid-spring reports a
    // transformed rect.
    await wait(2000);

    // OWNER_CHAIN's own order (src/app/lab/profiles/_chain-kit.tsx). Held
    // here as plain strings so the probe can put the pills back into
    // chronological order whatever order the treatment chose to emit them.
    const ORDER = [
      "Golden", "Raavi", "Palm", "Kailash", "Krishna",
      "Cauvery", "Alamanda", "Jacaranda", "Duranta",
    ];

    const m = await page.evaluate((ORDER) => {
      const section = [...document.querySelectorAll("section")].find((s) =>
        (s.textContent || "").trim().startsWith("Houses")
      );
      const wrap = section?.querySelector("div[data-lh3-ink]");
      if (!wrap) return null;
      const host = wrap.querySelector(".relative.w-full") ?? wrap;
      const hostRect = host.getBoundingClientRect();
      const visible = (el) => getComputedStyle(el).visibility !== "hidden";
      const pills = [...wrap.querySelectorAll(".rounded-full.border")].filter(visible);

      const REVERSAL_EPS = 8;
      const rects = pills.map((p) => p.getBoundingClientRect());
      const chrono = ORDER.map((house) =>
        pills.findIndex((p) => (p.textContent || "").trim().startsWith(house))
      ).filter((i) => i >= 0);
      let reversals = 0;
      let missingPills = ORDER.length - chrono.length;
      for (let k = 1; k < chrono.length; k++) {
        const a = rects[chrono[k - 1]];
        const b = rects[chrono[k]];
        if (b.left + b.width / 2 < a.left + a.width / 2 - REVERSAL_EPS) reversals++;
      }

      const ROW_EPS = 4;
      const tops = [];
      for (const r of rects) {
        if (!tops.some((t) => Math.abs(t - r.top) <= ROW_EPS)) tops.push(r.top);
      }

      // rtlRows: rows whose own internal reading direction runs backwards,
      // i.e. the row's chronologically-later pill sits to the LEFT of its
      // earlier one. This is the cost the reversal count does not capture:
      // a boustrophedon keeps the eye path continuous (few leftward jumps)
      // by making whole rows read right to left, and a reader who has not
      // been told the rule will read those rows the wrong way round.
      let rtlRows = 0;
      for (const t of tops) {
        const inRow = chrono.filter((i) => Math.abs(rects[i].top - t) <= ROW_EPS);
        if (inRow.length < 2) continue;
        const first = rects[inRow[0]];
        const last = rects[inRow[inRow.length - 1]];
        if (last.left + last.width / 2 < first.left + first.width / 2 - REVERSAL_EPS) rtlRows++;
      }
      const pillInk = rects.reduce((s, r) => s + r.width, 0);
      const lane = tops.length * hostRect.width;

      return {
        pillCount: pills.length,
        missingPills,
        reversals,
        rtlRows,
        rowCount: tops.length,
        inkRatio: Math.round((pillInk / lane) * 1000) / 10,
        hostWidth: Math.round(hostRect.width),
      };
    }, ORDER);
    rows.push({ chain, width, ...(m ?? {}) });
  }
}

const head = ["Chain", "W", "pills", "rows", "reversals", "RTL rows", "pill-ink % of lane", "hostW", "unmatched"];
const body = rows.map((r) => [
  r.chain,
  r.width,
  r.pillCount ?? "-",
  r.rowCount ?? "-",
  r.reversals ?? "-",
  r.rtlRows ?? "-",
  r.inkRatio ?? "-",
  r.hostWidth ?? "-",
  r.missingPills ?? "-",
]);
const w = head.map((h, i) => Math.max(String(h).length, ...body.map((b) => String(b[i]).length)));
const line = (cells) => cells.map((c, i) => String(c).padEnd(w[i])).join("  |  ");
console.log(line(head));
console.log(w.map((n) => "-".repeat(n)).join("--+--"));
for (const b of body) console.log(line(b));

await browser.close();
