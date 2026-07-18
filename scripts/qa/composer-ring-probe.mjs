// One-off probe: click the feed composer and capture the focus ring at
// 60ms / 250ms / 1200ms after the click, cropped to the field's top-left
// corner region, to verify the ring is even on every frame (the old bug:
// outward ring clipped by the expand wrapper read thicker at corners for
// ~1s). Reuses the admin-login auth flow from screenshot-auth.mjs.
import puppeteer from "puppeteer";
import { mkdirSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { config } from "dotenv";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
process.chdir(repoRoot);
config({ path: ".env.local" });

const adminEmail = process.env.ADMIN_EMAIL;
if (!adminEmail) throw new Error("ADMIN_EMAIL missing");

mkdirSync("./temporary screenshots", { recursive: true });

const browser = await puppeteer.launch({
  headless: true,
  executablePath:
    process.env.PUPPETEER_EXECUTABLE_PATH ||
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  args: ["--no-sandbox", "--disable-setuid-sandbox"],
});
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });

await page.goto("http://localhost:3000", { waitUntil: "domcontentloaded", timeout: 15000 });
const auth = await page.evaluate(async (email) => {
  const res = await fetch("/api/auth/admin-login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  return res.ok;
}, adminEmail);
if (!auth) throw new Error("auth failed");

await page.goto("http://localhost:3000/feed", { waitUntil: "networkidle2", timeout: 30000 });

// The collapsed composer is a pill with the placeholder text; the editable
// only mounts after clicking it. The bug window is the ~1s expand right
// after that first click, so capture frames from the click itself.
const trigger = await page.waitForSelector(
  'xpath/(//*[contains(text(), "Share a memory")])[1]',
  { timeout: 15000 }
);
const tbox = await trigger.boundingBox();

async function shoot(name) {
  await page.screenshot({
    path: `./temporary screenshots/ring-${name}.png`,
    clip: {
      x: Math.max(0, tbox.x - 30),
      y: Math.max(0, tbox.y - 30),
      width: 780,
      height: 260,
    },
  });
}

await trigger.click();
await new Promise((r) => setTimeout(r, 60));
await shoot("60ms");
await new Promise((r) => setTimeout(r, 190));
await shoot("250ms");
await new Promise((r) => setTimeout(r, 950));
await shoot("1200ms");

console.log("captured ring-60ms / ring-250ms / ring-1200ms");
await browser.close();
