/* One-off Wave-1 interactive verifier: drives a real admin session and
 * captures the states a static screenshot cannot reach, plus DOM-measured
 * insets so the padding claims are numbers, not eyeballing.
 *   1. /feed with the composer EXPANDED (field radius, icon-glyph sink)
 *   2. a letter card in the feed (preview outline radius)
 *   3. the image viewer, opened and stepped once, settled
 * Usage: node scripts/qa/wave1-verify.mjs [--mobile]
 */
import puppeteer from "puppeteer";
import { mkdirSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { config } from "dotenv";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
process.chdir(repoRoot);
config({ path: ".env.local" });

const mobile = process.argv.includes("--mobile");
const tag = mobile ? "-mobile" : "";
const dir = "./temporary screenshots";
mkdirSync(dir, { recursive: true });

const browser = await puppeteer.launch({
  headless: true,
  executablePath:
    process.env.PUPPETEER_EXECUTABLE_PATH ||
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  args: ["--no-sandbox", "--disable-setuid-sandbox"],
});
const page = await browser.newPage();
await page.setViewport(mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 });

await page.goto("http://localhost:3000", { waitUntil: "domcontentloaded" });
const auth = await page.evaluate(async (email) => {
  const res = await fetch("/api/auth/admin-login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  return res.ok;
}, process.env.ADMIN_EMAIL);
if (!auth) {
  console.error("auth failed");
  process.exit(1);
}

await page.goto("http://localhost:3000/feed", { waitUntil: "networkidle2", timeout: 30000 }).catch(() => {});
await new Promise((r) => setTimeout(r, 3500));

/* 1 - expand the composer, screenshot, and MEASURE the bottom-left glyph */
await page.click('[data-composer] button');
await new Promise((r) => setTimeout(r, 1600)); // let the height spring settle
const composerMeasure = await page.evaluate(() => {
  const card = document.querySelector("[data-composer]");
  if (!card) return null;
  const cardR = card.getBoundingClientRect();
  const field = card.querySelector('[contenteditable]');
  const fieldR = field?.getBoundingClientRect();
  const iconBtns = [...card.querySelectorAll("button")].filter(
    (b) => b.querySelector("svg") && b.offsetHeight === 36 && b.offsetWidth === 36
  );
  const icon = iconBtns[0];
  const svg = icon?.querySelector("svg")?.getBoundingClientRect();
  return {
    fieldRadius: field ? getComputedStyle(field).borderRadius : null,
    fieldTopInset: fieldR ? +(fieldR.top - cardR.top).toFixed(1) : null,
    fieldRightInset: fieldR ? +(cardR.right - fieldR.right).toFixed(1) : null,
    glyphBottomInset: svg ? +(cardR.bottom - svg.bottom).toFixed(1) : null,
    glyphLeftInset: svg && fieldR ? +(svg.left - fieldR.left).toFixed(1) : null,
  };
});
console.log("composer expanded:", JSON.stringify(composerMeasure));
await page.screenshot({ path: `${dir}/wave1-composer${tag}.png` });

/* 2 - measure the post card action row + image radius on the first photo post */
const postMeasure = await page.evaluate(() => {
  const cards = [...document.querySelectorAll("article")];
  for (const card of cards) {
    const heart = card.querySelector('button[aria-label="Like this post"] svg');
    const img = card.querySelector("button img");
    if (!heart) continue;
    const cardR = card.getBoundingClientRect();
    const heartR = heart.getBoundingClientRect();
    return {
      heartGlyphBottomInset: +(cardR.bottom - heartR.bottom).toFixed(1),
      heartGlyphLeftInset: +(heartR.left - cardR.left).toFixed(1),
      imageRadius: img ? getComputedStyle(img.closest("button")).borderRadius : null,
      cardRadius: getComputedStyle(card).borderRadius,
    };
  }
  return null;
});
console.log("post card:", JSON.stringify(postMeasure));

/* 3 - letter preview outline radius (scroll until a letter card exists) */
const letterMeasure = await page.evaluate(() => {
  const link = document.querySelector('article a[href^="/letters/"]');
  if (!link) return null;
  return { letterOutlineRadius: getComputedStyle(link).borderRadius };
});
console.log("letter preview:", JSON.stringify(letterMeasure));

/* 4 - open the viewer on the first photo, step once, settle, screenshot */
const thumb = await page.$('article button[aria-label^="View photo"]');
if (thumb) {
  await thumb.click();
  await new Promise((r) => setTimeout(r, 900));
  await page.keyboard.press("ArrowRight");
  await new Promise((r) => setTimeout(r, 900)); // past the 260ms step, fully settled
  const viewerMeasure = await page.evaluate(() => {
    const dialog = document.querySelector('[role="dialog"]');
    const frames = dialog ? [...dialog.querySelectorAll("img")] : [];
    return frames.map((f) => {
      const st = getComputedStyle(f.closest("div"));
      return { transform: st.transform, opacity: st.opacity };
    });
  });
  console.log("viewer after step (settled):", JSON.stringify(viewerMeasure));
  await page.screenshot({ path: `${dir}/wave1-viewer${tag}.png` });
}

await browser.close();
console.log("done");
