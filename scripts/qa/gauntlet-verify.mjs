/* Drives the ENTIRE dark-mode gauntlet end to end: five questions, the word
 * of the day, the five-second hoopoe trial, the earned toggle, Nightfall,
 * and the dark app on the other side - then flips back to light so the
 * owner's own first run stays fresh. Screenshots every act.
 * node scripts/qa/gauntlet-verify.mjs */
import puppeteer from "puppeteer";
import { mkdirSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { config } from "dotenv";

process.chdir(resolve(dirname(fileURLToPath(import.meta.url)), "../.."));
config({ path: ".env.local" });
mkdirSync("./temporary screenshots", { recursive: true });

const shots = "./temporary screenshots";
const browser = await puppeteer.launch({
  headless: true,
  executablePath:
    process.env.PUPPETEER_EXECUTABLE_PATH ||
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  args: ["--no-sandbox"],
});
const page = await browser.newPage();
const errs = [];
page.on("pageerror", (e) => errs.push("PAGEERROR: " + e.message.slice(0, 200)));
page.on("console", (m) => {
  if (m.type() === "error") errs.push("CONSOLE: " + m.text().slice(0, 200));
});
await page.setViewport({ width: 1440, height: 900 });
await page.goto("http://localhost:3000", { waitUntil: "domcontentloaded" });
await page.evaluate(async (email) => {
  await fetch("/api/auth/admin-login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
}, process.env.ADMIN_EMAIL);

await page.goto("http://localhost:3000/settings/dark-mode", { waitUntil: "networkidle2", timeout: 60000 }).catch(() => {});
await new Promise((r) => setTimeout(r, 2500));
await page.screenshot({ path: `${shots}/g1-intro.png` });

async function clickText(re, label) {
  const ok = await page.evaluate((src) => {
    const rx = new RegExp(src, "i");
    const b = [...document.querySelectorAll("button")].find((x) => rx.test((x.textContent ?? "").trim()));
    if (b) { b.click(); return true; }
    return false;
  }, re);
  console.log(ok ? `ok: ${label}` : `MISS: ${label}`);
  await new Promise((r) => setTimeout(r, 700));
  return ok;
}

await clickText("^Begin$", "Begin");
await page.screenshot({ path: `${shots}/g2-sure.png` });
await clickText("Yes, absolutely", "Q1 yes");
await clickText("We do. Keep going", "Q2 yes");
await page.screenshot({ path: `${shots}/g3-waiver.png` });
await clickText("I agree. I blame no one", "Q3 waiver");
await clickText("^I accept$", "Q4 character");
await new Promise((r) => setTimeout(r, 400));
await page.screenshot({ path: `${shots}/g4-word.png` });

// the word of the day, typed exactly
const word = await page.evaluate(() => {
  // read the faint rotated answer off the page itself, like a sneaky human
  const spans = [...document.querySelectorAll("span")];
  const hidden = spans.find((s) => s.className.includes("rotate-90"));
  return hidden?.textContent?.trim() ?? null;
});
console.log("word read off the page:", word);
await page.type('input[aria-label="Today\'s word"]', word ?? "Parakeet");
await clickText("^Answer$", "word submit");
await new Promise((r) => setTimeout(r, 600));
await page.screenshot({ path: `${shots}/g5-trial.png` });

// the five second hold, with the hoopoe watching (or refusing to)
const btn = await page.evaluateHandle(() => {
  return [...document.querySelectorAll("button")].find((x) => /^Hold$/.test((x.textContent ?? "").trim()));
});
const box = await btn.asElement().boundingBox();
await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
await page.mouse.down();
await new Promise((r) => setTimeout(r, 2500));
await page.screenshot({ path: `${shots}/g6-holding.png` }); // mid-hold: eyes covered, disc filling
await new Promise((r) => setTimeout(r, 3200));
await page.mouse.up();
await new Promise((r) => setTimeout(r, 2500)); // celebrate + advance
await page.screenshot({ path: `${shots}/g7-toggle.png` });

// the earned toggle -> Nightfall
await page.evaluate(() => {
  const b = document.querySelector('button[aria-label="Turn on dark mode"]');
  b?.click();
});
await new Promise((r) => setTimeout(r, 1600));
await page.screenshot({ path: `${shots}/g8-nightfall-mid.png` }); // sun sinking
await new Promise((r) => setTimeout(r, 2000));
await page.screenshot({ path: `${shots}/g9-nightfall-late.png` }); // stars + the line
await new Promise((r) => setTimeout(r, 1600));
const darkState = await page.evaluate(() => ({
  htmlDark: document.documentElement.classList.contains("dark"),
  bg: getComputedStyle(document.body).backgroundColor,
}));
console.log("after nightfall:", JSON.stringify(darkState));
await page.screenshot({ path: `${shots}/g10-regrets.png` }); // the dark app + regrets step

// wander the dark valley
await clickText("No regrets", "no regrets");
await page.goto("http://localhost:3000/feed", { waitUntil: "networkidle2", timeout: 60000 }).catch(() => {});
await new Promise((r) => setTimeout(r, 3000));
await page.screenshot({ path: `${shots}/g11-dark-feed.png` });
const sidebarDark = await page.evaluate(() => {
  const aside = document.querySelector("aside");
  return aside ? getComputedStyle(aside).backgroundColor : null;
});
console.log("sidebar in dark:", sidebarDark, "(must stay rgb(35, 92, 73))");

// mobile dark spot-check
await page.setViewport({ width: 390, height: 844 });
await new Promise((r) => setTimeout(r, 800));
await page.screenshot({ path: `${shots}/g12-dark-feed-mobile.png` });
await page.setViewport({ width: 1440, height: 900 });

// and back to the light, one press, so the owner's first run is fresh
await page.goto("http://localhost:3000/settings/dark-mode", { waitUntil: "networkidle2", timeout: 60000 }).catch(() => {});
await new Promise((r) => setTimeout(r, 2000));
await page.screenshot({ path: `${shots}/g13-lights-on.png` });
await clickText("Turn off dark mode", "one-press exit");
await new Promise((r) => setTimeout(r, 2000));
const backLight = await page.evaluate(() => !document.documentElement.classList.contains("dark"));
console.log("back to light:", backLight);

console.log(errs.length ? "ERRORS:\n" + errs.join("\n") : "zero client errors");
await browser.close();
console.log("done");
