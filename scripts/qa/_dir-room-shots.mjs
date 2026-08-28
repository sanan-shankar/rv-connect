/**
 * Section-by-section capture of /lab/directory, plus a console/pageerror
 * watch. The room is ~9000px tall, so a single full-page shot is unreadable;
 * this scrolls to each section anchor and shoots the viewport.
 *
 *   node scripts/qa/_dir-room-shots.mjs            # 1440
 *   node scripts/qa/_dir-room-shots.mjs --mobile   # 390
 */
import puppeteer from "puppeteer";
import { mkdirSync } from "node:fs";

const mobile = process.argv.includes("--mobile");
// Extra query string, e.g. --qs "?n=2400&stress=worst"
const qsArg = process.argv.find((a) => a.startsWith("?")) || "";
const OUT = "./e2e/.shots/dir-room";
mkdirSync(OUT, { recursive: true });

const SECTIONS = [
  "top",
  "the-bar-measured",
  "four-ways-to-hold-it",
  "the-same-two-at-the-widths-that-actually-break",
  "sort-without-the-colon",
  "the-people-more-compact",
  "the-map-five-ways",
  "profession-returns-nothing-and-why",
  "bottom",
];

/** Extra shots taken by scrolling a fixed distance past an anchor, for the
 *  sections that are taller than one viewport (the five maps, mainly). */
const DEEP = [
  { id: "the-map-five-ways", offset: 900, name: "map-2-tiers" },
  { id: "the-map-five-ways", offset: 1750, name: "map-3-labels" },
  { id: "the-map-five-ways", offset: 2600, name: "map-4-gazetteer" },
  { id: "the-map-five-ways", offset: 3450, name: "map-5-choropleth" },
  { id: "four-ways-to-hold-it", offset: 900, name: "chrome-cd" },
];

const browser = await puppeteer.launch({
  headless: true,
  executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  args: ["--no-sandbox", "--disable-setuid-sandbox"],
});
const page = await browser.newPage();
await page.setViewport(mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 });

const problems = [];
page.on("console", (m) => {
  if (m.type() === "error" || m.type() === "warning") problems.push(`[${m.type()}] ${m.text()}`);
});
page.on("pageerror", (e) => problems.push(`[pageerror] ${e.message}`));

await page.goto(`http://localhost:3000/lab/directory${qsArg}`, { waitUntil: "domcontentloaded", timeout: 120000 });
await new Promise((r) => setTimeout(r, 3500));

const suffix = qsArg ? "-" + qsArg.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") : "";
const tag = (mobile ? "390" : "1440") + suffix;

const pageHeight = await page.evaluate(() => document.body.scrollHeight);
console.log(`page height: ${pageHeight}px`);

for (const id of SECTIONS) {
  if (id === "top") {
    await page.evaluate(() => window.scrollTo(0, 0));
  } else if (id === "bottom") {
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  } else {
    const found = await page.evaluate((sid) => {
      const el = document.getElementById(sid);
      if (!el) return false;
      window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 100);
      return true;
    }, id);
    if (!found) {
      console.log(`  MISSING ANCHOR: ${id}`);
      continue;
    }
  }
  await new Promise((r) => setTimeout(r, 700));
  await page.screenshot({ path: `${OUT}/${tag}-${id}.png` });
  console.log(`  shot ${tag}-${id}.png`);
}

// Element shots: every ChromeBench and ObjectCount carries data-shot, so each
// specimen is captured as its own image instead of being guessed at by scroll
// offset (which is how the first pass photographed the gap between two maps).
const shots = await page.$$("[data-shot]");
for (const h of shots) {
  const name = await h.evaluate((el) => el.getAttribute("data-shot"));
  const safe = String(name).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  await h.scrollIntoView();
  await new Promise((r) => setTimeout(r, 450));
  try {
    await h.screenshot({ path: `${OUT}/${tag}-el-${safe}.png` });
    console.log(`  element ${tag}-el-${safe}.png`);
  } catch (e) {
    console.log(`  element ${safe} FAILED: ${e.message.slice(0, 80)}`);
  }
}

for (const d of DEEP) {
  const ok = await page.evaluate((sid, off) => {
    const el = document.getElementById(sid);
    if (!el) return false;
    window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 100 + off);
    return true;
  }, d.id, d.offset);
  if (!ok) continue;
  await new Promise((r) => setTimeout(r, 700));
  await page.screenshot({ path: `${OUT}/${tag}-${d.name}.png` });
  console.log(`  shot ${tag}-${d.name}.png`);
}

// Overflow check: nothing may push the document wider than the viewport.
const overflow = await page.evaluate(() => {
  const docW = document.documentElement.scrollWidth;
  const winW = window.innerWidth;
  const wide = [...document.querySelectorAll("*")]
    .filter((el) => el.getBoundingClientRect().right > winW + 1)
    .slice(0, 6)
    .map((el) => `${el.tagName.toLowerCase()}.${String(el.className).slice(0, 60)} right=${Math.round(el.getBoundingClientRect().right)}`);
  return { docW, winW, wide };
});
console.log(`\noverflow: document ${overflow.docW}px vs window ${overflow.winW}px`);
if (overflow.wide.length) overflow.wide.forEach((w) => console.log(`   wide: ${w}`));

console.log(`\nconsole problems: ${problems.length}`);
[...new Set(problems)].slice(0, 20).forEach((p) => console.log(`   ${p.slice(0, 220)}`));

await browser.close();
