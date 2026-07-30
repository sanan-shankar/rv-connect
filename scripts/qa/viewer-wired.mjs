/**
 * Verifies the shared ImageViewer wired into the real app: collection tiles
 * and feed post images, via the admin-login session.
 * Usage: node scripts/qa/viewer-wired.mjs [label]
 */
import puppeteer from "puppeteer";
import { existsSync, mkdirSync } from "fs";
import { dirname, join, resolve } from "path";
import { fileURLToPath } from "url";
import { config } from "dotenv";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
process.chdir(repoRoot);
config({ path: ".env.local" });
const label = process.argv[2] || "w1";
const dir = "./temporary screenshots/viewer-states";
mkdirSync(dir, { recursive: true });

const chrome = [
  process.env.PUPPETEER_EXECUTABLE_PATH,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
].filter(Boolean).find((p) => existsSync(p));

const browser = await puppeteer.launch({
  headless: true,
  executablePath: chrome,
  args: ["--no-sandbox", "--disable-setuid-sandbox"],
});
const page = await browser.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
page.on("console", (m) => m.type() === "error" && errors.push(`console: ${m.text()}`));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function shot(name) {
  await page.screenshot({ path: join(dir, `${label}-${name}.png`) });
  console.log(`saved ${label}-${name}.png`);
}

// Authenticate via the admin bypass (same pattern as screenshot-auth.mjs).
await page.setViewport({ width: 1440, height: 900 });
await page.goto("http://localhost:3000/login", { waitUntil: "networkidle2" }).catch(() => {});
const res = await page.evaluate(async (email) => {
  const r = await fetch("/api/auth/admin-login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  return r.status;
}, process.env.ADMIN_EMAIL);
console.log("admin-login status:", res);

// Collection: open the first tile.
await page.goto("http://localhost:3000/collection", { waitUntil: "networkidle2" }).catch(() => {});
await wait(1200);
await shot("collection");
const tileClicked = await page.evaluate(() => {
  const tile = document.querySelector("main .columns-2 button, .columns-2 button");
  if (!tile) return false;
  tile.click();
  return true;
});
console.log("tile clicked:", tileClicked);
await wait(900);
await shot("collection-viewer");
await page.keyboard.press("ArrowRight");
await wait(600);
await shot("collection-viewer-next");
await page.keyboard.press("Escape");
await wait(400);

// Feed: find a post image button and open it.
await page.goto("http://localhost:3000/feed", { waitUntil: "networkidle2" }).catch(() => {});
await wait(1500);
const feedImgClicked = await page.evaluate(() => {
  const btn = [...document.querySelectorAll('article button[aria-label^="View photo"]')][0];
  if (!btn) return false;
  btn.scrollIntoView({ block: "center" });
  btn.click();
  return true;
});
console.log("feed image clicked:", feedImgClicked);
await wait(900);
await shot("feed-viewer");
await page.keyboard.press("Escape");
await wait(300);

// Mobile collection.
await page.setViewport({ width: 390, height: 844 });
await page.goto("http://localhost:3000/collection", { waitUntil: "networkidle2" }).catch(() => {});
await wait(1200);
await page.evaluate(() => {
  document.querySelector(".columns-2 button")?.click();
});
await wait(900);
await shot("m-collection-viewer");

console.log(errors.length ? "PAGE ERRORS:\n  " + errors.join("\n  ") : "no page errors");
await browser.close();
