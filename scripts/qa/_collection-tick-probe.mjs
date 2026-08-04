/**
 * End-to-end check of the composer's "Also add to the Collection" tick
 * (2026-08-04): the tick must be absent with no photo, appear once one is
 * attached, and on posting must leave BOTH a Post row and a pending Photo row.
 *
 * It posts real content as the admin and deletes both rows again, verifying the
 * table counts return to their starting values.
 *
 * Usage: node scripts/qa/_collection-tick-probe.mjs
 */
import puppeteer from "puppeteer";
import { mkdirSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { config } from "dotenv";
import pg from "pg";
import { readFileSync, existsSync } from "fs";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
process.chdir(repoRoot);
config({ path: ".env.local" });

const dir = "./temporary screenshots";
mkdirSync(dir, { recursive: true });

function dbUrl() {
  for (const f of [".env.local", ".env"]) {
    if (!existsSync(f)) continue;
    for (const line of readFileSync(f, "utf8").split("\n")) {
      const m = line.match(/^\s*(DIRECT_URL|DATABASE_URL)\s*=\s*"?([^"\n]+)"?\s*$/);
      if (m) return m[2];
    }
  }
  throw new Error("no database url");
}
const client = new pg.Client({ connectionString: dbUrl() });
await client.connect();
const count = async (t) => Number((await client.query(`SELECT count(*) FROM "${t}"`)).rows[0].count);

const before = { post: await count("Post"), photo: await count("Photo") };
console.log("before:", before);

const MARKER = "collection tick probe " + Date.now();
const browser = await puppeteer.launch({
  headless: true,
  executablePath:
    process.env.PUPPETEER_EXECUTABLE_PATH ||
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  args: ["--no-sandbox"],
});
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
await page.goto("http://localhost:3000", { waitUntil: "domcontentloaded" });
await page.evaluate(
  async (e) => {
    await fetch("/api/auth/admin-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: e }),
    });
  },
  process.env.ADMIN_EMAIL
);
await page.goto("http://localhost:3000/feed", { waitUntil: "networkidle0" });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const tickText = () =>
  page.evaluate(() => {
    const b = [...document.querySelectorAll('[role="checkbox"]')].find((e) =>
      /Collection/.test(e.textContent)
    );
    return b ? { text: b.textContent.trim(), checked: b.getAttribute("aria-checked") } : null;
  });

// Open the composer: the feed shows a collapsed pill carrying the scope
// placeholder until it is clicked.
const opened = await page.evaluate(() => {
  const root = document.querySelector("[data-composer]");
  if (!root) return "no [data-composer] on the page";
  const btn = root.querySelector("button");
  if (!btn) return "no button inside the composer";
  btn.click();
  return `clicked: ${JSON.stringify(btn.textContent?.trim().slice(0, 40))}`;
});
console.log("open composer ->", opened);
await wait(900);
const editor = await page.$('[contenteditable="true"]');
if (!editor) {
  console.log("FAIL: composer did not open");
  await browser.close();
  await client.end();
  process.exit(1);
}
await editor.type(MARKER);
await wait(200);
console.log("tick before a photo is attached:", await tickText(), "(want null)");

// attach a photo
const input = await page.$('input[type="file"]');
await input.uploadFile("public/images/collection/c1.webp");
await wait(6000);
console.log("tick after a photo is attached:", await tickText(), "(want unchecked)");
await page.screenshot({ path: `${dir}/probe-tick-unchecked.png` });

await page.evaluate(() => {
  [...document.querySelectorAll('[role="checkbox"]')]
    .find((e) => /Collection/.test(e.textContent))
    .click();
});
await wait(300);
console.log("after clicking it:", await tickText(), "(want checked)");
await page.screenshot({ path: `${dir}/probe-tick-checked.png` });

// The control row now carries icons + tick + Post. Check it does not spill at
// 390, and report whether it wrapped (which is allowed) or overflowed (not).
await page.setViewport({ width: 390, height: 844 });
await wait(600);
const row = await page.evaluate(() => {
  const box = document.querySelector('[role="checkbox"]')?.parentElement;
  if (!box) return null;
  const kids = [...box.children].map((c) => c.getBoundingClientRect());
  const tops = new Set(kids.map((r) => Math.round(r.top)));
  return {
    rowWidth: Math.round(box.getBoundingClientRect().width),
    scrollWidth: box.scrollWidth,
    lines: tops.size,
    pageOverflowsX: document.documentElement.scrollWidth > window.innerWidth,
  };
});
console.log("at 390:", JSON.stringify(row), "(want scrollWidth <= rowWidth, no page overflow)");
await page.screenshot({ path: `${dir}/probe-tick-mobile.png` });
await page.setViewport({ width: 1440, height: 900 });
await wait(600);

// post
await page.evaluate(() => {
  const b = [...document.querySelectorAll("button")].find((e) => e.textContent.trim() === "Post");
  if (b) b.click();
});
await wait(9000);

const after = { post: await count("Post"), photo: await count("Photo") };
console.log("after:", after, `(want post +1, photo +1)`);

const photo = (
  await client.query(
    `SELECT id, url, "thumbUrl", width, height, caption, approved FROM "Photo" ORDER BY "createdAt" DESC LIMIT 1`
  )
).rows[0];
console.log("newest photo:", JSON.stringify(photo));

// clean up both rows and confirm the counts come back
await client.query(`DELETE FROM "Photo" WHERE caption LIKE $1`, [`%${MARKER}%`]);
await client.query(`DELETE FROM "Post" WHERE content LIKE $1`, [`%${MARKER}%`]);
const restored = { post: await count("Post"), photo: await count("Photo") };
console.log("after cleanup:", restored, JSON.stringify(restored) === JSON.stringify(before) ? "MATCHES baseline" : "!! DOES NOT MATCH baseline");

await browser.close();
await client.end();
