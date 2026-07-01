// Full-page screenshot of a dev-server URL (system Chrome). Optionally trigger a
// click selector + settle before capturing, and clip to a selector.
// Usage: node scripts/dev/shot-url.mjs <url> <out.png> [width] [height] [--full] [--click=sel] [--wait=ms] [--clip=sel]
import puppeteer from "puppeteer";
import { existsSync } from "fs";
import { resolve } from "path";

const args = process.argv.slice(2);
const url = args[0];
const out = resolve(args[1] || "./out.png");
const width = parseInt(args.find((a) => /^\d+$/.test(a)) || "1440", 10);
const height = parseInt(args.filter((a) => /^\d+$/.test(a))[1] || "900", 10);
const full = args.includes("--full");
const click = (args.find((a) => a.startsWith("--click=")) || "").split("=")[1];
const waitMs = parseInt((args.find((a) => a.startsWith("--wait=")) || "=600").split("=")[1], 10);
const clip = (args.find((a) => a.startsWith("--clip=")) || "").split("=")[1];

const SYSTEM_CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || (existsSync(SYSTEM_CHROME) ? SYSTEM_CHROME : undefined);

const browser = await puppeteer.launch({ headless: true, executablePath, args: ["--no-sandbox", "--disable-setuid-sandbox"] });
const page = await browser.newPage();
await page.setViewport({ width, height, deviceScaleFactor: 2 });
await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 }).catch(async () => {
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
});
await new Promise((r) => setTimeout(r, 500));
if (click) {
  await page.click(click).catch(() => {});
}
const clickXY = (args.find((a) => a.startsWith("--clickxy=")) || "").split("=")[1];
if (clickXY) {
  const [cx, cy] = clickXY.split(",").map(Number);
  await page.mouse.click(cx, cy);
}
const clickText = (args.find((a) => a.startsWith("--clicktext=")) || "").split("=")[1];
if (clickText) {
  await page.evaluate((t) => {
    const btn = Array.from(document.querySelectorAll("button")).find(
      (b) => (b.textContent || "").trim().toLowerCase() === t.toLowerCase()
    );
    if (btn) btn.click();
  }, clickText);
}
await new Promise((r) => setTimeout(r, waitMs));
if (clip) {
  const el = await page.$(clip);
  if (el) {
    await el.screenshot({ path: out });
    await browser.close();
    console.log("saved (clip)", out);
    process.exit(0);
  }
}
await page.screenshot({ path: out, fullPage: full });
await browser.close();
console.log("saved", out);
