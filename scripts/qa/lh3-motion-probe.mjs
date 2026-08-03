/**
 * lh3-motion-probe: proves (or disproves) that the segmented-pill thumb no
 * longer bounces past its target on the three shipped call sites -
 * profile Writing switcher (lab + the real profile route, same component),
 * directory's Map/Batches/People, signup's Alumnus/Teacher.
 *
 * THROWAWAY - written 2026-08-03 for one verification pass. Do not extend;
 * write a fresh probe next time (see the CLAUDE.md house rule against
 * hoarding one-shot scripts).
 *
 * Method: click a non-active segment, then sample the shared-layout thumb's
 * getBoundingClientRect().x on every animation frame from the click until
 * three checks in a row land within 0.05px of the final rect (the "settle"
 * epsilon - smaller than a sub-pixel render difference, so it can't fire on
 * render jitter alone). getBoundingClientRect() is used deliberately over
 * reading the `transform` computed style: Motion's shared layout animation
 * moves the thumb with a `matrix(...)` transform, and decoding a matrix by
 * hand is exactly the kind of bug this probe exists to avoid introducing.
 *
 * Overshoot: the direction of travel is sign(finalX - firstFrameX). Any
 * frame whose x lies PAST finalX in that direction, at any point after the
 * first frame, is overshoot - the curve travelled further than its own
 * destination and had to come back, which is the bounce the owner flagged.
 *
 * Velocity profile: average px/ms between consecutive frames. A start-slow/
 * peak-middle/end-slow curve should have its first and last velocity
 * readings well under its peak (checked at < 40% of peak - loose enough to
 * tolerate one-frame sampling noise at 60fps on a ~220ms animation, tight
 * enough that a curve which starts at full speed, like the old spring, will
 * still fail it).
 *
 * Run: node scripts/qa/lh3-motion-probe.mjs
 */
import puppeteer from 'puppeteer';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
process.chdir(repoRoot);
config({ path: '.env.local' });

const BASE = 'http://localhost:3000';
const adminEmail = process.env.ADMIN_EMAIL;
if (!adminEmail) {
  console.error('ADMIN_EMAIL missing from .env.local');
  process.exit(1);
}

// Settle epsilon: sub-pixel, so it only fires once the rect has visually
// stopped, not merely slowed. Three consecutive frames under it (not one)
// so a single coincidentally-still frame mid-flight can't be mistaken for
// having landed.
const SETTLE_EPS_PX = 0.05;
const SETTLE_STREAK = 3;
// Hard stop so a broken selector (thumb never appears) can't hang the probe
// forever instead of reporting a clean failure.
const MAX_SAMPLE_MS = 1500;
// Minimum spacing between KEPT samples. Verified against a raw dump
// (DEBUG_FRAMES=1): headless Chrome's compositor fires 2-3 extra rAF
// callbacks in quick succession (observed deltas of 2.6ms, 6.8ms) right as
// Motion's projection system sets up the FLIP transform, before frame
// pacing locks to the steady ~16.7ms/60fps cadence seen for the rest of
// the run. Those first duplicate-ish paints sample almost the same x twice
// and, divided by a tiny dt, produce a spuriously high instantaneous
// "velocity" for frame 0 that looks like "starts at max speed" but is a
// sampling artifact, not the app's actual motion (confirmed: the SAME
// control against the SAME transition, filtered, shows first-velocity at
// ~16% of peak instead of ~40-55%). 8ms is half a real vsync tick, so it
// only merges genuinely-too-close paints and cannot mask real deceleration
// between real frames later in the run, which all land essentially exactly
// on ~16.7ms boundaries.
const MIN_FRAME_DT_MS = 8;

/**
 * In-page sampler. Starts the rAF loop and clicks the target in the same
 * synchronous tick, so frame 0 is captured as close to the click as the
 * event loop allows (Motion's projection system has already measured the
 * old rect and re-parented the transform by the time React's synchronous
 * commit from the click handler returns).
 */
async function captureThumb(page, { clickSel, thumbSel }) {
  return page.evaluate(
    ({ clickSel, thumbSel, eps, streak, maxMs, minDt }) => {
      return new Promise((resolvePromise) => {
        const clickEl = document.querySelector(clickSel);
        if (!clickEl) {
          resolvePromise({ error: `click target not found: ${clickSel}` });
          return;
        }
        const frames = [];
        let settleStreak = 0;
        let lastX = null;
        let lastKeptT = null;
        const t0 = performance.now();

        function sample() {
          const thumb = document.querySelector(thumbSel);
          const rect = thumb ? thumb.getBoundingClientRect() : null;
          const t = performance.now() - t0;
          // Drop duplicate-ish paints closer together than minDt (see the
          // MIN_FRAME_DT_MS comment above the constant) so a headless-only
          // double-paint at the very start of the FLIP setup can't read as
          // a spurious high-velocity first frame.
          const tooSoon = lastKeptT !== null && t - lastKeptT < minDt;
          if (rect && !tooSoon) {
            frames.push({ t, x: rect.x, width: rect.width });
            lastKeptT = t;
            if (lastX !== null && Math.abs(rect.x - lastX) < eps) settleStreak++;
            else settleStreak = 0;
            lastX = rect.x;
          }
          if ((rect && !tooSoon && settleStreak >= streak) || t > maxMs) {
            resolvePromise({ frames });
            return;
          }
          requestAnimationFrame(sample);
        }
        requestAnimationFrame(sample);
        clickEl.click();
      });
    },
    { clickSel, thumbSel, eps: SETTLE_EPS_PX, streak: SETTLE_STREAK, maxMs: MAX_SAMPLE_MS, minDt: MIN_FRAME_DT_MS }
  );
}

/** Find a button inside `containerSel` whose visible text matches `label`,
 *  and build a stable selector puppeteer can re-query with (nth-of-type on
 *  the container, not an in-memory handle - the click handler causes a
 *  React re-render that can detach earlier handles). */
async function buttonSelectorByLabel(page, containerSel, label) {
  return page.evaluate(
    ({ containerSel, label }) => {
      const container = document.querySelector(containerSel);
      if (!container) return null;
      const buttons = Array.from(container.querySelectorAll('button'));
      const idx = buttons.findIndex((b) => b.textContent?.trim().startsWith(label));
      if (idx === -1) return null;
      return `${containerSel} button:nth-of-type(${idx + 1})`;
    },
    { containerSel, label }
  );
}

function analyze(frames) {
  if (!frames || frames.length < 3) {
    return { ok: false, reason: `too few frames (${frames?.length ?? 0})` };
  }
  const x0 = frames[0].x;
  const xF = frames[frames.length - 1].x;
  const direction = Math.sign(xF - x0); // +1 moving right, -1 moving left, 0 no travel

  let overshootPx = 0;
  if (direction > 0) {
    overshootPx = Math.max(0, Math.max(...frames.map((f) => f.x)) - xF);
  } else if (direction < 0) {
    overshootPx = Math.max(0, xF - Math.min(...frames.map((f) => f.x)));
  }

  // First frame at which the rect is within settle epsilon of the final
  // rect AND stays there - i.e. when it actually arrived, not just when it
  // first happened to touch the target in passing (which overshoot would
  // also do, right before springing back past it).
  let settleT = frames[frames.length - 1].t;
  for (let i = 0; i < frames.length; i++) {
    if (Math.abs(frames[i].x - xF) < 0.5) {
      const restOfRun = frames.slice(i);
      if (restOfRun.every((f) => Math.abs(f.x - xF) < 0.5)) {
        settleT = frames[i].t;
        break;
      }
    }
  }

  const velocities = [];
  for (let i = 1; i < frames.length; i++) {
    const dt = frames[i].t - frames[i - 1].t;
    if (dt > 0) velocities.push(Math.abs(frames[i].x - frames[i - 1].x) / dt);
  }
  const peakV = Math.max(...velocities, 0);
  const firstV = velocities[0] ?? 0;
  const lastV = velocities[velocities.length - 1] ?? 0;
  const peakIdx = velocities.indexOf(peakV);
  const peakFrac = velocities.length > 1 ? peakIdx / (velocities.length - 1) : 0.5;

  // Band is NOT "near 50%": solving the shared curve analytically
  // (EASE_SEGMENT_GLIDE = cubic-bezier(0.4, 0, 0.2, 1), Y(s) = 3s^2 - 2s^3
  // since y1 = 0, X(s) the matching time-fraction polynomial) puts its own
  // peak d(progress)/d(time) at s~=0.4, i.e. ~29% into the duration - this
  // curve is deliberately front-loaded (short decisive ease-in, longer
  // ease-out per its own comment in motion.tsx), not symmetric. All four
  // targets independently measured peaking at 20-25%, which corroborates
  // that math rather than being noise. So the real bar is "clearly not at
  // the very first sample (an actual max-speed start) and clearly not at
  // the very last (still moving at rest)" - 0.10 to 0.85 - not a literal
  // middle third.
  const peaksInMiddle = peakFrac >= 0.1 && peakFrac <= 0.85;
  const startsSlow = peakV === 0 || firstV / peakV < 0.4;
  const endsSlow = peakV === 0 || lastV / peakV < 0.4;

  return {
    ok: true,
    frameCount: frames.length,
    x0,
    xF,
    direction,
    overshootPx: Number(overshootPx.toFixed(3)),
    settleMs: Number(settleT.toFixed(1)),
    peakV: Number(peakV.toFixed(4)),
    firstV: Number(firstV.toFixed(4)),
    lastV: Number(lastV.toFixed(4)),
    peakFrac: Number(peakFrac.toFixed(2)),
    peaksInMiddle,
    startsSlow,
    endsSlow,
    pass: overshootPx < 0.5 && peaksInMiddle && startsSlow && endsSlow,
  };
}

const browser = await puppeteer.launch({
  headless: true,
  executablePath:
    process.env.PUPPETEER_EXECUTABLE_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});

const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });

// Auth once; every target below is behind (main)/ except /signup.
await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 20000 });
const auth = await page.evaluate(async (email) => {
  const res = await fetch('/api/auth/admin-login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  return res.ok;
}, adminEmail);
if (!auth) {
  console.error('admin-login failed');
  await browser.close();
  process.exit(1);
}

// Resolve a real profile id for the "shipped, not just /lab" check: force
// the directory into its People view with a query so a profile link is on
// the page, then take the first result.
let shippedProfileUrl = null;
try {
  await page.goto(`${BASE}/directory?q=a`, { waitUntil: 'networkidle2', timeout: 20000 });
  const href = await page.evaluate(() => {
    const a = document.querySelector('a[href^="/profile/"]');
    return a ? a.getAttribute('href') : null;
  });
  if (href) shippedProfileUrl = `${BASE}${href}`;
} catch (e) {
  console.error('could not resolve a shipped profile url:', e.message);
}

const results = [];

const TARGETS = [
  {
    name: 'lab letterhead-3: All/Posts/Letters/Saved',
    url: `${BASE}/lab/profiles?v=letterhead-3`,
    containerSel: '[role="tablist"][aria-label="Profile sections"]',
    clickLabel: 'Saved',
    thumbSel: 'button[aria-selected="true"] > span[aria-hidden]',
    checkFill: false,
  },
  {
    name: 'shipped profile (real route, same component): All/Posts/Letters/...',
    url: shippedProfileUrl,
    containerSel: '[role="tablist"][aria-label="Profile sections"]',
    clickLabel: 'Letters',
    thumbSel: 'button[aria-selected="true"] > span[aria-hidden]',
    checkFill: false,
  },
  {
    name: 'directory: Map/Batches/People',
    url: `${BASE}/directory`,
    containerSel: '[role="tablist"][aria-label="Browse view"]',
    clickLabel: 'Batches',
    thumbSel: 'button[aria-selected="true"] > span[aria-hidden]',
    checkFill: true,
    activeBtnSel: 'button[aria-selected="true"]',
  },
  {
    name: 'signup: Alumnus/Teacher',
    url: `${BASE}/signup`,
    needsTriviaGate: true,
    containerSel: '[role="radiogroup"][aria-label="I am a..."]',
    clickLabel: 'Teacher',
    thumbSel: 'button[aria-checked="true"] > span[aria-hidden]',
    checkFill: true,
    activeBtnSel: 'button[aria-checked="true"]',
  },
];

// Trivia gate answer key. /signup is a public page (no redirect for an
// already-authed admin session - it's plain "use client" with no server
// auth check), but its account-type toggle sits behind a one-question gate
// ("prove you're one of us") before the register step mounts. The bank is
// only two fixed questions (src/components/auth/trivia-actions.ts) checked
// server-side, so answering it here is not a bypass of anything - it is
// the same answer any real alum would type.
const TRIVIA_ANSWERS = { banyan: 'banyan', cauvery: 'cauvery' };

async function clearTriviaGate(page) {
  await new Promise((r) => setTimeout(r, 600));
  const question = await page.evaluate(() => document.querySelector('p.font-heading')?.textContent ?? '');
  // Match on words that appear in the QUESTION prompt, not the answer (the
  // answer obviously never appears in its own prompt): "What tree..." ->
  // banyan, "What house is next to Krishna?" -> cauvery.
  const key = /tree/i.test(question) ? 'banyan' : /house/i.test(question) ? 'cauvery' : null;
  if (!key) return { ok: false, error: `unrecognised trivia question: "${question}"` };
  await page.type('input[placeholder="Your answer..."]', TRIVIA_ANSWERS[key]);
  await page.click('button[type="submit"]');
  // hoopoe.react('correct') + a 720ms setTimeout before onPass() flips the step
  await new Promise((r) => setTimeout(r, 1400));
  const gated = await page.evaluate(() => !document.querySelector('[role="radiogroup"]'));
  return gated ? { ok: false, error: 'still gated after a correct answer' } : { ok: true };
}

for (const target of TARGETS) {
  if (!target.url) {
    results.push({ name: target.name, error: 'no URL resolved (see directory lookup above)' });
    continue;
  }
  try {
    await page.goto(target.url, { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise((r) => setTimeout(r, 800)); // let mount + FadeRise entrances finish

    if (target.needsTriviaGate) {
      const gate = await clearTriviaGate(page);
      if (!gate.ok) {
        results.push({ name: target.name, error: `trivia gate: ${gate.error}` });
        continue;
      }
      await new Promise((r) => setTimeout(r, 400)); // register-step FadeRise
    }

    const container = await page.$(target.containerSel);
    if (!container) {
      results.push({ name: target.name, error: `container not found: ${target.containerSel}` });
      continue;
    }

    const clickSel = await buttonSelectorByLabel(page, target.containerSel, target.clickLabel);
    if (!clickSel) {
      results.push({ name: target.name, error: `"${target.clickLabel}" segment not found` });
      continue;
    }

    const { frames, error } = await captureThumb(page, { clickSel, thumbSel: target.thumbSel });
    if (error) {
      results.push({ name: target.name, error });
      continue;
    }

    const analysis = analyze(frames);
    if (process.env.DEBUG_FRAMES) {
      console.log(`\n[debug] ${target.name} raw frames:`);
      for (const f of frames) console.log(`  t=${f.t.toFixed(1).padStart(6)}ms  x=${f.x.toFixed(2).padStart(8)}  w=${f.width.toFixed(2)}`);
    }

    let fillCheck = null;
    if (target.checkFill) {
      fillCheck = await page.evaluate((sel) => {
        const btn = document.querySelector(sel);
        if (!btn) return null;
        const cs = getComputedStyle(btn);
        const thumb = btn.querySelector('span[aria-hidden]');
        const thumbCs = thumb ? getComputedStyle(thumb) : null;
        return {
          textColor: cs.color,
          thumbBg: thumbCs ? thumbCs.backgroundColor : null,
        };
      }, target.activeBtnSel);
    }

    results.push({ name: target.name, url: target.url, analysis, fillCheck });
  } catch (e) {
    results.push({ name: target.name, error: String(e.message || e).slice(0, 200) });
  }
}

await browser.close();

console.log('\nlh3-motion-probe');
console.log('='.repeat(100));
for (const r of results) {
  console.log(`\n${r.name}`);
  if (r.url) console.log(`  ${r.url}`);
  if (r.error) {
    console.log(`  ERROR: ${r.error}`);
    continue;
  }
  const a = r.analysis;
  if (!a.ok) {
    console.log(`  ERROR: ${a.reason}`);
    continue;
  }
  console.log(`  frames sampled     : ${a.frameCount}`);
  console.log(`  travel              : ${a.x0.toFixed(1)}px -> ${a.xF.toFixed(1)}px (${a.direction > 0 ? 'rightward' : a.direction < 0 ? 'leftward' : 'no travel'})`);
  console.log(`  peak overshoot      : ${a.overshootPx}px  ${a.overshootPx < 0.5 ? '(PASS, target 0.0)' : '(FAIL - bounce present)'}`);
  console.log(`  settle duration     : ${a.settleMs}ms`);
  console.log(`  velocity: first=${a.firstV} peak=${a.peakV} (at ${(a.peakFrac * 100).toFixed(0)}% of run) last=${a.lastV}`);
  console.log(`  starts slow         : ${a.startsSlow ? 'yes' : 'NO (starts near max speed)'}`);
  console.log(`  peaks mid-run       : ${a.peaksInMiddle ? 'yes' : 'NO'}`);
  console.log(`  ends slow           : ${a.endsSlow ? 'yes' : 'NO (still moving fast at rest)'}`);
  console.log(`  OVERALL             : ${a.pass ? 'PASS' : 'FAIL'}`);
  if (r.fillCheck) {
    console.log(`  active segment text color  : ${r.fillCheck.textColor}`);
    console.log(`  active thumb background    : ${r.fillCheck.thumbBg}`);
  }
}

const bad = results.filter((r) => r.error || !r.analysis?.ok || !r.analysis?.pass);
console.log('\n' + '='.repeat(100));
console.log(`${results.length - bad.length}/${results.length} controls pass (zero overshoot, start/peak/end-slow shape)\n`);
process.exit(bad.length ? 1 : 0);
