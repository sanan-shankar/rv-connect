/**
 * Proves the image viewer's step is a clean cross dissolve (owner, 2026-08-03:
 * no slide, no bounce). Three assertions, all measured off the live DOM at
 * /lab/viewer rather than read off the source:
 *
 *   1. NO TRANSLATION. Every frame's computed transform stays at the identity
 *      (or a pure identity matrix) for the whole step, in both directions.
 *      This is the actual regression guard: the old version drifted x by
 *      28px in / 18px out.
 *   2. NO BACKDROP BLEED. Sampled across the cross, the backdrop showing
 *      through both frames -- (1 - outgoing) * (1 - incoming) -- must stay
 *      low. Two linear legs would peak at 0.25; the shipped easeOut/easeIn
 *      pairing should stay near 0.02. Threshold 0.10 leaves headroom for
 *      sampling jitter while still failing a linear/linear regression.
 *   3. SETTLES. After the step, exactly one frame remains, fully opaque.
 *
 * Exits non-zero on failure so it can gate a commit.
 */
import puppeteer from "puppeteer";

const browser = await puppeteer.launch({
  headless: true,
  executablePath:
    process.env.PUPPETEER_EXECUTABLE_PATH ||
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  args: ["--no-sandbox"],
});
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
await page.goto("http://localhost:3000/lab/viewer", { waitUntil: "networkidle2" });
await page.click("main button");
await new Promise((r) => setTimeout(r, 900));

/** Read every mounted frame's transform + opacity. */
const sample = () =>
  page.evaluate(() => {
    const stage = document.querySelector('[role="dialog"]');
    if (!stage) return [];
    return [...stage.querySelectorAll("img")].map((im) => {
      const frame = im.closest("div");
      const st = getComputedStyle(frame);
      return { transform: st.transform, opacity: +st.opacity };
    });
  });

/** A transform that moves nothing: "none", or a matrix with tx = ty = 0. */
function isStill(transform) {
  if (!transform || transform === "none") return true;
  const nums = transform.match(/-?[\d.]+/g);
  if (!nums) return true;
  const v = nums.map(Number);
  const [tx, ty] = v.length === 6 ? [v[4], v[5]] : [v[12] ?? 0, v[13] ?? 0];
  return Math.abs(tx) < 0.5 && Math.abs(ty) < 0.5;
}

const failures = [];

/** Walk one step, sampling densely through the 220ms cross. */
async function walk(key, label) {
  await page.keyboard.press(key);
  let worstBleed = 0;
  let worstShift = 0;
  for (let i = 0; i < 12; i++) {
    const frames = await sample();
    for (const f of frames) {
      if (!isStill(f.transform)) {
        const nums = (f.transform.match(/-?[\d.]+/g) || []).map(Number);
        const tx = nums.length === 6 ? nums[4] : nums[12] ?? 0;
        worstShift = Math.max(worstShift, Math.abs(tx));
      }
    }
    if (frames.length === 2) {
      const bleed = frames.reduce((acc, f) => acc * (1 - f.opacity), 1);
      worstBleed = Math.max(worstBleed, bleed);
    }
    await new Promise((r) => setTimeout(r, 25));
  }
  await new Promise((r) => setTimeout(r, 600));
  const settled = await sample();

  console.log(
    `${label}: worst x-shift ${worstShift.toFixed(2)}px, worst backdrop bleed ${worstBleed.toFixed(3)}, settled frames ${settled.length} @ opacity ${settled.map((f) => f.opacity.toFixed(2)).join(",")}`
  );
  if (worstShift >= 0.5) failures.push(`${label}: frame translated ${worstShift.toFixed(2)}px (expected 0, the slide is meant to be gone)`);
  if (worstBleed > 0.1) failures.push(`${label}: backdrop bled through at ${worstBleed.toFixed(3)} (expected < 0.10)`);
  if (settled.length !== 1) failures.push(`${label}: ${settled.length} frames left after settling (expected 1)`);
  else if (settled[0].opacity < 0.99) failures.push(`${label}: settled frame at opacity ${settled[0].opacity} (expected 1)`);
}

await walk("ArrowRight", "forward");
await walk("ArrowLeft", "back");

await browser.close();

if (failures.length) {
  console.error("\nFAIL:");
  for (const f of failures) console.error("  - " + f);
  process.exit(1);
}
console.log("\nPASS: the step is a still cross dissolve in both directions.");
