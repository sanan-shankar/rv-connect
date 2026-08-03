/**
 * Judging probe for the six house-chain treatments, owner-9 fixture.
 *
 * lh3-shots-owner.mjs already answers "is each row's first PILL flush"
 * and "how tall is the block". It does not answer two of the owner's
 * three complaints in numbers:
 *   - dead whitespace: how much of each row's width is actually inked,
 *     and how much of the host's width the widest row reaches.
 *   - stretched connectors: whether the connector run lengths inside ONE
 *     width are all the same number or a spread.
 * This probe reads both off the DOM. Read-only; writes one txt file next
 * to the round-2 shots and touches no app source.
 *
 * Usage: node scripts/qa/lh3-density-probe.mjs
 */
import puppeteer from "puppeteer";
import { existsSync, writeFileSync } from "fs";
import { dirname, join, resolve } from "path";
import { fileURLToPath } from "url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
process.chdir(repoRoot);

const dir = "./temporary screenshots/lh3-owner";
const BASE = "http://localhost:3000/lab/profiles?v=letterhead-3";
const CHAIN_KEYS = ["serpentine", "stepped", "route", "rail", "stave", "zigzag"];
const WIDTHS = [1440, 820, 390];

const executablePath = [
  process.env.PUPPETEER_EXECUTABLE_PATH,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
]
  .filter(Boolean)
  .find((p) => existsSync(p));

const browser = await puppeteer.launch({
  headless: true,
  executablePath,
  args: ["--no-sandbox", "--disable-setuid-sandbox"],
});
const page = await browser.newPage();
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function probe() {
  return page.evaluate(() => {
    const round = (n) => Math.round(n * 10) / 10;
    const section = [...document.querySelectorAll("section")].find((s) =>
      (s.textContent || "").trim().startsWith("Houses")
    );
    if (!section) return null;
    const wrap = section.querySelector("div[data-lh3-ink]");
    if (!wrap) return null;
    const host = wrap.querySelector(".relative.w-full") ?? wrap;
    const hr = host.getBoundingClientRect();
    const visible = (el) => getComputedStyle(el).visibility !== "hidden";
    const pills = [...wrap.querySelectorAll(".rounded-full.border")].filter(visible);

    // Same 4px row-clustering epsilon lh3-shots-owner.mjs uses, so the two
    // tables' row counts line up and can be read side by side.
    const ROW_EPS = 4;
    const items = pills.map((el) => ({ el, r: el.getBoundingClientRect() }));
    items.sort((a, b) => a.r.top - b.r.top || a.r.left - b.r.left);
    const rows = [];
    for (const it of items) {
      let row = rows.find((r) => Math.abs(r.top - it.r.top) <= ROW_EPS);
      if (!row) {
        row = { top: it.r.top, items: [] };
        rows.push(row);
      }
      row.items.push(it);
    }
    rows.sort((a, b) => a.top - b.top);

    // Connector ink: the same definition lh3-shots-owner.mjs's measure()
    // uses (visible svg path/line, or a positioned childless div/span),
    // but collected as a list of run lengths instead of only the max, so
    // a fixed-length set can be told apart from a stretched one.
    const isInsidePill = (el) => pills.some((p) => p !== el && p.contains(el));
    const runs = [];
    let inkLeft = Infinity;
    let inkRight = -Infinity;
    for (const el of wrap.querySelectorAll("*")) {
      if (!visible(el)) continue;
      if (pills.includes(el) || isInsidePill(el)) continue;
      const tag = el.tagName.toLowerCase();
      const cs = getComputedStyle(el);
      const isConnector =
        tag === "path" ||
        tag === "line" ||
        ((tag === "div" || tag === "span") &&
          el.children.length === 0 &&
          (cs.position === "absolute" || cs.position === "relative"));
      if (!isConnector) continue;
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) continue;
      runs.push(round(Math.max(r.width, r.height)));
      inkLeft = Math.min(inkLeft, r.left);
      inkRight = Math.max(inkRight, r.right);
    }
    for (const p of pills) {
      const r = p.getBoundingClientRect();
      inkLeft = Math.min(inkLeft, r.left);
      inkRight = Math.max(inkRight, r.right);
    }

    const rowStats = rows.map((row) => {
      const left = Math.min(...row.items.map((i) => i.r.left));
      const right = Math.max(...row.items.map((i) => i.r.right));
      return {
        n: row.items.length,
        pillLeft: round(left - hr.left),
        pillRight: round(right - hr.left),
        // Share of the host's width this row's pills actually reach.
        fillPct: Math.round(((right - hr.left) / hr.width) * 100),
      };
    });

    const uniqRuns = [...new Set(runs)].sort((a, b) => a - b);
    return {
      hostWidth: round(hr.width),
      blockHeight: round(wrap.getBoundingClientRect().height),
      rowCount: rows.length,
      rows: rowStats,
      // Worst row: how much horizontal room the chain leaves unused.
      minFillPct: Math.min(...rowStats.map((r) => r.fillPct)),
      meanFillPct: Math.round(rowStats.reduce((a, r) => a + r.fillPct, 0) / rowStats.length),
      connectorRuns: uniqRuns,
      connectorSpread: uniqRuns.length ? round(uniqRuns[uniqRuns.length - 1] - uniqRuns[0]) : 0,
      connectorCount: runs.length,
      // Negative = ink hangs left of the chain host's own origin.
      inkLeftOffset: round(inkLeft - hr.left),
      inkRightOffset: round(inkRight - hr.left),
    };
  });
}

const out = [];
for (const chain of CHAIN_KEYS) {
  for (const width of WIDTHS) {
    await page.setViewport({ width, height: width <= 390 ? 1400 : 1100 });
    try {
      await page.goto(`${BASE}&fixture=owner-9&chain=${chain}`, {
        waitUntil: "networkidle2",
        timeout: 30000,
      });
    } catch {
      await wait(2000);
    }
    // Same settle hold the shot harness uses for the entrance spring.
    await wait(2200);
    const m = await probe();
    out.push({ chain, width, ...m });
  }
}
await browser.close();

const lines = [];
lines.push(
  "chain       w     rows  meanFill%  minFill%  blockH  connRuns(px, unique)                inkL   inkR   hostW"
);
for (const r of out) {
  lines.push(
    [
      r.chain.padEnd(11),
      String(r.width).padEnd(5),
      String(r.rowCount).padEnd(5),
      String(r.meanFillPct).padEnd(10),
      String(r.minFillPct).padEnd(9),
      String(r.blockHeight).padEnd(7),
      (r.connectorRuns.join(",") || "-").slice(0, 35).padEnd(36),
      String(r.inkLeftOffset).padEnd(6),
      String(r.inkRightOffset).padEnd(6),
      String(r.hostWidth),
    ].join(" ")
  );
  lines.push(
    "            per-row pillLeft/pillRight/fill%: " +
      r.rows.map((x) => `[${x.n}] ${x.pillLeft}/${x.pillRight}/${x.fillPct}%`).join("  ")
  );
}
const text = lines.join("\n") + "\n";
writeFileSync(join(dir, "density.txt"), text);
console.log(text);
