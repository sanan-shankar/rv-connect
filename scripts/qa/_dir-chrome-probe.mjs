/**
 * Measures the live directory chrome so the lab room's numbers are read off
 * the DOM rather than estimated. Prints the bounding box of every control in
 * the toolbar at a set of viewport widths and filter states.
 *
 * Throwaway probe for the /lab/directory room. Named with a leading underscore
 * to match the other scratch probes in this folder.
 *
 *   node scripts/qa/_dir-chrome-probe.mjs
 */
import puppeteer from "puppeteer";
import { config } from "dotenv";
import { devLogin } from "./_dev-login.mjs";

// .env, not .env: ADMIN_EMAIL lives there, and `dotenv/config` reads the
// wrong file, which is what made the first run of this probe 403.
config({ path: ".env" });

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const BASE = "http://localhost:3000";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;

const STATES = [
  { label: "no filters", qs: "" },
  { label: "1 filter", qs: "?profession=Technology" },
  { label: "2 filters", qs: "?profession=Technology&city=Bengaluru" },
  { label: "4 filters + query", qs: "?profession=Entrepreneurship&city=Thiruvananthapuram&yearFrom=2005&yearTo=2015&type=alumni&q=ananya" },
];

const WIDTHS = [1440, 1280, 1024];

const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new" });
const page = await browser.newPage();

// Shared local sign-in, same path every other QA script uses.
await page.setViewport({ width: 1440, height: 900 });
await page.goto(`${BASE}/login`, { waitUntil: "networkidle2" });
await devLogin(page, BASE, ADMIN_EMAIL);
console.log("auth: ok");

for (const w of WIDTHS) {
  await page.setViewport({ width: w, height: 900 });
  console.log(`\n================ viewport ${w} ================`);
  for (const s of STATES) {
    await page.goto(`${BASE}/directory${s.qs}`, { waitUntil: "networkidle2" });
    await new Promise((r) => setTimeout(r, 700));
    const data = await page.evaluate(() => {
      const anchor = document.querySelector('[data-tour="directory-search"]');
      if (!anchor) return null;
      const bar = anchor.getBoundingClientRect();
      // the desktop toolbar row
      const row = anchor.querySelector(".lg\\:flex");
      const rowBox = row ? row.getBoundingClientRect() : null;
      const controls = [...anchor.querySelectorAll("input, button")]
        .map((el) => {
          const b = el.getBoundingClientRect();
          if (b.width === 0) return null;
          const text = (el.getAttribute("placeholder") || el.textContent || el.getAttribute("aria-label") || "").trim().slice(0, 34);
          return { text, x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) };
        })
        .filter(Boolean);
      // distinct top edges == number of visual rows
      const rows = [...new Set(controls.map((c) => c.y))].sort((a, b) => a - b);
      // the content that follows the chrome
      const viewToggle = document.querySelector(".inline-flex.rounded-full.border.border-border.bg-card.p-1");
      return {
        chromeHeight: Math.round(bar.height),
        chromeTop: Math.round(bar.top),
        rowTops: rows,
        rowCount: rows.length,
        rowBoxWidth: rowBox ? Math.round(rowBox.width) : null,
        viewToggleTop: viewToggle ? Math.round(viewToggle.getBoundingClientRect().top) : null,
        controls,
      };
    });
    if (!data) {
      console.log(`  ${s.label}: toolbar not found`);
      continue;
    }
    console.log(`\n  --- ${s.label} ---`);
    console.log(`  chrome block height: ${data.chromeHeight}px, control rows: ${data.rowCount} (tops ${data.rowTops.join(", ")})`);
    console.log(`  toolbar row width: ${data.rowBoxWidth}px`);
    console.log(`  view toggle top: ${data.viewToggleTop}px`);
    for (const c of data.controls) {
      console.log(`    y=${String(c.y).padStart(4)} x=${String(c.x).padStart(4)} ${String(c.w).padStart(4)}x${c.h}  "${c.text}"`);
    }
  }
}

await browser.close();
