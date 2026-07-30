/**
 * One-off QA harness for the Letterhead II profile concept: drives the states
 * a plain screenshot cannot reach (the four data x masthead combinations, the
 * stamp press, the bird chirp, the Get in touch dialog, a tab switch, both
 * viewports) and saves a numbered series into ./temporary screenshots.
 *
 * Usage: node scripts/qa/lh2-states.mjs [round-label]
 */
import puppeteer from "puppeteer";
import { existsSync, mkdirSync } from "fs";
import { dirname, join, resolve } from "path";
import { fileURLToPath } from "url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
process.chdir(repoRoot);

const label = process.argv[2] || "lh2";
const dir = "./temporary screenshots/lh2-states";
mkdirSync(dir, { recursive: true });

const BASE = "http://localhost:3000/preview/delight/profiles?v=letterhead-2";

const chromeCandidates = [
  process.env.PUPPETEER_EXECUTABLE_PATH,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
].filter(Boolean);
const executablePath = chromeCandidates.find((p) => existsSync(p));

const browser = await puppeteer.launch({
  headless: true,
  executablePath,
  args: ["--no-sandbox", "--disable-setuid-sandbox"],
});
const page = await browser.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(`console.error: ${m.text()}`);
});

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function shot(name, fullPage = false) {
  await page.screenshot({ path: join(dir, `${label}-${name}.png`), fullPage });
  console.log(`saved ${label}-${name}.png`);
}

async function go(url) {
  try {
    await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });
  } catch {
    await wait(2000);
  }
  await wait(700);
}

/* Click the element whose visible text matches. */
async function clickText(selector, text) {
  const ok = await page.evaluate(
    (sel, t) => {
      const nodes = [...document.querySelectorAll(sel)];
      const el = nodes.find((n) => (n.textContent || "").trim().includes(t));
      if (!el) return false;
      el.click();
      return true;
    },
    selector,
    text
  );
  if (!ok) console.log(`MISS: could not click "${text}"`);
  return ok;
}

/* Report the measurements the review is actually about, so the numbers are
   read off the DOM instead of guessed off a PNG. */
async function measure(tag) {
  const m = await page.evaluate(() => {
    const box = (el) => (el ? el.getBoundingClientRect() : null);
    const sheet = document.querySelector('[data-lh2="sheet"]');
    const colophon = document.querySelector('[data-lh2="colophon"]');
    const h1 = document.querySelector("h1");
    const leaf = h1 ? h1.querySelector('[role="img"]') : null;
    const cta = [...document.querySelectorAll("button")].find((b) =>
      (b.textContent || "").includes("Get in touch")
    );
    const dl = document.querySelector("dl");
    const rule = document.querySelector('[aria-hidden][class*="h-[3px]"]');
    const about = [...document.querySelectorAll("section")].find((s) =>
      (s.textContent || "").startsWith("About")
    );
    const tablist = document.querySelector('[role="tablist"]');
    const firstCard = document.querySelector("article");
    const r = {};
    const c = box(colophon), n = box(h1), l = box(leaf), b = box(cta);
    const d = box(dl), ru = box(rule), a = box(about), t = box(tablist);
    const s = box(sheet), fc = box(firstCard);
    if (c && n) r.colophonToName = +(n.top - c.bottom).toFixed(1);
    if (n && l) r.leafBottomVsNameBaselineBox = +(l.bottom - n.bottom).toFixed(1);
    if (n && b) r.ctaCentreVsNameCentre = +((b.top + b.height / 2) - (n.top + n.height / 2)).toFixed(1);
    if (n && d) r.nameBlockToFacts = +(d.top - n.bottom).toFixed(1);
    if (d && ru) r.factsToRule = +(ru.top - d.bottom).toFixed(1);
    if (ru && a) r.ruleToAbout = +(a.top - ru.bottom).toFixed(1);
    if (s && t) r.sheetToTabs = +(t.top - s.bottom).toFixed(1);
    if (t && fc) r.tabsToFirstCard = +(fc.top - t.bottom).toFixed(1);
    if (s && n) r.nameLeftInsetFromSheet = +(n.left - s.left).toFixed(1);
    if (s && c) r.colophonTopInsetFromSheet = +(c.top - s.top).toFixed(1);
    if (s && fc) r.cardLeftVsSheetLeft = +(fc.left - s.left).toFixed(1);
    if (n) r.nameFontSize = getComputedStyle(h1).fontSize;
    if (h1) r.nameLines = Math.round(n.height / (parseFloat(getComputedStyle(h1).fontSize) * 1.05));
    const photo = box(document.querySelector('[data-lh2="photo"]'));
    const lockup = box(document.querySelector('[data-lh2="lockup"]'));
    if (photo) {
      r.photoDiameter = +photo.width.toFixed(1);
      if (lockup) r.photoMinusLockupHeight = +(photo.height - lockup.height).toFixed(1);
      if (s) r.photoLeftInsetFromSheet = +(photo.left - s.left).toFixed(1);
    }
    return r;
  });
  console.log(`\n[${tag}]`, JSON.stringify(m, null, 2));
}

/**
 * The tab strip must never eat the wheel. Park the pointer on it, scroll, and
 * assert the PAGE moved and the strip did not slide sideways (owner: "if the
 * mouse was in that vertical line it was scrolling the dossier headings").
 */
async function wheelOverTabs() {
  await page.evaluate(() => window.scrollTo(0, 0));
  await wait(200);
  const rect = await page.evaluate(() => {
    const el = document.querySelector('[role="tablist"]');
    el.scrollIntoView({ block: "center" });
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  });
  await wait(300);
  const before = await page.evaluate(() => ({
    y: window.scrollY,
    left: document.querySelector('[role="tablist"]').scrollLeft,
    over: document.querySelector('[role="tablist"]').scrollWidth
      - document.querySelector('[role="tablist"]').clientWidth,
  }));
  await page.mouse.move(rect.x, rect.y);
  await page.mouse.wheel({ deltaY: 300 });
  await wait(500);
  const after = await page.evaluate(() => ({
    y: window.scrollY,
    left: document.querySelector('[role="tablist"]').scrollLeft,
  }));
  const pageMoved = after.y - before.y;
  console.log(
    `\n[wheel over tabs] page moved ${pageMoved}px, strip scrollLeft ${before.left} -> ${after.left}, strip horizontal overflow ${before.over}px  ${
      pageMoved > 100 && after.left === 0 && before.over === 0 ? "PASS" : "FAIL"
    }`
  );
}

/* ---- Desktop, full data, bird masthead ---- */
await page.setViewport({ width: 1440, height: 900 });
await go(BASE);
await shot("d1-top");
await shot("d2-full", true);
await measure("desktop full/bird");

// The stamp: press the admission number, catch it mid-hold.
await clickText('button[aria-label^="Admission number"]', "1385");
await wait(700);
await shot("d3-stamp-held");
await wait(2200);

// The chirp: press the bird, catch the arcs.
await page.evaluate(() => {
  const el = document.querySelector('button[aria-label*="bird"]');
  if (el) el.click();
});
await wait(180);
await shot("d4-chirp");
await wait(900);

// Get in touch dialog.
await clickText("button", "Get in touch");
await wait(600);
await shot("d5-dialog");
await page.keyboard.press("Escape");
await wait(400);

await wheelOverTabs();

// Tab switch: Letters.
await clickText('button[role="tab"]', "Letters");
await wait(600);
await page.evaluate(() => {
  const el = document.querySelector('[role="tablist"]');
  if (el) el.scrollIntoView({ block: "start" });
});
await wait(400);
await shot("d6-letters-tab");

/* ---- Desktop, full data, photo masthead ---- */
await go(BASE + "&avatar=photo");
await shot("d7-photo");
await shot("d8-photo-full", true);
await measure("desktop full/photo");

/* ---- Desktop, sparse ---- */
await go(BASE + "&sample=sparse");
await shot("d9-sparse", true);
await measure("desktop sparse/bird");

await go(BASE + "&sample=sparse&avatar=photo");
await shot("d10-sparse-photo", true);

/* ---- Mobile ---- */
await page.setViewport({ width: 390, height: 844 });
await go(BASE);
await shot("m1-top");
await shot("m2-full", true);
await measure("mobile full/bird");

await go(BASE + "&avatar=photo");
await shot("m3-photo");
await measure("mobile full/photo");

await go(BASE + "&sample=sparse");
await shot("m4-sparse", true);

if (errors.length) {
  console.log("\nPAGE ERRORS:");
  for (const e of errors) console.log("  " + e);
} else {
  console.log("\nno page errors");
}
await browser.close();
