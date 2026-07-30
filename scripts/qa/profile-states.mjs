/**
 * QA harness for the shipped letterhead profile. Signs in with the admin
 * bypass, then shoots the states that differ: your own profile (Edit profile,
 * Saved segment) against someone else's (Get in touch, Photos segment), at
 * both viewports, and reports the spacing it measures off the DOM rather than
 * leaving it to be eyeballed off a PNG.
 *
 * Usage: node scripts/qa/profile-states.mjs [round-label]
 */
import puppeteer from "puppeteer";
import { existsSync, mkdirSync } from "fs";
import { dirname, join, resolve } from "path";
import { fileURLToPath } from "url";
import { config } from "dotenv";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
process.chdir(repoRoot);
config({ path: ".env.local" });

const label = process.argv[2] || "profile";
const dir = "./temporary screenshots/profile-states";
mkdirSync(dir, { recursive: true });
const BASE = "http://localhost:3000";

const adminEmail = process.env.ADMIN_EMAIL;
if (!adminEmail) {
  console.error("Error: ADMIN_EMAIL not found in .env.local");
  process.exit(1);
}

const browser = await puppeteer.launch({
  headless: true,
  executablePath:
    process.env.PUPPETEER_EXECUTABLE_PATH ||
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  args: ["--no-sandbox", "--disable-setuid-sandbox"],
});
const page = await browser.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push("pageerror: " + e.message.split("\n")[0]));
page.on("console", (m) => {
  if (m.type() === "error") errors.push("console.error: " + m.text().slice(0, 160));
});

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

await page.setViewport({ width: 1440, height: 900 });
await page.goto(BASE, { waitUntil: "domcontentloaded" });
await page.evaluate(async (email) => {
  await fetch("/api/auth/admin-login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
}, adminEmail);
console.log("authenticated");

async function go(url) {
  await page.goto(url, { waitUntil: "networkidle2", timeout: 45000 });
  await wait(1200);
}
async function shot(name, fullPage = false) {
  await page.screenshot({ path: join(dir, `${label}-${name}.png`), fullPage });
  console.log(`saved ${label}-${name}.png`);
}

/* Who am I, and who is someone else? The directory paints its cards on the
   client, so give it a beat, and fall back to the feed's author links. */
const me = await page.evaluate(async () => {
  const r = await fetch("/api/auth/session");
  const s = await r.json();
  return s?.user?.id ?? null;
});

async function profileIdsHere() {
  return page.evaluate(() =>
    [...document.querySelectorAll('a[href^="/profile/"]')]
      .map((a) => a.getAttribute("href").replace("/profile/", "").split(/[#?]/)[0])
      .filter((v, i, arr) => v && arr.indexOf(v) === i)
  );
}

let ids = [];
for (const route of ["/directory", "/feed"]) {
  await go(`${BASE}${route}`);
  await wait(1800);
  ids = [...new Set([...ids, ...(await profileIdsHere())])];
  if (ids.some((i) => i !== me)) break;
}
const other = ids.find((i) => i !== me) ?? null;
console.log({ me, other, sampled: ids.length });
if (!other) {
  console.log("NOTE: no second member in this database, skipping the other-profile shots");
}

async function measure(tag) {
  const m = await page.evaluate(() => {
    const box = (el) => (el ? el.getBoundingClientRect() : null);
    const sheet = document.querySelector("main div.rounded-\\[var\\(--radius-2xl\\)\\]");
    const h1 = document.querySelector("h1");
    const colophon = h1?.previousElementSibling;
    const dl = document.querySelector("dl");
    const tablist = document.querySelector('[role="tablist"]');
    const card = document.querySelector("article");
    const r = {};
    const s = box(sheet), n = box(h1), c = box(colophon), d = box(dl), t = box(tablist), a = box(card);
    if (c && n) r.colophonToName = +(n.top - c.bottom).toFixed(1);
    if (s && n) r.nameLeftInset = +(n.left - s.left).toFixed(1);
    if (s && c) r.colophonTopInset = +(c.top - s.top).toFixed(1);
    if (d && n) r.factsPresent = true;
    if (s && t) r.sheetToSwitcher = +(t.top - s.bottom).toFixed(1);
    if (t && a) r.switcherToFirstCard = +(a.top - t.bottom).toFixed(1);
    if (s && a) r.cardLeftVsSheetLeft = +(a.left - s.left).toFixed(1);
    if (tablist) {
      r.segments = [...tablist.querySelectorAll('[role="tab"]')].map((b) =>
        b.textContent.trim()
      );
      r.switcherOverflow = tablist.scrollWidth - tablist.clientWidth;
    }
    r.editButton = !![...document.querySelectorAll("a,button")].find((e) =>
      (e.textContent || "").trim().startsWith("Edit profile")
    );
    r.getInTouch = !![...document.querySelectorAll("button")].find((e) =>
      (e.textContent || "").includes("Get in touch")
    );
    return r;
  });
  console.log(`\n[${tag}]`, JSON.stringify(m, null, 2));
  return m;
}

/* ---- Own profile, desktop ---- */
await go(`${BASE}/profile/${me}`);
await shot("d1-own");
await shot("d2-own-full", true);
await measure("desktop own");

/* ---- Someone else, desktop ---- */
if (other) {
  await go(`${BASE}/profile/${other}`);
  await shot("d3-other");
  await measure("desktop other");

  /* Switch to the Photos segment on their profile. */
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('[role="tab"]')].find((x) =>
      (x.textContent || "").includes("Photos")
    );
    if (b) b.click();
  });
  await wait(900);
  await shot("d4-other-photos");
}

/* ---- Mobile ---- */
await page.setViewport({ width: 390, height: 844 });
await go(`${BASE}/profile/${me}`);
await shot("m1-own");
await shot("m2-own-full", true);
await measure("mobile own");
if (other) {
  await go(`${BASE}/profile/${other}`);
  await shot("m3-other");
}

if (errors.length) {
  console.log("\nPAGE ERRORS:");
  for (const e of [...new Set(errors)]) console.log("  " + e);
} else {
  console.log("\nno page errors");
}
await browser.close();
