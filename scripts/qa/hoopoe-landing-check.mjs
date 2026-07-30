/* Hoopoe landing verifier (owner items 16 + 18): drives the real flights and
 * measures them off the DOM every frame, so "lands exactly, no correction
 * jump, one bird" are numbers instead of eyeballed PNGs. Runs all four
 * arrivals: desktop CTA flight + mobile sky fly-in, for /login AND /signup.
 *
 *   DESKTOP (1440x900): load the landing, click the hero CTA, sample the
 *   flyer ([data-mascot-flyer]) and the destination perch box
 *   ([data-hoopoe-perch]) each rAF. Asserts:
 *     - final flyer rect == destination rect within 1px
 *     - after touchdown (first frame within 2px of final) no frame moves >1px
 *     - >=1 painted frame where flyer AND destination are both fully visible
 *       (the same-frame swap overlap), at <=1px offset
 *   MOBILE (390x844): load the auth page directly with a sampler installed
 *   before any page script. Asserts:
 *     - the bird is hidden (veiled) on every frame before the fly-in reveal
 *       (no SSR flash of the seated bird)
 *     - on its first visible frame the bird is fully ABOVE the viewport top
 *     - it descends smoothly (no upward jump > 12px, no teleport) into place
 *
 * Usage: node scripts/qa/hoopoe-landing-check.mjs   (dev server on :3000)
 */
import puppeteer from "puppeteer";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
process.chdir(repoRoot);

const BASE = "http://localhost:3000";
let failures = 0;
const check = (ok, label, detail) => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? `  (${detail})` : ""}`);
  if (!ok) failures++;
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({
  headless: true,
  executablePath:
    process.env.PUPPETEER_EXECUTABLE_PATH ||
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  args: ["--no-sandbox", "--disable-setuid-sandbox"],
});

/* ================= DESKTOP: CTA click -> cross-page flight ================= */
async function desktopFlight({ tag, href, ctaText }) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  // Prewarm the dev-compiled route so a first-visit Turbopack compile can't
  // stall the flight mid-air and pollute the measurement.
  await page.goto(`${BASE}${href}`, { waitUntil: "networkidle2", timeout: 60000 });
  await page.goto(BASE, { waitUntil: "networkidle2", timeout: 60000 });
  await sleep(1500); // hero reveal + warmup settle

  // In-page rAF sampler. The landing -> auth move is a client-side navigation
  // (same document), so the loop survives it and sees the whole flight.
  await page.evaluate(() => {
    window.__samples = [];
    const loop = (t) => {
      const rec = { t };
      const flyer = document.querySelector("[data-mascot-flyer]");
      if (flyer) {
        const r = flyer.getBoundingClientRect();
        rec.flyer = {
          left: r.left,
          top: r.top,
          opacity: parseFloat(getComputedStyle(flyer).opacity),
        };
      }
      const perch = document.querySelector("[data-hoopoe-perch]");
      if (perch) {
        const r = perch.getBoundingClientRect();
        rec.perch = { left: r.left, top: r.top, opacity: parseFloat(getComputedStyle(perch).opacity) };
      }
      window.__samples.push(rec);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  });

  // Click the hero CTA (the one wired to startExit/launchFlight). The sticky
  // nav has its own plain links earlier in the DOM, so scope to the hero
  // <section>.
  const clicked = await page.evaluate(
    ({ href, ctaText }) => {
      const a = [...document.querySelectorAll(`section a[href="${href}"]`)].find(
        (el) => el.textContent.trim() === ctaText
      );
      if (!a) return false;
      a.click();
      return true;
    },
    { href, ctaText }
  );
  check(clicked, `${tag}: hero "${ctaText}" CTA found + clicked`);
  await sleep(5000); // whole flight + handoff + margin

  const samples = await page.evaluate(() => window.__samples);
  const flyerFrames = samples.filter((s) => s.flyer);
  check(flyerFrames.length > 30, `${tag}: flyer sampled through the flight`, `${flyerFrames.length} frames`);

  if (flyerFrames.length) {
    const last = flyerFrames[flyerFrames.length - 1];
    const dx = last.perch ? Math.abs(last.flyer.left - last.perch.left) : NaN;
    const dy = last.perch ? Math.abs(last.flyer.top - last.perch.top) : NaN;
    check(
      last.perch != null && dx <= 1 && dy <= 1,
      `${tag}: final flyer position == destination rect within 1px`,
      `dx=${dx.toFixed(2)}px dy=${dy.toFixed(2)}px`
    );

    // Touchdown = first frame within 2px of the flyer's final resting spot.
    // Movement after it is judged as VELOCITY (px per 16.7ms frame): the
    // sampler occasionally misses a rAF (dev-mode React work), and two ticks
    // of a smooth settle seen as one sample must not read as a jump; a real
    // correction snap concentrates many px into one actual frame and still
    // fails.
    const tdIdx = flyerFrames.findIndex(
      (s) => Math.hypot(s.flyer.left - last.flyer.left, s.flyer.top - last.flyer.top) <= 2
    );
    let maxVel = 0;
    for (let i = Math.max(1, tdIdx + 1); i < flyerFrames.length; i++) {
      const a = flyerFrames[i - 1];
      const b = flyerFrames[i];
      const step = Math.hypot(b.flyer.left - a.flyer.left, b.flyer.top - a.flyer.top);
      const framesElapsed = Math.max(1, (b.t - a.t) / 16.7);
      maxVel = Math.max(maxVel, step / framesElapsed);
    }
    check(
      tdIdx >= 0 && maxVel <= 1,
      `${tag}: no frame after touchdown moves more than 1px (no correction jump)`,
      `touchdown frame ${tdIdx}/${flyerFrames.length}, max post-touchdown velocity ${maxVel.toFixed(2)}px/frame`
    );

    // Same-frame swap: at least one painted frame with BOTH birds fully
    // visible, and pixel-aligned while overlapped.
    const overlap = samples.filter(
      (s) => s.flyer && s.flyer.opacity >= 0.99 && s.perch && s.perch.opacity >= 0.99
    );
    const maxOverlapOff = overlap.reduce(
      (m, s) => Math.max(m, Math.hypot(s.flyer.left - s.perch.left, s.flyer.top - s.perch.top)),
      0
    );
    check(
      overlap.length >= 1 && maxOverlapOff <= 1,
      `${tag}: handoff overlap exists and is pixel-aligned (no visible double bird)`,
      `${overlap.length} overlap frames, max offset ${maxOverlapOff.toFixed(2)}px`
    );

    // Frame pacing during the flight (informational + a coarse gate).
    let worstGap = 0;
    for (let i = 1; i < flyerFrames.length; i++)
      worstGap = Math.max(worstGap, flyerFrames[i].t - flyerFrames[i - 1].t);
    check(worstGap < 100, `${tag}: no >100ms frame stall mid-flight`, `worst frame gap ${worstGap.toFixed(1)}ms`);
    const revealed = samples.at(-1)?.perch?.opacity === 1;
    check(revealed, `${tag}: destination hoopoe revealed after handoff`);
  }
  await page.close();
}

/* ================= MOBILE: direct visit -> sky fly-in ================= */
async function mobileFlyIn({ tag, href }) {
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844 });
  // Install the sampler BEFORE any page script so the very first painted
  // frames (where an SSR flash would live) are captured.
  await page.evaluateOnNewDocument(() => {
    window.__samples = [];
    const loop = (t) => {
      const rec = { t };
      const perch = document.querySelector("[data-hoopoe-perch]");
      if (perch) {
        // effective visibility = inner box opacity x outer veil opacity
        const inner = parseFloat(getComputedStyle(perch).opacity);
        const outer = parseFloat(getComputedStyle(perch.parentElement).opacity);
        rec.visible = inner * outer;
        const root = perch.querySelector("[data-part=root]");
        if (root) {
          // bbox for on-screen position (includes wing poses; right for the
          // "fully above the viewport" check)...
          const r = root.getBoundingClientRect();
          rec.bird = { top: r.top, bottom: r.bottom, left: r.left };
          // ...and the root's own translation for settle stability (a wave or
          // cover-eyes changes the group's bbox without the bird moving).
          const t = getComputedStyle(root).transform;
          rec.ty = t && t !== "none" ? new DOMMatrix(t).f : 0;
        }
      }
      window.__samples.push(rec);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  });
  await page.goto(`${BASE}${href}`, { waitUntil: "networkidle2", timeout: 60000 });
  await sleep(4500); // 500ms delay + <=1.9s arc + intro + margin

  const samples = await page.evaluate(() => window.__samples);
  const firstVisibleIdx = samples.findIndex((s) => (s.visible ?? 0) > 0.01 && s.bird);
  check(firstVisibleIdx > 0, `${tag}: bird eventually becomes visible`, `frame ${firstVisibleIdx}/${samples.length}`);

  if (firstVisibleIdx > 0) {
    const preFlash = samples.slice(0, firstVisibleIdx).every((s) => (s.visible ?? 0) <= 0.01);
    check(preFlash, `${tag}: bird hidden on every frame before the fly-in reveal (no SSR flash)`);

    const first = samples[firstVisibleIdx];
    check(
      first.bird.bottom <= 0,
      `${tag}: first visible frame is fully ABOVE the viewport top`,
      `bird bottom at ${first.bird.bottom.toFixed(1)}px (viewport top = 0)`
    );

    // Descent quality: track the bird every visible frame until it stops
    // moving. Allow the wingbeat bob's small lifts; fail on real jumps.
    const flight = samples.slice(firstVisibleIdx).filter((s) => s.bird && (s.visible ?? 0) > 0.5);
    let maxUp = 0;
    let maxStep = 0;
    for (let i = 1; i < flight.length; i++) {
      const step = flight[i].bird.top - flight[i - 1].bird.top;
      if (step < 0) maxUp = Math.max(maxUp, -step);
      maxStep = Math.max(maxStep, Math.abs(step));
    }
    check(maxUp <= 12, `${tag}: descent never lurches upward (>12px)`, `max upward move ${maxUp.toFixed(1)}px`);
    check(maxStep <= 60, `${tag}: no teleport frames in the descent`, `max frame step ${maxStep.toFixed(1)}px`);

    // Settled: judge the last 20 samples on the root's TRANSLATION (viewBox
    // units), which the landing pins to 0 — the group's bounding box keeps
    // changing after landing because the greet/cover-eyes intro moves wings.
    const tail = flight.slice(-20).map((s) => s.ty ?? 0);
    const spread = Math.max(...tail) - Math.min(...tail);
    check(
      spread <= 1,
      `${tag}: bird settled into place (root translation stable at rest)`,
      `last-20-frame root-y spread ${spread.toFixed(2)} viewBox units`
    );
    console.log(
      `${tag} numbers: reveal at frame ${firstVisibleIdx}, first visible bottom ${first.bird.bottom.toFixed(
        1
      )}px, final root y ${tail.at(-1)?.toFixed(2)}u, ${flight.length} visible flight frames`
    );
  }
  await page.close();
}

await desktopFlight({ tag: "desktop login", href: "/login", ctaText: "Sign in" });
await desktopFlight({ tag: "desktop signup", href: "/signup", ctaText: "Join the community" });
await mobileFlyIn({ tag: "mobile login", href: "/login" });
await mobileFlyIn({ tag: "mobile signup", href: "/signup" });

await browser.close();
console.log(failures === 0 ? "ALL CHECKS PASSED" : `${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
