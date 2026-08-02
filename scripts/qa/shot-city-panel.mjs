/* Drives /directory, opens a city pin's drilldown panel, screenshots it.
 * Usage: node scripts/qa/shot-city-panel.mjs <label> [--mobile] [--dark] */
import puppeteer from 'puppeteer';
import { mkdirSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
process.chdir(repoRoot);
config({ path: '.env.local' });

const args = process.argv.slice(2);
const mobile = args.includes('--mobile');
const dark = args.includes('--dark');
const label = args.filter((a) => !a.startsWith('--'))[0] || 'city';

const adminEmail = process.env.ADMIN_EMAIL;
if (!adminEmail) {
  console.error('ADMIN_EMAIL missing from .env.local');
  process.exit(1);
}

const outDir = './temporary screenshots';
mkdirSync(outDir, { recursive: true });
const name = `city-${label}-${dark ? 'dark' : 'light'}-${mobile ? '390' : '1440'}.png`;
const outPath = join(outDir, name);

const browser = await puppeteer.launch({
  headless: true,
  executablePath:
    process.env.PUPPETEER_EXECUTABLE_PATH ||
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});

const page = await browser.newPage();
page.on('pageerror', (e) => console.log('PAGEERROR:', e.message));
page.on('console', (m) => {
  if (m.type() === 'error') console.log('CONSOLE ERROR:', m.text());
});
await page.setViewport({
  width: mobile ? 390 : 1440,
  height: mobile ? 844 : 900,
  isMobile: mobile,
  hasTouch: mobile,
});

await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded', timeout: 20000 });
const auth = await page.evaluate(async (email) => {
  const res = await fetch('/api/auth/admin-login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  return { ok: res.ok, status: res.status };
}, adminEmail);
if (!auth.ok) {
  console.error('auth failed', auth);
  await browser.close();
  process.exit(1);
}

// Theme is SSR'd off the rv-theme cookie; next-themes reads localStorage on
// the client. Set both so the class does not flip back after hydration.
await page.evaluate((t) => localStorage.setItem('theme', t), dark ? 'dark' : 'light');
await browser.setCookie({
  name: 'rv-theme',
  value: dark ? 'dark' : 'light',
  domain: 'localhost',
  path: '/',
});

await page.goto('http://localhost:3000/directory', { waitUntil: 'networkidle2', timeout: 30000 });
await new Promise((r) => setTimeout(r, 3500));

// The map lives behind the Places tab on the directory client.
const clickedTab = await page.evaluate(() => {
  const el = [...document.querySelectorAll('button, a')].find((b) =>
    /^\s*(places|map)\s*$/i.test(b.textContent || '')
  );
  if (el) {
    el.click();
    return el.textContent.trim();
  }
  return null;
});
console.log('tab:', clickedTab);
await new Promise((r) => setTimeout(r, 2000));

const pin = await page.$('[aria-label$="Open the list."]');
if (!pin) {
  console.error('no city pin found');
  await page.screenshot({ path: join(outDir, `city-${label}-NOPIN.png`) });
  await browser.close();
  process.exit(1);
}
await pin.evaluate((el) => el.dispatchEvent(new MouseEvent('click', { bubbles: true })));
await new Promise((r) => setTimeout(r, 1200));

const surface = await page.evaluate(() => {
  const el = document.querySelector('[data-slot="sheet-content"]');
  if (!el) return null;
  const cs = getComputedStyle(el);
  return {
    background: cs.backgroundColor,
    boxShadow: cs.boxShadow,
    borderRadius: cs.borderTopLeftRadius + ' / ' + cs.borderBottomLeftRadius,
    borderLeft: cs.borderLeftWidth + ' ' + cs.borderLeftColor,
  };
});
console.log('sheet surface:', JSON.stringify(surface));

await page.screenshot({ path: outPath, fullPage: false });
await browser.close();
console.log('saved', outPath);
