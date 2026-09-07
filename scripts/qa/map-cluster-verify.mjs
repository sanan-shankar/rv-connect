/**
 * Directory map: cluster-resolution + touch-target verification.
 *
 * Drives the REAL map (not a mock): dev-login, /directory, map view, then
 * wheel-zooms to the map's own maximum over the Delhi / Gurgaon area and
 * asserts, in code:
 *
 *   1. at max zoom NO cluster (blue) pin is left anywhere on the map, i.e.
 *      every aggregate has resolved into individual city pins;
 *   2. no two city pins' hit discs overlap, at max zoom OR at any zoom stop
 *      on the way there;
 *   3. on a coarse pointer every hit disc is at least 44 CSS px across.
 *
 * Run:  node scripts/qa/map-cluster-verify.mjs [--mobile] [--shot]
 */
import puppeteer from "puppeteer";
import { mkdirSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { config } from "dotenv";
import { devLogin } from "./_dev-login.mjs";
import { chromePath } from "./_probe-kit.mjs";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
process.chdir(repoRoot);
config({ path: ".env", quiet: true });

const argv = process.argv.slice(2);
const mobile = argv.includes("--mobile");
const wantShot = argv.includes("--shot");
const base = "http://localhost:3000";
const adminEmail = process.env.ADMIN_EMAIL;
if (!adminEmail) {
  console.error("ADMIN_EMAIL missing from .env");
  process.exit(1);
}

// Delhi in the map's own base (unzoomed) projection units, from
// geoNaturalEarth1().fitExtent([[8,8],[892,452]], sphere) applied to [77.21, 28.61].
const DELHI_BASE = [626.027, 151.255];
const TAP_MIN_PX = 44;

const browser = await puppeteer.launch({
  headless: true,
  executablePath: chromePath(),
  args: ["--no-sandbox", "--disable-setuid-sandbox"],
});
const page = await browser.newPage();
await page.setViewport(
  mobile
    ? { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }
    : { width: 1440, height: 900 }
);
if (mobile) {
  await page.setUserAgent(
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
  );
}

const fail = [];
const note = (m) => console.log(m);

await page.goto(base, { waitUntil: "domcontentloaded", timeout: 20000 });
try {
  await devLogin(page, base, adminEmail);
} catch (err) {
  console.error(err.message);
  await browser.close();
  process.exit(1);
}

page.on("pageerror", (e) => fail.push(`pageerror: ${e.message}`));
page.on("console", (m) => {
  if (m.type() === "error") fail.push(`console.error: ${m.text()}`);
});

await page.goto(`${base}/directory`, { waitUntil: "networkidle0", timeout: 40000 });
// The zero-filter browse opens on the Map, but click the toggle if it did not.
const onMap = await page.$('svg[aria-label*="World map"]');
if (!onMap) {
  await page.evaluate(() => {
    const b = [...document.querySelectorAll("button")].find((el) => el.textContent?.trim() === "Map");
    b?.click();
  });
}
await page.waitForSelector('svg[aria-label*="World map"]', { timeout: 15000 });

// pointer:coarse is what arms the 44px tap discs; prove the emulation took.
const coarse = await page.evaluate(() => window.matchMedia("(pointer: coarse)").matches);
note(`viewport ${mobile ? "390x844" : "1440x900"}  pointer:coarse=${coarse}`);
if (mobile && !coarse) fail.push("touch emulation did not produce pointer:coarse");

const readState = () =>
  page.evaluate(() => {
    const svg = document.querySelector('svg[aria-label*="World map"]');
    const g = svg.querySelector("g");
    const k = Number(/scale\(([\d.]+)\)/.exec(g.getAttribute("transform"))?.[1] ?? "1");
    const markers = [...g.querySelectorAll('g[role="button"]')].map((el) => {
      // First circle in each marker is the transparent hit disc.
      const r = el.querySelector("circle").getBoundingClientRect();
      return {
        label: el.getAttribute("aria-label") ?? "",
        cluster: (el.getAttribute("aria-label") ?? "").startsWith("Zoom in to"),
        cx: r.x + r.width / 2,
        cy: r.y + r.height / 2,
        r: r.width / 2,
      };
    });
    return { k, markers };
  });

/** Screen position of a base-projection point, through the live map transform. */
const screenOf = (bx, by) =>
  page.evaluate(
    (x, y) => {
      const g = document.querySelector('svg[aria-label*="World map"] > g');
      const p = new DOMPoint(x, y).matrixTransform(g.getScreenCTM());
      return { x: p.x, y: p.y };
    },
    bx,
    by
  );

function overlaps(markers) {
  const bad = [];
  for (let i = 0; i < markers.length; i++) {
    for (let j = i + 1; j < markers.length; j++) {
      const a = markers[i];
      const b = markers[j];
      const d = Math.hypot(a.cx - b.cx, a.cy - b.cy);
      // 0.5px slack: sub-pixel rounding in getBoundingClientRect, not a real gap.
      if (d + 0.5 < a.r + b.r) {
        bad.push(
          `${a.label.slice(0, 40)} <-> ${b.label.slice(0, 40)}: gap ${d.toFixed(1)}px, needs ${(
            a.r + b.r
          ).toFixed(1)}px`
        );
      }
    }
  }
  return bad;
}

let s = await readState();
note(`start: k=${s.k.toFixed(2)}  markers=${s.markers.length} (clusters ${s.markers.filter((m) => m.cluster).length})`);

// PHASE A - the owner's actual flow: keep clicking the blue pin over the NCR
// and expect it to break into New Delhi and Gurugram. Every click must move the
// zoom (a click that does nothing is the reported bug).
const shotDir = "./e2e/.shots";
if (wantShot) mkdirSync(shotDir, { recursive: true });
const shot = async (name) => {
  if (!wantShot) return;
  const out = `${shotDir}/map-${name}-${mobile ? "390" : "1440"}.png`;
  await page.screenshot({ path: out });
  note(`shot: ${out}`);
};
await shot("world");

const wanted = ["New Delhi", "Gurugram"];
const hasBoth = (st) => wanted.every((w) => st.markers.some((m) => !m.cluster && m.label.startsWith(w + " ")));
let clicks = 0;
const trail = [];
while (clicks < 8 && !hasBoth(s)) {
  const p = await screenOf(DELHI_BASE[0], DELHI_BASE[1]);
  const near = s.markers
    .filter((m) => m.cluster)
    .sort((a, b) => Math.hypot(a.cx - p.x, a.cy - p.y) - Math.hypot(b.cx - p.x, b.cy - p.y))[0];
  if (!near) break;
  const vp = page.viewport();
  if (near.cx < 0 || near.cy < 0 || near.cx > vp.width || near.cy > vp.height) {
    fail.push(`cluster to click sits off screen at ${near.cx.toFixed(0)},${near.cy.toFixed(0)}`);
    break;
  }
  const before = s.k;
  await page.mouse.click(near.cx, near.cy);
  await new Promise((r) => setTimeout(r, 250));
  s = await readState();
  clicks++;
  trail.push(`${before.toFixed(1)}->${s.k.toFixed(1)}`);
  await shot(`click${clicks}`);
  if (s.k <= before + 1e-6) {
    fail.push(`ASSERT 0 FAILED: clicking "${near.label}" at k=${before.toFixed(1)} did not zoom`);
    break;
  }
}
note(`cluster clicks: ${clicks} (${trail.join(", ")})`);
if (hasBoth(s)) {
  note(`ASSERT 0 PASS: New Delhi and Gurugram are separate green pins after ${clicks} cluster click(s)`);
} else {
  fail.push(`ASSERT 0 FAILED: New Delhi / Gurugram never resolved after ${clicks} cluster clicks`);
}

// Back to the top for the zoom sweep.
await page.reload({ waitUntil: "networkidle0" });
await page.waitForSelector('svg[aria-label*="World map"]', { timeout: 15000 });
s = await readState();

// PHASE B - wheel-zoom anchored on Delhi until the map refuses to go further.
let steps = 0;
let lastK = -1;
const stops = [];
while (steps < 90) {
  const p = await screenOf(DELHI_BASE[0], DELHI_BASE[1]);
  const inside = p.x > 0 && p.y > 0 && p.x < page.viewport().width && p.y < page.viewport().height;
  const at = inside ? p : { x: page.viewport().width / 2, y: page.viewport().height / 2 };
  await page.mouse.move(at.x, at.y);
  await page.mouse.wheel({ deltaY: -240 });
  await new Promise((r) => setTimeout(r, 60));
  s = await readState();
  steps++;
  if (steps % 6 === 0) {
    const bad = overlaps(s.markers.filter((m) => !m.cluster));
    stops.push({ k: s.k, clusters: s.markers.filter((m) => m.cluster).length, bad: bad.length });
    if (bad.length) fail.push(`overlap at k=${s.k.toFixed(1)}: ${bad[0]}`);
  }
  if (Math.abs(s.k - lastK) < 1e-6) break; // scaleExtent reached
  lastK = s.k;
}

note(`zoom stops: ${stops.map((x) => `k=${x.k.toFixed(1)}/cl=${x.clusters}/ov=${x.bad}`).join("  ")}`);
note(`max zoom reached: k=${s.k.toFixed(2)} after ${steps} wheel steps`);

const clusters = s.markers.filter((m) => m.cluster);
const cities = s.markers.filter((m) => !m.cluster);
note(`at max zoom: ${clusters.length} cluster pins, ${cities.length} city pins`);
if (clusters.length) {
  fail.push(`ASSERT 1 FAILED: ${clusters.length} cluster pin(s) survive max zoom, e.g. "${clusters[0].label}"`);
} else {
  note("ASSERT 1 PASS: no cluster pin survives max zoom");
}

const bad = overlaps(cities);
if (bad.length) {
  fail.push(`ASSERT 2 FAILED: ${bad.length} overlapping city pin pair(s): ${bad.slice(0, 3).join(" | ")}`);
} else {
  note(`ASSERT 2 PASS: 0 overlapping hit discs across ${cities.length} city pins`);
}

const small = cities.filter((m) => m.r * 2 < TAP_MIN_PX - 0.5);
if (coarse) {
  if (small.length) {
    fail.push(
      `ASSERT 3 FAILED: ${small.length} tap target(s) under ${TAP_MIN_PX}px, smallest ${(
        Math.min(...small.map((m) => m.r)) * 2
      ).toFixed(1)}px`
    );
  } else {
    note(
      `ASSERT 3 PASS: every tap disc >= ${TAP_MIN_PX}px (smallest ${(
        Math.min(...cities.map((m) => m.r)) * 2
      ).toFixed(1)}px)`
    );
  }
}

// Near-Delhi sanity: name the cities that resolved out of the old blue blob.
const named = cities
  .map((m) => ({ d: Math.hypot(m.cx - 0, m.cy - 0), label: m.label.split(" - ")[0] }))
  .map((m) => m.label);
note(`resolved city pins in the DOM at max zoom: ${named.slice(0, 12).join(", ")}${named.length > 12 ? " ..." : ""}`);

await shot("maxzoom");

// PHASE C - full screen swaps the <svg> for a fresh node. The view must survive
// that swap (it used to snap back to the whole world on the next gesture) and
// the new box, which changes the pin scale, must not leave anything overlapping.
const kBefore = s.k;
const delhiBefore = await screenOf(DELHI_BASE[0], DELHI_BASE[1]);
await page.evaluate(() => {
  document.querySelector('button[aria-label="View full screen"]')?.click();
});
await new Promise((r) => setTimeout(r, 400));
// The telling move is a GESTURE after the swap: d3 keeps its own copy of the
// transform on the DOM node, so a fresh node that was not re-seeded reports
// k=1 the moment you touch it, however the map is currently painted.
await page.mouse.move(page.viewport().width / 2, page.viewport().height / 2);
await page.mouse.wheel({ deltaY: -1 });
await new Promise((r) => setTimeout(r, 200));
s = await readState();
note(`full screen + one wheel notch: k=${kBefore.toFixed(1)} -> ${s.k.toFixed(1)}`);
// Leaving the inline box for a bigger one lowers the ceiling a little (bigger
// px-per-unit), so the clamp may pull k down; it must never bounce back to 1.
// Scale alone is not enough: a re-seed that keeps k but drops the pan would
// leave Delhi hundreds of screens away, so check the point is still in view.
const delhiAfter = await screenOf(DELHI_BASE[0], DELHI_BASE[1]);
const vpFs = page.viewport();
const stillVisible =
  delhiAfter.x > 0 && delhiAfter.y > 0 && delhiAfter.x < vpFs.width && delhiAfter.y < vpFs.height;
note(
  `  Delhi on screen ${delhiBefore.x.toFixed(0)},${delhiBefore.y.toFixed(0)} -> ` +
    `${delhiAfter.x.toFixed(0)},${delhiAfter.y.toFixed(0)} (visible=${stillVisible})`
);
if (s.k < kBefore * 0.5 || !stillVisible) {
  fail.push(
    `ASSERT 4 FAILED: full screen threw the view away (k ${kBefore.toFixed(1)} -> ${s.k.toFixed(
      1
    )}, Delhi at ${delhiAfter.x.toFixed(0)},${delhiAfter.y.toFixed(0)})`
  );
} else {
  note("ASSERT 4 PASS: full screen kept the view");
}
const fsBad = overlaps(s.markers.filter((m) => !m.cluster));
if (fsBad.length) fail.push(`ASSERT 4b FAILED: overlap in full screen: ${fsBad[0]}`);
else note(`ASSERT 4b PASS: 0 overlaps in full screen (${s.markers.length} pins)`);
await shot("fullscreen");

await browser.close();
if (fail.length) {
  console.error("\nFAILURES:");
  for (const f of fail) console.error(" - " + f);
  process.exit(1);
}
console.log("\nALL ASSERTIONS PASSED");
