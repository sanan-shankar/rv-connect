/**
 * hover-probe: measures what a hover ACTUALLY renders, in pixels.
 *
 * Written 2026-08-02 for the state-layer change. The whole point of that
 * change is a perceptual delta, so verifying it by reading class names would
 * prove nothing: `state-layer` paints a translucent background-IMAGE over
 * whatever background-color is already there, and the only honest way to know
 * what the eye gets is to sample the composited result.
 *
 * So for each target this: screenshots the element's box at rest, hovers it,
 * screenshots again, averages the pixels of both frames through sharp, and
 * reports dL* (CIE Lab lightness delta) between them.
 *
 *   |dL*| < 2.0   -> FAIL. Below the just-noticeable difference for a large
 *                   flat area. This is the number that made the owner say
 *                   "the most subtle highlight I've ever seen in my life"
 *                   (the shipped --accent hover measured 2.06 on a card).
 *   2.0 - 3.0     -> WEAK.
 *   > 3.0         -> PASS.
 *
 * Runs both themes: the rv-theme cookie is the server's render truth (see
 * src/lib/theme.ts), so setting it is enough to get a real dark-mode paint
 * rather than a client-side flash.
 *
 *   node scripts/qa/hover-probe.mjs            # both themes, desktop
 *   node scripts/qa/hover-probe.mjs --mobile
 *   node scripts/qa/hover-probe.mjs --theme dark
 */
import puppeteer from 'puppeteer';
import sharp from 'sharp';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';
import { devLogin } from "./_dev-login.mjs";
import { chromePath } from "./_probe-kit.mjs";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
process.chdir(repoRoot);
config({ path: '.env', quiet: true });

const argv = process.argv.slice(2);
const mobile = argv.includes('--mobile');
const themeArg = argv.includes('--theme') ? argv[argv.indexOf('--theme') + 1] : null;
const THEMES = themeArg ? [themeArg] : ['light', 'dark'];
const BASE = 'http://localhost:3000';

const adminEmail = process.env.ADMIN_EMAIL;
if (!adminEmail) { console.error('ADMIN_EMAIL missing from .env'); process.exit(1); }

/* ---- colour maths (same implementation used to derive the tokens) ---- */
const lin = (c) => ((c /= 255) <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const Lstar = ([r, g, b]) => {
  const y = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  return 116 * (y > 0.008856 ? Math.cbrt(y) : 7.787 * y + 16 / 116) - 16;
};
const hexOf = ([r, g, b]) =>
  '#' + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('').toUpperCase();

/**
 * Targets. `open` runs first if the element lives behind a trigger (a menu).
 * A target whose selector is absent is reported as SKIP, never silently
 * dropped: a probe that quietly tests nothing is worse than no probe.
 */
const TARGETS = [
  {
    name: 'composer trigger pill (on its card)',
    route: '/feed',
    sel: 'button[class*="rounded-full"][class*="h-11"]',
    owner: 'no contrast between the pill and the composer tile',
  },
  {
    name: 'sidebar account menu row',
    route: '/feed',
    open: '[data-slot="dropdown-menu-trigger"]',
    sel: '[data-slot="dropdown-menu-item"]',
    owner: 'hovering over all menus has disappeared',
  },
  {
    name: 'drafts strip row',
    route: '/letters',
    sel: 'a[href*="/edit"]',
    owner: 'the drafts tile is way too less contrasted',
  },
  {
    name: 'ghost button',
    route: '/feed',
    sel: 'button[data-slot="button"]',
    owner: 'CTA colour should marginally change on hover',
  },
  {
    name: 'sidebar nav row (idle)',
    route: '/feed',
    sel: 'nav a[href="/directory"]',
    owner: 'sidebar hover',
  },
];

/** Average colour of an element's rendered box, as [r,g,b]. */
async function avgColour(page, box) {
  const clip = {
    x: Math.max(0, Math.round(box.x)),
    y: Math.max(0, Math.round(box.y)),
    width: Math.max(1, Math.round(box.width)),
    height: Math.max(1, Math.round(box.height)),
  };
  const buf = await page.screenshot({ clip });
  const { data, info } = await sharp(buf).raw().toBuffer({ resolveWithObject: true });
  const ch = info.channels;
  let r = 0, g = 0, b = 0, n = 0;
  for (let i = 0; i < data.length; i += ch) { r += data[i]; g += data[i + 1]; b += data[i + 2]; n++; }
  return [r / n, g / n, b / n];
}

const rows = [];

const browser = await puppeteer.launch({
  headless: true,
  executablePath: chromePath(),
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});

for (const theme of THEMES) {
  const page = await browser.newPage();
  await page.setViewport(mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 });

  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 20000 });
  try {
    await devLogin(page, BASE, adminEmail);
  } catch (err) { console.error(err.message); process.exit(1); }

  await page.setCookie({ name: 'rv-theme', value: theme, url: BASE });

  for (const t of TARGETS) {
    const label = `${theme.padEnd(5)} ${t.name}`;
    try {
      await page.goto(BASE + t.route, { waitUntil: 'networkidle2', timeout: 25000 });
      await new Promise((r) => setTimeout(r, 500));

      // Confirm the theme actually took, so a silent light render can't pass as dark.
      const isDark = await page.evaluate(() => document.documentElement.classList.contains('dark'));
      if ((theme === 'dark') !== isDark) {
        rows.push({ label, status: 'THEME-FAIL', note: `html.dark=${isDark}` });
        continue;
      }

      if (t.open) {
        const trigger = await page.$(t.open);
        if (!trigger) { rows.push({ label, status: 'SKIP', note: 'trigger not found' }); continue; }
        await trigger.click();
        await new Promise((r) => setTimeout(r, 450));
      }

      const el = await page.$(t.sel);
      if (!el) { rows.push({ label, status: 'SKIP', note: 'element not found' }); continue; }
      const box = await el.boundingBox();
      if (!box || box.width < 2 || box.height < 2) {
        rows.push({ label, status: 'SKIP', note: 'no box' }); continue;
      }

      // Rest: park the pointer far away so nothing is incidentally hovered.
      await page.mouse.move(5, 5);
      await new Promise((r) => setTimeout(r, 250));
      const rest = await avgColour(page, box);

      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await new Promise((r) => setTimeout(r, 250));
      const hov = await avgColour(page, box);

      const d = Lstar(hov) - Lstar(rest);
      const status = Math.abs(d) < 2 ? 'FAIL' : Math.abs(d) < 3 ? 'WEAK' : 'PASS';
      rows.push({
        label, status,
        note: `dL* ${d >= 0 ? '+' : ''}${d.toFixed(2)}  rest ${hexOf(rest)} -> hover ${hexOf(hov)}`,
      });
    } catch (e) {
      rows.push({ label, status: 'ERROR', note: String(e.message).slice(0, 90) });
    }
  }
  await page.close();
}

await browser.close();

console.log(`\nhover probe  (${mobile ? 'mobile 390' : 'desktop 1440'})`);
console.log('='.repeat(96));
for (const r of rows) {
  const mark = { PASS: 'PASS', WEAK: 'WEAK', FAIL: 'FAIL' }[r.status] || r.status;
  console.log(`  ${mark.padEnd(11)} ${r.label.padEnd(46)} ${r.note || ''}`);
}
const bad = rows.filter((r) => r.status === 'FAIL' || r.status === 'THEME-FAIL');
console.log('='.repeat(96));
console.log(`  ${rows.filter(r => r.status === 'PASS').length} pass, ` +
  `${rows.filter(r => r.status === 'WEAK').length} weak, ${bad.length} fail, ` +
  `${rows.filter(r => r.status === 'SKIP').length} skipped\n`);
process.exit(bad.length ? 1 : 0);
