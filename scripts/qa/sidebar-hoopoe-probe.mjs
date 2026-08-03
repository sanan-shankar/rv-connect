/**
 * Probes the sidebar's idle-rest hoopoe against the in-rail account menu
 * (owner, 2026-08-03: "the hoopoe goes on top of that ... it doesn't fly away").
 *
 * The 90-120s idle window is waited out for real rather than stubbed. To keep
 * that affordable every trial runs as its own page in one browser and they all
 * idle concurrently, so N trials cost one wait rather than N.
 *
 * SELF-CHECK FIRST. An earlier version of this file reported 9/11 stuck and
 * the verdict was a harness artifact: it never confirmed that the synthetic
 * activity reached the page at all. So each page now installs its own counters
 * on the same six window events the component listens to, and a trial whose
 * activity produced zero events is reported as INVALID rather than as a
 * failure of the thing under test.
 *
 * Usage: node scripts/qa/sidebar-hoopoe-probe.mjs        (dev server on :3000)
 */
import puppeteer from "puppeteer";
import { resolve, dirname, join } from "path";
import { fileURLToPath } from "url";
import { mkdirSync } from "fs";
import { config } from "dotenv";

process.chdir(resolve(dirname(fileURLToPath(import.meta.url)), "../.."));
config({ path: ".env.local" });

const BASE = "http://localhost:3000";
/* How long to watch the departure. Must exceed the exit deadline under test,
   or every trial reads as a hang. Wall-clock, not loop iterations: eleven
   concurrent pages against a dev server make each evaluate() round trip slow
   and irregular, so a `t += 100` counter is nowhere near milliseconds. */
const OBSERVE_MS = Number(process.env.OBSERVE_MS || 20_000);
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
    // Every trial page must stay "visible": the rig pauses its ambient loop on
    // document.hidden, and rAF throttling in a backgrounded tab would stall the
    // flight animations we are timing against.
    "--disable-background-timer-throttling",
    "--disable-backgrounding-occluded-windows",
    "--disable-renderer-backgrounding",
  ],
});

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** The six events sidebar-hoopoe.tsx treats as activity. */
const ACTIVITY_EVENTS = ["pointerdown", "pointermove", "keydown", "wheel", "touchstart", "scroll"];

async function authed(path) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  // Counters go in before any document runs, so they are armed on the real page.
  await page.evaluateOnNewDocument((events) => {
    window.__act = Object.fromEntries(events.map((e) => [e, 0]));
    for (const e of events) {
      window.addEventListener(e, () => { window.__act[e]++; }, { passive: true, capture: true });
    }
  }, ACTIVITY_EVENTS);
  page.on("console", (m) => {
    const t = m.text();
    if (t.includes("[hoopoe] TEMP")) console.log(`    console> ${t}`);
    else if (m.type() === "error") console.log(`    ERR> ${t.slice(0, 400)}`);
  });
  page.on("pageerror", (e) => console.log(`    PAGEERROR> ${String(e).slice(0, 600)}`));
  await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 90_000 });
  await page.evaluate(async (email) => {
    await fetch("/api/auth/admin-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
  }, adminEmail);
  // goto, never a click: a click is activity and would reset the idle timer.
  // domcontentloaded, not networkidle0: with several trial pages against one
  // dev server, networkidle0 blows its 30s budget on compile alone.
  await page.goto(BASE + path, { waitUntil: "domcontentloaded", timeout: 90_000 });
  return page;
}

const counters = (page) => page.evaluate(() => ({ ...window.__act }));
const resetCounters = (page) =>
  page.evaluate(() => { for (const k of Object.keys(window.__act)) window.__act[k] = 0; });

/** Where the bird is, where the account rows are, and how they stack. */
const readRail = (page) =>
  page.evaluate(() => {
    const aside = document.querySelector("aside");
    if (!aside) return { error: "no aside" };
    const bird = aside.querySelector(".hoopoe-mascot");
    const wrap = bird?.parentElement ?? null;
    const ACCOUNT = ["My profile", "Settings", "Admin", "Message the admins", "Sign out"];
    const accountRows = [...aside.querySelectorAll("a[href], button")]
      .map((el) => ({ el, text: el.textContent.trim() }))
      .filter(({ text }) => ACCOUNT.some((a) => text.startsWith(a)))
      .map(({ el, text }) => {
        const r = el.getBoundingClientRect();
        return { text: text.slice(0, 20), top: Math.round(r.top), bottom: Math.round(r.bottom) };
      });
    let birdBox = null;
    if (bird) {
      // The rig draws with overflow:visible and a translated root, so the
      // painted ink matters more than the svg's layout box.
      const b = bird.getBoundingClientRect();
      const root = bird.querySelector("[data-part=root]");
      const rb = root?.getBoundingClientRect();
      birdBox = {
        boxTop: Math.round(b.top),
        inkTop: rb ? Math.round(rb.top) : null,
        inkBottom: rb ? Math.round(rb.bottom) : null,
        inkLeft: rb ? Math.round(rb.left) : null,
      };
    }
    return {
      present: !!bird,
      visibility: document.visibilityState,
      scrollable: document.documentElement.scrollHeight > window.innerHeight + 40,
      birdBox,
      birdZ: wrap ? getComputedStyle(wrap).zIndex : null,
      accountRows,
      accountTop: accountRows.length ? Math.min(...accountRows.map((r) => r.top)) : null,
    };
  });

async function waitForBird(page, capMs = 160_000) {
  const t0 = Date.now();
  while (Date.now() - t0 < capMs) {
    // Tolerate a destroyed execution context: dev-server HMR reloads the page
    // mid-wait, which rejects the in-flight evaluate. That is the harness
    // tripping over the dev server, not a fact about the bird.
    let rail = null;
    try {
      rail = await readRail(page);
    } catch {
      await sleep(1000);
      continue;
    }
    if (rail?.present) return { ...rail, waitedMs: Date.now() - t0 };
    await sleep(1000);
  }
  return { present: false, waitedMs: Date.now() - t0 };
}

async function trial({ name, path, delayMs, act }) {
  const page = await authed(path);
  const arrived = await waitForBird(page);
  if (!arrived.present) {
    await page.close();
    return { name, result: "no-bird" };
  }
  await sleep(delayMs);

  /* Record the departure IN THE PAGE, on rAF, ARMED BEFORE the activity.
     Two harness bugs were fixed to get here and both flattered the result:
     polling over CDP was far too slow and contended to time anything (eleven
     pages against one dev server), and arming the recorder AFTER act() meant
     it reported frames=0 for every bird that had already gone. It is armed
     first now, so the trace can tell apart:
       - flew   : x travels out to about EXIT_X (-200) and then unmounts
       - CUT    : x never moves, then unmounts (the exit deadline firing)
       - popped : unmounts within a frame or two of the activity */
  await page.evaluate((observeMs) => {
    const t0 = performance.now();
    const sel = "aside .hoopoe-mascot";
    window.__trace = { samples: [], removedAt: null, done: false, sawIt: false };
    const tick = () => {
      const rig = document.querySelector(sel);
      const root = rig?.querySelector("[data-part=root]");
      if (root) {
        window.__trace.sawIt = true;
        window.__trace.samples.push([
          Math.round(performance.now() - t0),
          Math.round(root.getBoundingClientRect().left),
        ]);
      } else if (window.__trace.sawIt && window.__trace.removedAt === null) {
        window.__trace.removedAt = Math.round(performance.now() - t0);
        window.__trace.done = true;
        return;
      }
      if (performance.now() - t0 > observeMs) { window.__trace.done = true; return; }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, OBSERVE_MS);

  await resetCounters(page);
  await act(page);
  const fired = await counters(page);

  const t0 = Date.now();
  while (Date.now() - t0 < OBSERVE_MS + 2000) {
    if (await page.evaluate(() => window.__trace.done)) break;
    await sleep(400);
  }
  const trace = await page.evaluate(() => window.__trace);

  const xs = trace.samples.map((s) => s[1]);
  const lastX = xs.length ? xs[xs.length - 1] : null;
  const minX = xs.length ? Math.min(...xs) : null;
  const goneAtMs = trace.removedAt;
  const frames = xs.length;

  const after = await readRail(page);
  const reached = Object.values(fired).reduce((a, b) => a + b, 0);
  // "Departed" means the last frame we saw had it clearly on its way out of
  // the rail; the rig is 60px wide and the rail starts at x=16, so anything
  // still right of 0 was never actually in flight.
  let result;
  if (reached === 0) result = "INVALID";
  else if (after.present) result = "STUCK";
  else if (minX !== null && minX < -100) result = "flew";
  else if (frames <= 3) result = "popped";
  else result = "CUT";
  if (result === "STUCK") await page.screenshot({ path: join(OUT, `hoopoe-stuck-${name}.png`) });
  await page.close();
  return {
    name,
    result,
    waitedMs: arrived.waitedMs,
    visibility: after.visibility,
    fired: Object.fromEntries(Object.entries(fired).filter(([, v]) => v > 0)),
    lastX,
    minX,
    frames,
    goneAtMs,
  };
}

/* --- activity kinds, each verified by the counters above --- */
const moveMouse = async (page) => {
  // steps:N interpolates, so this produces a real stream of pointermove
  await page.mouse.move(700, 400);
  await page.mouse.move(820, 520, { steps: 12 });
};
const scrollWheel = async (page) => {
  await page.mouse.move(700, 400);
  await page.mouse.wheel({ deltaY: 400 });
};
const typeKey = async (page) => { await page.keyboard.press("ArrowDown"); };
const pressAccountPill = async (page) => {
  const btn = await page.$("aside button[aria-expanded]");
  if (!btn) throw new Error("account pill not found");
  await btn.click();
};

const ALL_TRIALS = [
  // activity landing mid fly-in (phase "entering")
  { name: "move-at-1200ms", path: "/feed", delayMs: 1200, act: moveMouse },
  // activity landing while the sleep chord is still settling (phase "asleep")
  { name: "move-at-3200ms", path: "/feed", delayMs: 3200, act: moveMouse },
  // fully settled: the control, and the other activity kinds
  { name: "move-settled", path: "/feed", delayMs: 8000, act: moveMouse },
  { name: "key-settled", path: "/feed", delayMs: 8000, act: typeKey },
  // the owner's exact case: press the account pill, rows expand into the perch
  { name: "pill-settled", path: "/feed", delayMs: 8000, act: pressAccountPill },
];
/* Concurrency is capped because the trial pages share one dev server: at
   eleven the navigations time out and the rAF traces come back distorted,
   which is a measurement problem masquerading as a product one. */
const TRIALS = ALL_TRIALS.slice(0, Number(process.env.N || ALL_TRIALS.length));

console.log(`running ${TRIALS.length} trials concurrently (one ~2min idle wait)\n`);
const results = await Promise.all(TRIALS.map(trial));

let stuck = 0;
let invalid = 0;
let cut = 0;
for (const r of results) {
  if (r.result === "STUCK") stuck++;
  if (r.result === "CUT" || r.result === "popped") cut++;
  if (r.result === "INVALID") invalid++;
  console.log(
    `${r.result.padEnd(7)} ${r.name.padEnd(16)} vis=${r.visibility} ` +
      `minX=${r.minX} lastX=${r.lastX} frames=${r.frames} goneAt=${r.goneAtMs}ms ` +
      `fired=${JSON.stringify(r.fired)}`
  );
}
console.log(`\nSTUCK ${stuck}  CUT ${cut}  / ${results.length}   (invalid: ${invalid})`);

await browser.close();
