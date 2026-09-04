// Shared verifier helper: authed screenshot + console/pageerror + doc status.
// Usage: PUPPETEER_EXECUTABLE_PATH=".../Google Chrome" node scripts/qa/verify-shot.mjs <route> <outName.png> [mobile]
// Prints one JSON line: {route, status, errors[], out}
import puppeteer from "puppeteer";
import { config } from "dotenv";
import { mkdirSync } from "fs";
import { dirname, join, resolve } from "path";
import { fileURLToPath } from "url";
import { devLogin } from "./_dev-login.mjs";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
process.chdir(repoRoot);

config({ path: ".env" });

const [route, out = "shot.png", mobile] = process.argv.slice(2);
/* A phone is not a narrow desktop. Without deviceScaleFactor/isMobile/hasTouch
   Chrome keeps desktop pointer semantics at 390px, so `(hover: hover)` matches
   when it should not and `(pointer: coarse)` does not match when it should, and
   the shot shows affordances a phone never draws. screenshot.mjs and
   map-cluster-verify.mjs have had these three since they were written. */
const vp = mobile === "mobile"
  ? { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true }
  : { width: 1440, height: 900 };
const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox"] });
const page = await browser.newPage();
await page.setViewport(vp);
const errs = [];
page.on("console", (m) => { if (m.type() === "error") errs.push("console: " + m.text().slice(0, 160)); });
page.on("pageerror", (e) => errs.push("pageerror: " + String(e.message).slice(0, 180)));
await page.goto("http://localhost:3000", { waitUntil: "domcontentloaded" });
await devLogin(page, "http://localhost:3000");
let status = "?";
try {
  const resp = await page.goto("http://localhost:3000" + route, { waitUntil: "networkidle2", timeout: 30000 });
  status = resp ? resp.status() : "no-resp";
  await new Promise((s) => setTimeout(s, 500));
} catch (e) {
  status = "NAV-ERR";
  errs.push("nav: " + String(e.message).slice(0, 140));
}
const overlay = await page.evaluate(() => /Application error|Unhandled Runtime Error|could not be found/i.test(document.body?.innerText || ""));
if (overlay) errs.push("overlay: error text visible");
mkdirSync("e2e/.shots", { recursive: true });
const outPath = join("e2e/.shots", out);
try { await page.screenshot({ path: outPath }); } catch {}
console.log(JSON.stringify({ route, status, errors: errs, out: outPath }));
await browser.close();
