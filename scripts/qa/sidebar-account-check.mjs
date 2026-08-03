/**
 * Gates the sidebar's account section (owner, 2026-08-03: the white pop-up
 * becomes an in-rail menu anchored to the bottom, and the active marker
 * travels down to whatever you picked).
 *
 * Asserts, rather than eyeballs:
 *   1. On a main surface (/feed) the account rows are COLLAPSED and the
 *      marker sits on the Feed row, up in the nav.
 *   2. On an account route (/settings) the rows are EXPANDED, they sit at the
 *      BOTTOM of the rail (below every nav row), and the marker has moved
 *      onto the Settings row down there. This is the single fact the whole
 *      change rests on: one marker for one sidebar.
 *   3. No floating menu surface is used for it, i.e. the rows are inside the
 *      <aside>, not portalled into a popup.
 *   4. Mobile: the drawer's account block is anchored to the bottom of the
 *      drawer rather than floating under the nav.
 *
 * Usage: node scripts/qa/sidebar-account-check.mjs   (dev server on :3000)
 */
import puppeteer from "puppeteer";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { config } from "dotenv";

process.chdir(resolve(dirname(fileURLToPath(import.meta.url)), "../.."));
config({ path: ".env.local" });

const BASE = "http://localhost:3000";
const adminEmail = process.env.ADMIN_EMAIL;
if (!adminEmail) {
  console.error("ADMIN_EMAIL not found in .env.local");
  process.exit(1);
}

let failures = 0;
const check = (ok, label, detail) => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? `  (${detail})` : ""}`);
  if (!ok) failures++;
};

const browser = await puppeteer.launch({
  headless: true,
  executablePath:
    process.env.PUPPETEER_EXECUTABLE_PATH ||
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  args: ["--no-sandbox", "--disable-setuid-sandbox"],
});

async function authed(width, height) {
  const page = await browser.newPage();
  await page.setViewport({ width, height });
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page.evaluate(async (email) => {
    await fetch("/api/auth/admin-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
  }, adminEmail);
  return page;
}

/** Read the rail: which rows exist, where the cinnamon marker is. */
const readRail = (page) =>
  page.evaluate(() => {
    const aside = document.querySelector("aside");
    if (!aside) return null;
    const rows = [...aside.querySelectorAll("a, button")]
      .map((el) => ({
        text: el.textContent.trim(),
        top: Math.round(el.getBoundingClientRect().top),
        current: el.getAttribute("aria-current") === "page",
      }))
      .filter((r) => r.text);
    // The marker's cinnamon bar is the only bg-cinnamon element in the rail.
    const bar = aside.querySelector(".bg-cinnamon");
    return {
      rows,
      markerTop: bar ? Math.round(bar.getBoundingClientRect().top) : null,
      asideBottom: Math.round(aside.getBoundingClientRect().bottom),
    };
  });

/* ---- 1 + 3: a main surface ---- */
{
  const page = await authed(1440, 900);
  await page.goto(`${BASE}/feed`, { waitUntil: "networkidle2" });
  await new Promise((r) => setTimeout(r, 2500));
  const rail = await readRail(page);
  const hasSettingsRow = rail.rows.some((r) => r.text === "Settings");
  const feedRow = rail.rows.find((r) => r.text === "Feed");
  check(!hasSettingsRow, "1440 /feed: account rows are collapsed", `${rail.rows.length} rail rows`);
  check(
    rail.markerTop !== null && feedRow && Math.abs(rail.markerTop - feedRow.top) < 14,
    "1440 /feed: the marker is on the Feed row",
    `marker ${rail.markerTop}, Feed row ${feedRow?.top}`
  );
  await page.close();
}

/* ---- 2: an account route ---- */
{
  const page = await authed(1440, 900);
  await page.goto(`${BASE}/settings`, { waitUntil: "networkidle2" });
  await new Promise((r) => setTimeout(r, 2500));
  const rail = await readRail(page);
  const settingsRow = rail.rows.find((r) => r.text === "Settings");
  const aboutRow = rail.rows.find((r) => r.text === "About");
  check(!!settingsRow, "1440 /settings: the account rows are expanded");
  check(
    !!settingsRow && !!aboutRow && settingsRow.top > aboutRow.top,
    "1440 /settings: they sit BELOW the whole nav (anchored to the bottom)",
    `Settings ${settingsRow?.top} vs last nav row ${aboutRow?.top}`
  );
  check(
    rail.markerTop !== null && settingsRow && Math.abs(rail.markerTop - settingsRow.top) < 14,
    "1440 /settings: the marker travelled down onto the Settings row",
    `marker ${rail.markerTop}, Settings row ${settingsRow?.top}`
  );
  check(
    !!settingsRow && rail.asideBottom - settingsRow.top < 300,
    "1440 /settings: the rows are near the foot of the rail",
    `${settingsRow ? rail.asideBottom - settingsRow.top : "?"}px up from the bottom`
  );
  await page.close();
}

/* ---- 4: mobile drawer ---- */
{
  const page = await authed(390, 844);
  await page.goto(`${BASE}/feed`, { waitUntil: "networkidle2" });
  await new Promise((r) => setTimeout(r, 2500));
  await page.click('[aria-label="Open menu"]');
  await new Promise((r) => setTimeout(r, 900));
  const geo = await page.evaluate(() => {
    const panel = document.querySelector('[data-slot="sheet-content"]') ||
      [...document.querySelectorAll("div")].find((d) => d.textContent.includes("Sign out") && d.className.includes("bg-sidebar"));
    if (!panel) return null;
    const signOut = [...panel.querySelectorAll("button, a")].find(
      (el) => el.textContent.trim() === "Sign out"
    );
    if (!signOut) return null;
    return {
      panelBottom: Math.round(panel.getBoundingClientRect().bottom),
      signOutBottom: Math.round(signOut.getBoundingClientRect().bottom),
    };
  });
  check(!!geo, "390: drawer opened and its account block was found");
  if (geo) {
    const gap = geo.panelBottom - geo.signOutBottom;
    check(gap < 80, "390: the account block is anchored to the drawer's bottom", `${gap}px of slack below Sign out`);
  }
  await page.close();
}

await browser.close();
console.log(failures ? `\n${failures} FAILED` : "\nALL CHECKS PASSED");
process.exit(failures ? 1 : 0);
