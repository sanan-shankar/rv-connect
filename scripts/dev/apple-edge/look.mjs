/* Photograph a lab room close enough to judge it.
 *
 * The rooms draw tiles at 132px, which is too small to see a three pixel band
 * in. This shoots every element matching a selector at 4x, one file each, so
 * the hoopoe's crest tips can be looked at rather than reasoned about.
 *
 *   node scripts/dev/apple-edge/look.mjs <route> [selector] [indexes...]
 *   node scripts/dev/apple-edge/look.mjs /lab/glass-edges .row 4 5
 *   node scripts/dev/apple-edge/look.mjs /lab/hoopoe-marks .tips
 */
import puppeteer from 'puppeteer';
import { config } from 'dotenv';
import { mkdirSync } from 'fs';
import { devLogin } from '../../qa/_dev-login.mjs';
import { chromePath } from '../../qa/_probe-kit.mjs';

config({ path: '.env', quiet: true });
/* Beside the other scratch shots, never at the repo root. `.tmp-shots/`
   lived in the root until 2026-09-07 -- the one script still breaking the
   closed-root rule, and a second place a session had to know to look. */
const OUT = 'e2e/.shots/edge';
mkdirSync(OUT, { recursive: true });

const browser = await puppeteer.launch({
  headless: true,
  executablePath: chromePath(),
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});
const page = await browser.newPage();
await page.setViewport({ width: 1500, height: 1000, deviceScaleFactor: 4 });
await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded', timeout: 20000 });
await devLogin(page, 'http://localhost:3000', process.env.ADMIN_EMAIL);
const [route = '/lab/glass-edges', selector = '.row', ...idx] = process.argv.slice(2);
await page.goto(`http://localhost:3000${route}`, { waitUntil: 'networkidle2', timeout: 45000 });
await new Promise(r => setTimeout(r, 1200));

const stem = selector.replace(/\W+/g, '') || 'el';
const rows = await page.$$(selector);
const wanted = idx.map(Number);
for (let i = 0; i < rows.length; i++) {
  if (wanted.length && !wanted.includes(i)) continue;
  const tag = await rows[i].$eval('.tag', el => el.textContent.trim()).catch(() => '');
  // String(i): index 0 is falsy, and filter(Boolean) silently ate it, so row 0
  // kept overwriting a different file and read back stale for two rounds.
  const name = [stem, String(i), tag.replace(/\W+/g, '-')].filter(Boolean).join('-');
  await rows[i].screenshot({ path: `${OUT}/${name}.png` });
}
console.log(`${rows.length} matched ${selector}; wrote ${wanted.length || rows.length} to ${OUT}`);
await browser.close();
