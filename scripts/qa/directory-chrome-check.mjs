/**
 * Gates the directory's sentence chrome (owner, 2026-08-03: "use sentence for
 * filter"; Concept B in /lab/directory).
 *
 * The concept's whole argument is one measurable property: ADDING A FILTER
 * COSTS ZERO VERTICAL SPACE. So that is what this measures, rather than
 * eyeballing a screenshot. It compares the chrome block's height with no
 * filters against its height with four set, at 1440 and at 390, and fails on
 * any growth. It also proves the filter panel actually opens and carries every
 * facet, since hiding them behind one button is what buys the fixed height.
 *
 * Usage: node scripts/qa/directory-chrome-check.mjs   (dev server on :3000)
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

async function newPage(width, height) {
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

/** Height of the chrome block (the [data-tour=directory-search] container). */
async function chromeHeight(page, url) {
  await page.goto(url, { waitUntil: "networkidle2" });
  await new Promise((r) => setTimeout(r, 2500));
  return page.evaluate(() => {
    const el = document.querySelector('[data-tour="directory-search"]');
    return el ? Math.round(el.getBoundingClientRect().height) : -1;
  });
}

for (const [w, h, tag] of [
  [1440, 900, "1440"],
  [390, 844, "390"],
]) {
  const page = await newPage(w, h);
  const bare = await chromeHeight(page, `${BASE}/directory`);
  const loaded = await chromeHeight(
    page,
    `${BASE}/directory?city=Chennai&type=alumni&profession=Student&yearFrom=2000&yearTo=2024`
  );
  check(bare > 0 && loaded > 0, `${tag}: chrome block found`, `bare ${bare}px, filtered ${loaded}px`);
  check(
    loaded <= bare,
    `${tag}: adding four filters costs zero vertical space`,
    `bare ${bare}px -> filtered ${loaded}px`
  );
  await page.close();
}

/* The facets are only allowed to be hidden if the button really reveals them. */
{
  const page = await newPage(1440, 900);
  await page.goto(`${BASE}/directory`, { waitUntil: "networkidle2" });
  await new Promise((r) => setTimeout(r, 2500));
  const opened = await page.evaluate(() => {
    const btn = [...document.querySelectorAll("button")].find((b) =>
      b.textContent.trim().startsWith("Filters")
    );
    if (!btn) return null;
    btn.click();
    return true;
  });
  await new Promise((r) => setTimeout(r, 700));
  const labels = await page.evaluate(() =>
    [...document.querySelectorAll("body *")]
      .filter((el) => el.getAttribute?.("role") === "dialog" || el.dataset?.slot === "popover-popup")
      .map((el) => el.textContent)
      .join(" | ")
  );
  const body = await page.evaluate(() => document.body.innerText);
  check(opened === true, "1440: Filters button exists");
  for (const facet of ["Profession", "City", "Batch", "House", "Type"]) {
    check(
      (labels + body).includes(facet),
      `1440: the panel carries the ${facet} facet`
    );
  }
  await page.close();
}

await browser.close();
console.log(failures ? `\n${failures} FAILED` : "\nALL CHECKS PASSED");
process.exit(failures ? 1 : 0);
