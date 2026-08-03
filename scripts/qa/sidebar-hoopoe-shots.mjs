/**
 * Visual states for the sidebar's idle-rest hoopoe, after the 2026-08-03 fix
 * to the stuck exit and the account-menu overlap.
 *
 * Shots (full frames at 1440, plus a full mobile frame):
 *   1. perched      - the delight itself, account rows closed. Proves the
 *                     entrance still works and the perch is where it was.
 *   2. exit-200ms   - 200ms after pressing the account pill: the rows are
 *                     expanding and the bird is leaving. This is the frame the
 *                     owner was complaining about ("goes on top of that").
 *   3. exit-700ms   - 700ms in, most of the way out.
 *   4. exit-done    - 3s in: rows open, no bird.
 *   5. mobile       - 390px, where the rig is gated off entirely by matchMedia.
 *
 * Also prints the measured overlap between the bird's painted ink and the top
 * account row at each step, so this is an assertion and not just a picture.
 *
 * Usage: node scripts/qa/sidebar-hoopoe-shots.mjs      (dev server on :3000)
 */
import puppeteer from "puppeteer";
import { resolve, dirname, join } from "path";
import { fileURLToPath } from "url";
import { mkdirSync } from "fs";
import { config } from "dotenv";

process.chdir(resolve(dirname(fileURLToPath(import.meta.url)), "../.."));
config({ path: ".env.local" });

const BASE = "http://localhost:3000";
const OUT = "./temporary screenshots";
mkdirSync(OUT, { recursive: true });

const adminEmail = process.env.ADMIN_EMAIL;
if (!adminEmail) {
  console.error("ADMIN_EMAIL not found in .env.local");
  process.exit(1);
}

const browser = await puppeteer.launch({
  headless: true,
  executablePath:
    process.env.PUPPETEER_EXECUTABLE_PATH ||
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  args: [
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--disable-background-timer-throttling",
    "--disable-backgrounding-occluded-windows",
    "--disable-renderer-backgrounding",
  ],
});

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function authed(path, width, height) {
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
  await page.goto(BASE + path, { waitUntil: "networkidle0" });
  return page;
}

const measure = (page) =>
  page.evaluate(() => {
    const aside = document.querySelector("aside");
    const bird = aside?.querySelector(".hoopoe-mascot");
    const root = bird?.querySelector("[data-part=root]");
    const ACCOUNT = ["My profile", "Settings", "Admin", "Reach out", "Sign out"];
    const tops = [...(aside?.querySelectorAll("a[href], button") ?? [])]
      .filter((el) => ACCOUNT.some((a) => el.textContent.trim().startsWith(a)))
      .map((el) => Math.round(el.getBoundingClientRect().top));
    const rb = root?.getBoundingClientRect();
    const accountTop = tops.length ? Math.min(...tops) : null;
    return {
      bird: rb
        ? { top: Math.round(rb.top), bottom: Math.round(rb.bottom), left: Math.round(rb.left) }
        : null,
      accountTop,
      rows: tops.length,
      overlapPx: rb && accountTop != null ? Math.round(rb.bottom - accountTop) : null,
    };
  });

/**
 * Full-viewport frames, deliberately NOT `clip`ped. Puppeteer implements a clip
 * with a device-metrics override, which fires the component's own
 * matchMedia("(min-width: 768px)") gate and tears the bird down mid-shot: an
 * earlier version of this file reported "bird=none" on a bird a 250ms presence
 * poll had just shown perched for five straight seconds. Crop afterwards if a
 * close-up is wanted; do not reintroduce a clip here.
 */
async function shot(page, name) {
  await page.screenshot({ path: join(OUT, `hoopoe-${name}.png`) });
  const m = await measure(page);
  console.log(
    `${name.padEnd(12)} bird=${m.bird ? `${m.bird.top}..${m.bird.bottom}@${m.bird.left}` : "none"} ` +
      `accountTop=${m.accountTop} rows=${m.rows} overlap=${m.overlapPx ?? "n/a"}px`
  );
  return m;
}

async function waitForBird(page, capMs = 160_000) {
  const t0 = Date.now();
  while (Date.now() - t0 < capMs) {
    const has = await page.evaluate(() => !!document.querySelector("aside .hoopoe-mascot"));
    if (has) return Math.round((Date.now() - t0) / 1000);
    await sleep(1000);
  }
  return null;
}

/* ---- desktop: perch, then the account-pill press ---- */
const page = await authed("/feed", 1440, 900);
const waited = await waitForBird(page);
console.log(waited == null ? "no bird in 160s" : `bird arrived after ${waited}s\n`);

// Poll presence while it lands and settles. A bird that leaves during these
// 5 idle seconds left without being asked to, which is its own bug; printing
// the timeline is what tells the two apart instead of guessing from one sample.
const timeline = [];
for (let t = 0; t < 5000; t += 250) {
  timeline.push(
    (await page.evaluate(() => !!document.querySelector("aside .hoopoe-mascot"))) ? "#" : "."
  );
  await sleep(250);
}
console.log(`settle timeline (250ms/char, # = present): ${timeline.join("")}`);
await shot(page, "perched");

const pill = await page.$("aside button[aria-expanded]");
await pill.click();
await sleep(200);
await shot(page, "exit-200ms");
await sleep(500);
await shot(page, "exit-700ms");
await sleep(2300);
await shot(page, "exit-done");
await page.close();

/* ---- mobile: the rig is gated off below 768px ---- */
const m = await authed("/feed", 390, 844);
await sleep(8000);
const hasBird = await m.evaluate(() => !!document.querySelector(".hoopoe-mascot"));
await m.screenshot({ path: join(OUT, "hoopoe-mobile.png") });
console.log(`mobile       bird present: ${hasBird} (expected false)`);
await m.close();

await browser.close();
