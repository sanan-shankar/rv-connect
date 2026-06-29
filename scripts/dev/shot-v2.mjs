import puppeteer from "puppeteer";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
process.chdir(repoRoot);

const url = process.argv[2] || "http://localhost:3000/preview/birds-v2";
const out = process.argv[3] || "/private/tmp/claude-501/-Users-sanan-Documents-rv-alumni/248bc6eb-6deb-4fca-bd30-ac2dab2686c4/scratchpad/v2.png";
const browser = await puppeteer.launch({
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: "new",
  args: ["--no-sandbox"],
});
const page = await browser.newPage();
await page.setViewport({ width: 1100, height: 1400, deviceScaleFactor: 2 });
await page.goto(url, { waitUntil: "load", timeout: 30000 });
await new Promise((r) => setTimeout(r, 1800));
await page.screenshot({ path: out, fullPage: true });
await browser.close();
console.log("saved", out);
