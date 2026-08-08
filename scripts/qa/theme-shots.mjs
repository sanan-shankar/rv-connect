/**
 * theme-shots: capture a surface in both themes at both viewports.
 *
 * The existing screenshot-auth.mjs cannot reach dark mode: next-themes persists
 * to localStorage, which the server never sees, so the render truth is the
 * rv-theme cookie (src/lib/theme.ts). This sets it before navigating, and
 * asserts html.dark actually matched afterwards so a silently-light render can
 * never be filed as a dark screenshot.
 *
 *   node scripts/qa/theme-shots.mjs /feed feed
 *   node scripts/qa/theme-shots.mjs /feed feed --menu   # open the account menu first
 */
import puppeteer from 'puppeteer';
import { mkdirSync } from 'fs';
import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
process.chdir(repoRoot);
config({ path: '.env' });

const argv = process.argv.slice(2);
const openMenu = argv.includes('--menu');
const rest = argv.filter((a) => !a.startsWith('--'));
const route = rest[0] || '/feed';
const label = rest[1] || route.replace(/\W+/g, '-').replace(/^-|-$/g, '') || 'root';

const BASE = 'http://localhost:3000';
const outDir = './temporary screenshots';
mkdirSync(outDir, { recursive: true });

const adminEmail = process.env.ADMIN_EMAIL;
if (!adminEmail) { console.error('ADMIN_EMAIL missing'); process.exit(1); }

const browser = await puppeteer.launch({
  headless: true,
  executablePath: process.env.PUPPETEER_EXECUTABLE_PATH
    || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});

for (const theme of ['light', 'dark']) {
  for (const [vp, size] of [['desktop', { width: 1440, height: 900 }], ['mobile', { width: 390, height: 844 }]]) {
    const page = await browser.newPage();
    await page.setViewport(size);
    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.evaluate(async (email) => {
      await fetch('/api/auth/admin-login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
    }, adminEmail);
    await page.setCookie({ name: 'rv-theme', value: theme, url: BASE });
    await page.goto(BASE + route, { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise((r) => setTimeout(r, 900));

    const isDark = await page.evaluate(() => document.documentElement.classList.contains('dark'));
    if ((theme === 'dark') !== isDark) {
      console.error(`THEME MISMATCH: asked ${theme}, html.dark=${isDark} (${vp})`);
    }

    if (openMenu) {
      // On mobile the account chip lives inside the drawer, so open that first.
      if (vp === 'mobile') {
        const burger = await page.$('[aria-label="Open menu"]');
        if (burger) { await burger.click(); await new Promise((r) => setTimeout(r, 550)); }
      }
      // The desktop rail and the mobile drawer both render an account trigger
      // and only one is ever laid out, so pick the one with a real box rather
      // than the first in document order.
      const triggers = await page.$$('[data-slot="dropdown-menu-trigger"]');
      let clicked = false;
      for (const t of triggers) {
        const box = await t.boundingBox();
        if (box && box.width > 4 && box.height > 4) {
          await t.click();
          await new Promise((r) => setTimeout(r, 550));
          clicked = true;
          break;
        }
      }
      if (!clicked) console.error(`no visible menu trigger (${theme}/${vp})`);
    }

    const file = join(outDir, `${label}-${theme}-${vp}.png`);
    await page.screenshot({ path: file });
    console.log(`  ${file}   html.dark=${isDark}`);
    await page.close();
  }
}
await browser.close();
