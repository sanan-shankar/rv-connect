/**
 * facet-hover-probe: measures the ACTUAL rendered hover of the rows inside
 * every filter dropdown on /directory and /collection.
 *
 * Written 2026-08-02 after the owner reported that the facet dropdowns still
 * show nothing on hover, against a migration that had been reported done. The
 * technique is copied from scripts/qa/hover-probe.mjs: screenshot the row's
 * box at rest, hover it, screenshot again, average both through sharp, report
 * dL* (CIE Lab lightness delta). |dL*| < 2.0 is a FAIL (below the
 * just-noticeable difference on a large flat area).
 *
 * Two things this probe has to get right or it lies:
 * - Base UI leaves a CLOSED popup mounted in the portal, so "the first popup
 *   in the DOM" is usually the previous facet's corpse. Popups are therefore
 *   filtered to the one that is actually painted (non-zero client rect).
 * - Each page renders its facet bar twice, once for the desktop rail and once
 *   inside the mobile FilterSheet. The hidden copy's triggers are unclickable,
 *   so triggers are filtered to the ones with a real box too.
 *
 *   node scripts/qa/facet-hover-probe.mjs
 *   node scripts/qa/facet-hover-probe.mjs --theme dark
 *   node scripts/qa/facet-hover-probe.mjs --mobile
 */
import puppeteer from 'puppeteer';
import sharp from 'sharp';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
process.chdir(repoRoot);
config({ path: '.env.local' });

const argv = process.argv.slice(2);
const mobile = argv.includes('--mobile');
const themeArg = argv.includes('--theme') ? argv[argv.indexOf('--theme') + 1] : null;
const THEMES = themeArg ? [themeArg] : ['light', 'dark'];
const BASE = 'http://localhost:3000';

const adminEmail = process.env.ADMIN_EMAIL;
if (!adminEmail) { console.error('ADMIN_EMAIL missing from .env.local'); process.exit(1); }

const lin = (c) => ((c /= 255) <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const Lstar = ([r, g, b]) => {
  const y = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  return 116 * (y > 0.008856 ? Math.cbrt(y) : 7.787 * y + 16 / 116) - 16;
};
const hexOf = ([r, g, b]) =>
  '#' + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('').toUpperCase();

async function avgColour(page, box) {
  const clip = {
    x: Math.max(0, Math.round(box.x)),
    y: Math.max(0, Math.round(box.y)),
    width: Math.max(1, Math.round(box.width)),
    height: Math.max(1, Math.round(box.height)),
  };
  /* captureBeyondViewport MUST be false. Puppeteer's default for a clipped
     shot is true, which drives Emulation.setDeviceMetricsOverride, and that
     resets Blink's hover state mid-capture: the frame comes back UNHOVERED and
     the probe scores a real hover as dL* 0.00. Verified 2026-08-02 by reading
     getComputedStyle before and after the call. scripts/qa/hover-probe.mjs has
     the same defect and needs the same one-line fix. */
  const buf = await page.screenshot({ clip, captureBeyondViewport: false });
  const { data, info } = await sharp(buf).raw().toBuffer({ resolveWithObject: true });
  const ch = info.channels;
  let r = 0, g = 0, b = 0, n = 0;
  for (let i = 0; i < data.length; i += ch) { r += data[i]; g += data[i + 1]; b += data[i + 2]; n++; }
  return [r / n, g / n, b / n];
}

/* Base UI gives its select popup role=listbox and its popover popup
   role=dialog; neither carries a data-slot here because the facet kit renders
   the primitives directly (pill-shell.tsx). */
const POPUP_SEL = '[role="listbox"],[role="dialog"]';
/* Anything inside a panel a person can point at: select option rows, the
   search-panel's rows, and the Batch panel's decade chips. */
const ROW_SEL = '[role="option"],button[type="button"]';

/** The popup a given trigger just opened.
 *
 *  Two exclusions, both learned the hard way:
 *  - closed-but-mounted popups. Base UI leaves the previous facet's popup in
 *    the portal, so "the first match in the DOM" is usually a corpse.
 *  - the popup the trigger LIVES IN. On mobile every facet sits inside the
 *    FilterSheet, which is itself role="dialog"; without this the probe
 *    measures the sheet's own buttons and reports on a dropdown it never
 *    opened. Later portals mount later, hence the reverse walk. */
async function openedPopup(page, trigger) {
  const all = await page.$$(POPUP_SEL);
  for (let i = all.length - 1; i >= 0; i--) {
    const p = all[i];
    const box = await p.boundingBox();
    if (!box || box.width < 4 || box.height < 4) continue;
    if (trigger && (await p.evaluate((el, t) => el.contains(t), trigger))) continue;
    return p;
  }
  return null;
}

const rows = [];
const browser = await puppeteer.launch({
  headless: true,
  executablePath: process.env.PUPPETEER_EXECUTABLE_PATH
    || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});

for (const theme of THEMES) {
  const page = await browser.newPage();
  await page.setViewport(mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 });
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 20000 });
  const ok = await page.evaluate(async (email) => {
    const res = await fetch('/api/auth/admin-login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    return res.ok;
  }, adminEmail);
  if (!ok) { console.error('admin-login failed'); process.exit(1); }
  await page.setCookie({ name: 'rv-theme', value: theme, url: BASE });

  for (const route of ['/directory', '/collection']) {
    await page.goto(BASE + route, { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise((r) => setTimeout(r, 900));

    const isDark = await page.evaluate(() => document.documentElement.classList.contains('dark'));
    if ((theme === 'dark') !== isDark) {
      rows.push({ label: `${theme} ${route}`, status: 'THEME-FAIL', note: `html.dark=${isDark}` });
      continue;
    }

    /* Reveal every facet before counting. Two of Directory's six live behind
       "More filters" on desktop and ALL of them live inside the modal
       FilterSheet on mobile, so a probe that only walks the resting bar tests
       two thirds of the kit and calls it the kit. The sheet matters most: its
       facets portal their popups to <body>, outside the dialog, which is
       exactly where a modal's pointer-events guard would eat a hover. */
    await page.evaluate((label) => {
      const b = [...document.querySelectorAll('button')]
        .find((e) => e.textContent.trim().startsWith(label) && e.getBoundingClientRect().width > 4);
      b?.click();
    }, mobile ? 'Filters' : 'More filters');
    await new Promise((r) => setTimeout(r, 800));

    /* Visible AND on top: on mobile the desktop bar's triggers still have a
       box behind the open sheet, and clicking one throws. elementFromPoint is
       the only test that distinguishes "rendered" from "reachable". */
    const visible = `[...document.querySelectorAll('[data-facet-trigger]')].filter((e) => {
      const r = e.getBoundingClientRect();
      if (r.width < 4) return false;
      const top = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
      return !!top && (e === top || e.contains(top));
    })`;
    const count = await page.evaluate(`(${visible}).length`);

    for (let i = 0; i < count; i++) {
      // Re-query every pass: opening a facet can re-render the whole bar.
      const handle = await page.evaluateHandle(`(${visible})[${i}] ?? null`);
      const trig = handle.asElement();
      if (!trig) continue;

      const name = await trig.evaluate((e) => e.textContent.trim().slice(0, 22));
      const base = `${theme.padEnd(5)} ${route.padEnd(11)} ${name}`;

      try {
        await trig.evaluate((e) => e.scrollIntoView({ block: 'center' }));
        await new Promise((r) => setTimeout(r, 150));
        await trig.click();
        await new Promise((r) => setTimeout(r, 500));

        const popup = await openedPopup(page, trig);
        if (!popup) { rows.push({ label: base, status: 'SKIP', note: 'no popup opened' }); continue; }

        const handles = await popup.$$(ROW_SEL);
        if (!handles.length) { rows.push({ label: base, status: 'SKIP', note: 'popup has no rows' }); continue; }

        /* EVERY row, not a sample. This sliced to `handles.slice(1, 4)`, so a
           23-row House list was tested at 3 rows and the summary still read as
           full coverage: a probe that would report clean against a real
           regression. Row 0 is still skipped, and only row 0, because Base UI
           opens a select with the current value already highlighted, so it is
           lit at rest and would score a false 0. */
        const picks = handles.slice(1);
        for (let k = 0; k < picks.length; k++) {
          const target = picks[k];
          const rowText = await target.evaluate((e) => e.textContent.trim().slice(0, 18));
          const label = `${base} > ${rowText}`;
          const box = await target.boundingBox();
          if (!box || box.height < 2) { rows.push({ label, status: 'SKIP', note: 'row has no box' }); continue; }

          // Rest: park the pointer outside the popup, then prove it survived.
          const park = mobile ? [385, 838] : [1435, 890];
          await page.mouse.move(park[0], park[1]);
          await new Promise((r) => setTimeout(r, 260));
          if (!(await openedPopup(page, trig))) { rows.push({ label, status: 'SKIP', note: 'popup closed on park' }); continue; }
          const rest = await avgColour(page, box);

          await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
          await new Promise((r) => setTimeout(r, 300));
          const hov = await avgColour(page, box);

          const state = await target.evaluate((e) => {
            const cs = getComputedStyle(e);
            return (e.hasAttribute('data-highlighted') ? 'hl ' : '') +
              (cs.backgroundImage === 'none' ? 'no-bgi' : 'bgi');
          });

          const d = Lstar(hov) - Lstar(rest);
          const status = Math.abs(d) < 2 ? 'FAIL' : Math.abs(d) < 3 ? 'WEAK' : 'PASS';
          rows.push({
            label, status,
            note: `dL* ${d >= 0 ? '+' : ''}${d.toFixed(2)}  ${hexOf(rest)} -> ${hexOf(hov)}  [${state}]`,
          });
        }

        /* Keyboard, not just pointer. The searchable panels (City, House,
           "Part of school") are plain <button> lists in a Popover: nothing
           marks them `data-highlighted`, so they are the one row type in the
           kit that depends on `:focus-visible`, and on 2026-08-02 they had
           `outline-none` with no replacement and measured dL* 0.00 -- real
           focus, zero paint. Only run where Tab is deterministic: a panel with
           a search input autofocuses it, so Tab, Tab lands on row index 1.
           Anything else is reported SKIP rather than guessed at. */
        const hasSearchInput = await popup.evaluate((e) => !!e.querySelector('input'));
        if (hasSearchInput && handles.length > 1) {
          const target = handles[1];
          const rowText = await target.evaluate((e) => e.textContent.trim().slice(0, 18));
          const label = `${base} > ${rowText} (kbd)`;
          const box = await target.boundingBox();
          const park = mobile ? [385, 838] : [1435, 890];
          await page.mouse.move(park[0], park[1]);
          await new Promise((r) => setTimeout(r, 260));
          const rest = await avgColour(page, box);

          await page.keyboard.press('Tab');
          await page.keyboard.press('Tab');
          await new Promise((r) => setTimeout(r, 260));
          const landed = await target.evaluate((e) => e === document.activeElement);
          if (!landed) {
            rows.push({ label, status: 'SKIP', note: 'Tab did not land on this row' });
          } else {
            const kb = await avgColour(page, box);
            const d = Lstar(kb) - Lstar(rest);
            const status = Math.abs(d) < 2 ? 'FAIL' : Math.abs(d) < 3 ? 'WEAK' : 'PASS';
            rows.push({
              label, status,
              note: `dL* ${d >= 0 ? '+' : ''}${d.toFixed(2)}  ${hexOf(rest)} -> ${hexOf(kb)}  [focus]`,
            });
          }
        }

        await page.keyboard.press('Escape');
        await new Promise((r) => setTimeout(r, 350));
      } catch (e) {
        rows.push({ label: base, status: 'ERROR', note: String(e.message).slice(0, 80) });
        await page.keyboard.press('Escape').catch(() => {});
        await new Promise((r) => setTimeout(r, 300));
      }
    }
  }
  await page.close();
}

await browser.close();

console.log(`\nfacet hover probe  (${mobile ? 'mobile 390' : 'desktop 1440'})`);
console.log('='.repeat(112));
for (const r of rows) console.log(`  ${r.status.padEnd(6)} ${r.label.padEnd(52)} ${r.note || ''}`);
console.log('='.repeat(112));
const bad = rows.filter((r) => r.status === 'FAIL' || r.status === 'THEME-FAIL');
console.log(`  ${rows.filter((r) => r.status === 'PASS').length} pass, ` +
  `${rows.filter((r) => r.status === 'WEAK').length} weak, ${bad.length} fail, ` +
  `${rows.filter((r) => r.status === 'SKIP').length} skip, ` +
  `${rows.filter((r) => r.status === 'ERROR').length} error\n`);
process.exit(bad.length ? 1 : 0);
