/**
 * Proves profile pictures no longer arrive after the rest of the page
 * (owner, 2026-08-03).
 *
 * Two things were wrong and both are asserted here:
 *   1. Avatars were raw <img> tags pointed straight at the R2 original, which
 *      is stored at up to 1920px. A real one measured 45.9KB to fill a 30px
 *      hole. Every avatar must now go through /_next/image, and the bytes
 *      actually transferred per avatar must be a small fraction of the
 *      original.
 *   2. next/image lazy-loads by default, which would have made the symptom
 *      worse. Every avatar must carry loading="eager".
 *
 * Usage: node scripts/qa/avatar-load-probe.mjs [url] [--mobile]
 * Exits non-zero on failure.
 */
import puppeteer from "puppeteer";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { config } from "dotenv";

process.chdir(resolve(dirname(fileURLToPath(import.meta.url)), "../.."));
config({ path: ".env.local" });

const args = process.argv.slice(2);
const mobile = args.includes("--mobile");
const url = args.filter((a) => a !== "--mobile")[0] || "http://localhost:3000/feed";

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
  args: ["--no-sandbox", "--disable-setuid-sandbox"],
});
const page = await browser.newPage();
await page.setViewport(mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 });

/* Record what each image response actually cost on the wire. */
const bytes = new Map();
page.on("response", async (res) => {
  const type = res.headers()["content-type"] || "";
  if (!type.startsWith("image/")) return;
  const len = Number(res.headers()["content-length"] || 0);
  bytes.set(res.url(), len);
});

const base = new URL(url).origin;
await page.goto(base, { waitUntil: "domcontentloaded", timeout: 15000 });
const auth = await page.evaluate(async (email) => {
  const res = await fetch("/api/auth/admin-login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  return res.ok;
}, adminEmail);
if (!auth) {
  console.error("Auth failed");
  await browser.close();
  process.exit(1);
}

try {
  await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });
} catch {
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
}
await new Promise((r) => setTimeout(r, 4000));

/* Every <img> sitting inside a fully-round mask: that is what an avatar is
   here, whether it is a 30px feed chip or the profile's measured circle.
   The radius test compares against half the box rather than matching a
   literal token: Tailwind v4's `rounded-full` computes to
   `calc(infinity * 1px)`, which no string match for "9999" would catch. */
const avatars = await page.evaluate(() =>
  [...document.querySelectorAll("img")]
    .map((im) => {
      const r = im.getBoundingClientRect();
      const host = im.parentElement || im;
      const radius = parseFloat(getComputedStyle(host).borderTopLeftRadius) || 0;
      const box = host.getBoundingClientRect();
      return {
        src: im.currentSrc || im.src,
        w: Math.round(r.width),
        h: Math.round(r.height),
        loading: im.loading,
        round: box.width > 0 && radius >= box.width / 2 - 1,
      };
    })
    .filter((i) => i.src && i.round && i.w > 0)
);

await browser.close();

const failures = [];
if (avatars.length === 0) {
  console.error(`No photo avatars found at ${url}. Nothing proven; treat as inconclusive.`);
  process.exit(1);
}

console.log(`${mobile ? "390" : "1440"} ${url} -- ${avatars.length} photo avatar(s):`);
for (const a of avatars) {
  const optimized = a.src.includes("/_next/image");
  const cost = bytes.get(a.src) ?? 0;
  console.log(
    `  ${a.w}x${a.h}  loading=${a.loading}  optimized=${optimized}  ${cost ? (cost / 1024).toFixed(1) + "KB" : "cached/unknown"}  ${a.src.slice(0, 90)}`
  );
  if (!optimized) failures.push(`a ${a.w}px avatar bypasses /_next/image (raw original)`);
  // "eager" and "auto" both pass: a `priority` image omits the loading
  // attribute entirely (it sets fetchpriority=high instead), so the IDL
  // property reads back "auto". Only an explicit "lazy" is the regression.
  if (a.loading === "lazy") failures.push(`a ${a.w}px avatar is loading=lazy (must not defer)`);
  // The R2 original measured 45.9KB. Anything near that means the optimizer
  // handed back the full-size file rather than a bucket-sized one.
  if (cost > 20000) failures.push(`a ${a.w}px avatar cost ${(cost / 1024).toFixed(1)}KB (expected well under 20KB)`);
}

if (failures.length) {
  console.error("\nFAIL:");
  for (const f of [...new Set(failures)]) console.error("  - " + f);
  process.exit(1);
}
console.log("\nPASS: every photo avatar is optimized and never deferred.");
