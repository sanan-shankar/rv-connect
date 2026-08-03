/**
 * Measures the Letterhead III LAB PANEL (the fixed chrome that holds the
 * sample/avatar toggles, the house-data fixture switcher and the chain
 * switcher) and proves which house pills the sheet actually drew.
 *
 * Why a probe and not just a screenshot: the question "did the panel stay
 * readable after a control was added" is a height/row-count question, and
 * the question "does the owner's real chain render" is a text question.
 * Both are answered exactly off the DOM and only approximately off a PNG.
 *
 * Usage: node scripts/qa/lh3-fixture-probe.mjs [extraQuery]
 */
import puppeteer from "puppeteer";
import { existsSync, mkdirSync } from "fs";
import { dirname, join, resolve } from "path";
import { fileURLToPath } from "url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
process.chdir(repoRoot);
const dir = "./temporary screenshots/lh3-fixture";
mkdirSync(dir, { recursive: true });

const BASE = "http://localhost:3000/lab/profiles?v=letterhead-3";
const extra = process.argv[2] ? `&${process.argv[2]}` : "";

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
const errors = [];
page.on("pageerror", (e) => errors.push(`pageerror: ${e.message.split("\n")[0]}`));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(`console.error: ${m.text().slice(0, 300)}`);
});
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function measure() {
  return page.evaluate(() => {
    const round = (n) => Math.round(n * 10) / 10;
    const panel = document.querySelector('[data-lh3="lab-panel"], .glass.fixed');
    const sheet = document.querySelector('[data-lh3="sheet"]');
    const out = { panel: null, rows: null, pillRows: [], housePills: [], srText: null, sheetRight: null };
    if (sheet) out.sheetRight = round(sheet.getBoundingClientRect().right);
    if (panel) {
      const r = panel.getBoundingClientRect();
      out.panel = { left: round(r.left), top: round(r.top), w: round(r.width), h: round(r.height), bottom: round(r.bottom) };
      // Group every panel pill by its top edge: that is the row count the
      // "does it read as a wall" judgement is actually about.
      const pills = [...panel.querySelectorAll("button")];
      const byTop = new Map();
      for (const p of pills) {
        const pr = p.getBoundingClientRect();
        const key = Math.round(pr.top);
        if (!byTop.has(key)) byTop.set(key, []);
        byTop.get(key).push(p.textContent.trim());
      }
      out.rows = byTop.size;
      out.pillRows = [...byTop.entries()].sort((a, b) => a[0] - b[0]).map(([top, labels]) => `${top}: ${labels.join(" | ")}`);
    }
    const housesSection = [...document.querySelectorAll("section")].find((s) =>
      (s.textContent || "").trim().startsWith("Houses")
    );
    if (housesSection) {
      const wrap = housesSection.querySelector("div[data-lh3-ink]");
      if (wrap) {
        const visible = (el) => getComputedStyle(el).visibility !== "hidden";
        out.housePills = [...wrap.querySelectorAll(".rounded-full.border")]
          .filter(visible)
          .map((el) => el.textContent.trim());
        const sr = wrap.querySelector(".sr-only");
        out.srText = sr ? sr.textContent.trim() : null;
      }
    }
    return out;
  });
}

for (const [width, height] of [[1440, 900], [390, 844]]) {
  for (const q of ["", "&fixture=owner-9&chain=serpentine", "&fixture=mock&chain=stave", "&fixture=twelve&chain=zigzag", "&fixture=single&chain=rail", "&fixture=bogus"]) {
    await page.setViewport({ width, height });
    const url = `${BASE}${extra}${q}`;
    try {
      await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });
    } catch {
      await wait(2000);
    }
    await wait(2600); // chain entrance springs + fonts.ready re-measure
    const m = await measure();
    console.log(`\n=== ${width}x${height}  ${url}`);
    console.log(`panel: ${JSON.stringify(m.panel)}  sheetRight=${m.sheetRight}  pillRows=${m.rows}`);
    for (const row of m.pillRows) console.log("   " + row);
    console.log(`houses (${m.housePills.length}): ${m.housePills.join(" / ")}`);
    if (m.srText) console.log(`sr: ${m.srText}`);
    if (q === "" || q.includes("owner-9")) {
      const path = join(dir, `panel-${width}${q ? q.replace(/[&=]/g, "-") : "-default"}.png`);
      await page.screenshot({ path });
      console.log(`shot: ${resolve(path)}`);
    }
  }
}

console.log(errors.length ? "\nPAGE ERRORS:\n  " + [...new Set(errors)].join("\n  ") : "\nno page errors");
await browser.close();
