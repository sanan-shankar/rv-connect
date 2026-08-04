/**
 * Ad-hoc probe: open the mobile nav drawer and shoot it, plus the state after tapping the
 * account row. Used while porting the desktop profile menu onto mobile (2026-08-04).
 *
 * Usage: node scripts/qa/_drawer-probe.mjs [label]
 */
import puppeteer from "puppeteer";
import { mkdirSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { config } from "dotenv";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
process.chdir(repoRoot);
config({ path: ".env.local" });

const label = process.argv[2] || "drawer";
const dir = "./temporary screenshots";
mkdirSync(dir, { recursive: true });

const browser = await puppeteer.launch({
  headless: true,
  executablePath:
    process.env.PUPPETEER_EXECUTABLE_PATH ||
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  args: ["--no-sandbox", "--disable-setuid-sandbox"],
});
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844 });
await page.goto("http://localhost:3000", { waitUntil: "domcontentloaded" });
await page.evaluate(
  async (email) => {
    await fetch("/api/auth/admin-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
  },
  process.env.ADMIN_EMAIL
);
await page.goto("http://localhost:3000/feed", { waitUntil: "networkidle0" });

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// 1. closed
await page.screenshot({ path: `${dir}/probe-${label}-1-closed.png` });

// 2. drawer open
await page.click('[aria-label="Open menu"]');
await wait(700);
await page.screenshot({ path: `${dir}/probe-${label}-2-open.png` });

// 3. account pill tapped -> rows unfurl. Settled frames only; a mid-animation
// frame is not comparable between runs.
const pill = await page.$('[role=dialog] button[aria-expanded]');
if (!pill) {
  console.log("FAIL: no account pill found in the drawer");
} else {
  await pill.click();
  await wait(1200);
  await page.screenshot({ path: `${dir}/probe-${label}-3-account-open.png` });

  // 4. tapped again -> folds back down into the pill
  await pill.click();
  await wait(1200);
  await page.screenshot({ path: `${dir}/probe-${label}-4-account-closed.png` });

  // where the marker ended up, and whether the pill reports its state
  const state = await page.evaluate(() => {
    const p = document.querySelector("[role=dialog] button[aria-expanded]");
    const rows = [...document.querySelectorAll("[role=dialog] a")].map((a) => a.textContent.trim());
    return { expanded: p?.getAttribute("aria-expanded"), rows };
  });
  console.log("pill aria-expanded after re-tap:", state.expanded);
  console.log("drawer rows:", JSON.stringify(state.rows));
}

// 5. On an account route the section should already be open with the marker on
// it, without anyone tapping the pill. Same rule as the desktop rail.
await page.goto("http://localhost:3000/settings", { waitUntil: "networkidle0" });
await page.click('[aria-label="Open menu"]');
await wait(1200);
await page.screenshot({ path: `${dir}/probe-${label}-5-on-settings.png` });
const onRoute = await page.evaluate(() => {
  const pill = document.querySelector("[role=dialog] button[aria-expanded]");
  const marked = [...document.querySelectorAll("[role=dialog] a")].find(
    (a) => a.getAttribute("aria-current") === "page"
  );
  return { expanded: pill?.getAttribute("aria-expanded"), markerOn: marked?.textContent.trim() ?? "(none)" };
});
console.log(`on /settings: section open=${onRoute.expanded}, marker on "${onRoute.markerOn}"`);

console.log("shot frames:", label);
await browser.close();
