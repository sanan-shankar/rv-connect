/**
 * scroll-probe.mjs - regression probe for the two-column rail surfaces
 * (/feed, /catchups, anything else using RAIL_GRID).
 *
 * Asserts two things the owner cares about:
 *   1. WHEEL ROUTING - a wheel with the pointer parked over the RIGHT RAIL
 *      scrolls the page, exactly as it does over the main column. The rail
 *      must never be its own scroll container that eats the gesture.
 *   2. STICKY PINNING - the rail actually stays in view as the page scrolls,
 *      pinned at its `top` offset, instead of scrolling away with the feed.
 *      (A sticky box only travels inside its containing block, so a
 *      height:auto wrapper around it silently gives it zero travel.)
 *
 * Usage:  node scripts/qa/scroll-probe.mjs [url ...]
 *         VH=380 node scripts/qa/scroll-probe.mjs http://localhost:3000/catchups
 *
 * VH forces a short window so a naturally short page still has scroll to test.
 */
import puppeteer from 'puppeteer';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
process.chdir(repoRoot);
config({ path: '.env.local' });

const urls = process.argv.slice(2);
if (urls.length === 0) {
  urls.push('http://localhost:3000/feed', 'http://localhost:3000/catchups');
}

// 1440 wide keeps the 1180px rail breakpoint live (below it the rail is not
// rendered at all, see src/components/layout/rail-grid.ts).
const VIEWPORT = { width: 1440, height: Number(process.env.VH || 700) };

let failures = 0;
const check = (ok, line) => {
  if (!ok) failures += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${line}`);
};

const browser = await puppeteer.launch({
  headless: true,
  executablePath:
    process.env.PUPPETEER_EXECUTABLE_PATH ||
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});
const page = await browser.newPage();
await page.setViewport(VIEWPORT);

await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });
const auth = await page.evaluate(async (email) => {
  const res = await fetch('/api/auth/admin-login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  return res.ok;
}, process.env.ADMIN_EMAIL);
if (!auth) {
  console.error('admin-login failed; is ADMIN_EMAIL set in .env.local?');
  await browser.close();
  process.exit(1);
}

for (const url of urls) {
  console.log(`\n=== ${url}  (${VIEWPORT.width}x${VIEWPORT.height}) ===`);
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
  // Let the feed's client fetch and the entry animations settle before measuring.
  await new Promise((r) => setTimeout(r, 2500));

  const geo = await page.evaluate(() => {
    const aside = document.querySelector('main aside'); // the rail, not the sidebar
    const main = document.querySelector('main');
    const sticky = aside?.querySelector('.sticky') ?? aside;
    if (!aside || !sticky) return null;
    const a = aside.getBoundingClientRect();
    const m = main.getBoundingClientRect();
    const s = sticky.getBoundingClientRect();
    const cb = sticky.parentElement.getBoundingClientRect(); // sticky's containing block
    return {
      scrollable: document.documentElement.scrollHeight > window.innerHeight,
      aside: { x: a.x, w: a.width, h: Math.round(a.height) },
      mainX: m.x,
      stickyH: Math.round(s.height),
      travel: Math.round(cb.height - s.height),
    };
  });

  if (!geo) {
    console.log('  no rail rendered at this width; nothing to probe');
    continue;
  }
  console.log(
    `  rail ${geo.aside.w}x${geo.aside.h}, sticky box ${geo.stickyH}px, sticky travel ${geo.travel}px`
  );
  check(geo.scrollable, `page is scrollable at ${VIEWPORT.height}px tall (precondition)`);
  if (!geo.scrollable) continue;
  check(geo.travel > 0, `sticky rail has room to travel (travel=${geo.travel}px, needs > 0)`);

  // Aim a third of the way down so the point lands inside both columns at any
  // tested viewport height.
  const y = Math.round(VIEWPORT.height / 3);
  const points = [
    ['RAIL', { x: Math.round(geo.aside.x + geo.aside.w / 2), y }],
    ['FEED', { x: Math.round(geo.mainX + 300), y }],
  ];

  for (const [name, pt] of points) {
    // Two wheels: one from the top, one from an already-scrolled position
    // where the rail is pinned (the real-world case).
    for (const start of [0, 200]) {
      await page.evaluate((s) => window.scrollTo(0, s), start);
      await new Promise((r) => setTimeout(r, 300));
      const before = await page.evaluate(() => window.scrollY);
      await page.mouse.move(pt.x, pt.y);
      await page.mouse.wheel({ deltaY: 300 });
      await new Promise((r) => setTimeout(r, 600));
      const after = await page.evaluate(() => window.scrollY);
      const over = await page.evaluate(
        (x, yy) => {
          const el = document.elementFromPoint(x, yy);
          return el
            ? `${el.tagName.toLowerCase()}.${(el.className || '').toString().slice(0, 55)}`
            : 'none';
        },
        pt.x,
        pt.y
      );
      check(
        after > before,
        `wheel over ${name} (${pt.x},${pt.y}) <${over}> moved window.scrollY ${before} -> ${after}`
      );
    }
  }

  // Rail must be pinned, not scrolled off, once past its start offset.
  for (const target of [400, 1200, 2400]) {
    const r = await page.evaluate((t) => {
      window.scrollTo(0, t);
      return new Promise((res) =>
        requestAnimationFrame(() => {
          const el = document.querySelector('main aside .sticky');
          res({
            scrollY: Math.round(window.scrollY),
            top: el ? Math.round(el.getBoundingClientRect().top) : null,
          });
        })
      );
    }, target);
    if (r.scrollY === 0) continue; // page shorter than this target
    check(r.top >= 0, `at scrollY=${r.scrollY} the rail top is ${r.top}px (>= 0 means still visible)`);
  }
}

await browser.close();
console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
