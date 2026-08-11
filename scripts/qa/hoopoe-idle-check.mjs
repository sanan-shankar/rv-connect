/* Regression guard: the sidebar idle bird must always be shoo-able.
 *
 * Fixed 2026-08-11. The idle effect in hoopoe.tsx re-runs whenever the tab is
 * hidden and shown again, and it used to call startBreathe() unconditionally.
 * That writes PARTS.body {scaleY,y} over arcAndLand's AWAITED body animation,
 * and a superseded animation's `.finished` never resolves in motion v12, so
 * flyIn() hung: the bird landed on the rail, the chain never reached sleep(),
 * and the flyTo() that the next mouse move enqueued sat forever behind a step
 * that could not finish. The owner could only clear it by reloading.
 *
 * WHY THIS EXISTS AS A SCRIPT. Nothing else in the repo can see this bug. It
 * is not a type error, not a lint error, and a screenshot of a wedged bird is
 * indistinguishable from a screenshot of a resting one — the whole defect is
 * that a promise never settles. It is also a recurring CLASS of bug here
 * (every "superseded animation wedges the queue" note in hoopoe.tsx is the
 * same failure), so the cheap reproduction is worth keeping.
 *
 * Needs the dev server and ADMIN_EMAIL. Not part of `npm run check` (it drives
 * a real browser and signs in), same as hoopoe-landing-check.mjs.
 *
 * To confirm it still discriminates, revert the `if (!damper.active)` guard in
 * hoopoe.tsx's idle effect: the last assertion should fail with the bird's
 * root transform reading "none", i.e. the exit flight never wrote a frame.
 */
import puppeteer from "puppeteer";
import { config } from "dotenv";
config({ path: ".env" });

const BASE = "http://localhost:3000";
const adminEmail = process.env.ADMIN_EMAIL;
if (!adminEmail) {
  console.error("ADMIN_EMAIL not in .env");
  process.exit(1);
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
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
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });

await page.goto(BASE, { waitUntil: "networkidle2", timeout: 60000 });
await page.evaluate(async (email) => {
  await fetch("/api/auth/admin-login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
}, adminEmail);
await page.goto(`${BASE}/feed`, { waitUntil: "networkidle2", timeout: 60000 });
await sleep(2500);

// The sidebar bird lives inside the desktop rail; the feed's own surfaces have
// no hoopoe, so counting rigs inside the <aside> is an unambiguous signal.
const birdCount = () =>
  page.evaluate(
    () => document.querySelectorAll("aside .hoopoe-mascot").length,
  );

check((await birdCount()) === 0, "no sidebar bird before the summon");

// Summon it (Ctrl+Shift+H) rather than waiting out the 90-120s idle window.
await page.keyboard.down("Control");
await page.keyboard.down("Shift");
await page.keyboard.press("KeyH");
await page.keyboard.up("Shift");
await page.keyboard.up("Control");

await sleep(250); // mid fly-in: the arc is ~1-1.9s, so this is inside it
check((await birdCount()) === 1, "bird summoned and flying in");

// THE TRIGGER: a tab switch away and back, while the bird is still airborne.
await page.evaluate(() => {
  Object.defineProperty(document, "hidden", { value: true, configurable: true });
  document.dispatchEvent(new Event("visibilitychange"));
});
await sleep(400);
await page.evaluate(() => {
  Object.defineProperty(document, "hidden", { value: false, configurable: true });
  document.dispatchEvent(new Event("visibilitychange"));
});

// Let it finish arriving and settle (or wedge).
await sleep(3500);
check((await birdCount()) === 1, "bird still perched after the tab flip");

// Now the actual complaint: move the mouse and it should leave.
for (let i = 0; i < 6; i++) {
  await page.mouse.move(400 + i * 40, 400 + i * 20);
  await sleep(120);
}
// Generous: wake() is ~1.3s (stretch + chord + two blinks) and the exit flight
// to x=-200 client px is a full 1.9s cruise plus a ~0.45s landing block, so the
// graceful path needs ~3.7s. Anything still perched well past that is wedged,
// not merely slow.
await sleep(7000);

const left = (await birdCount()) === 0;
check(left, "bird flies away on activity (the reported bug)");

if (!left) {
  const state = await page.evaluate(() => {
    const svg = document.querySelector("aside .hoopoe-mascot");
    if (!svg) return null;
    const root = svg.querySelector("[data-part=root]");
    return {
      rootTransform: root ? getComputedStyle(root).transform : null,
      eyesClosed:
        getComputedStyle(svg.querySelector("[data-eyeshape=closed]")).opacity,
    };
  });
  console.log("  stuck bird state:", JSON.stringify(state));
}

await browser.close();
console.log(failures ? `\n${failures} FAILED` : "\nALL PASSED");
process.exit(failures ? 1 : 0);
