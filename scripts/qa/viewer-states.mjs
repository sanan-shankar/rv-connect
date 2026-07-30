/**
 * One-off QA harness for the shared ImageViewer: drives open, step,
 * caption fold, chrome-hide, and the single-image set in the delight room.
 * Usage: node scripts/qa/viewer-states.mjs [round-label]
 */
import puppeteer from "puppeteer";
import { existsSync, mkdirSync } from "fs";
import { dirname, join, resolve } from "path";
import { fileURLToPath } from "url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
process.chdir(repoRoot);

const label = process.argv[2] || "v1";
const dir = "./temporary screenshots/viewer-states";
mkdirSync(dir, { recursive: true });

const URL = "http://localhost:3000/preview/delight/viewer";
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

await page.setViewport({ width: 1440, height: 900 });
try {
  await page.goto(URL, { waitUntil: "networkidle2", timeout: 30000 });
} catch {
  await wait(2000);
}
await shot("room");

// Open the first photo.
await page.evaluate(() => document.querySelectorAll("main button")[0]?.click());
await wait(700);
await shot("open-1");

// Step forward (arrow key) and catch the dissolve midway, then settled.
await page.keyboard.press("ArrowRight");
await wait(120);
await shot("dissolve-mid");
await wait(500);
await shot("open-2");

// Unfold the caption.
await page.evaluate(() => {
  [...document.querySelectorAll("button")].find((b) => b.textContent?.includes("Caption"))?.click();
});
await wait(600);
await shot("caption-open");
await page.keyboard.press("ArrowRight"); // stepping closes the caption
await wait(500);
await shot("open-3-no-caption-affordance");

// Tap the photo: chrome away.
await page.evaluate(() => document.querySelector('div[role="dialog"] img')?.click());
await wait(400);
await shot("chrome-hidden");
await page.evaluate(() => document.querySelector('div[role="dialog"] img')?.click());
await wait(300);

// Esc closes.
await page.keyboard.press("Escape");
await wait(500);
await shot("closed");

// Single-image set: no counter, no arrows.
await page.evaluate(() => {
  const btns = [...document.querySelectorAll("main button")];
  btns[btns.length - 1]?.click();
});
await wait(700);
await shot("single");
await page.keyboard.press("Escape");
await wait(300);

// Mobile.
await page.setViewport({ width: 390, height: 844 });
await page.reload({ waitUntil: "networkidle2" }).catch(() => {});
await wait(800);
await page.evaluate(() => document.querySelectorAll("main button")[0]?.click());
await wait(700);
await shot("m-open");
await page.evaluate(() => {
  [...document.querySelectorAll("button")].find((b) => b.textContent?.includes("Caption"))?.click();
});
await wait(600);
await shot("m-caption");

console.log(errors.length ? "PAGE ERRORS:\n  " + errors.join("\n  ") : "no page errors");
await browser.close();
