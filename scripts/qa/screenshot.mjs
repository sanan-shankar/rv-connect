import puppeteer from 'puppeteer';
import { existsSync, mkdirSync, readdirSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
process.chdir(repoRoot);

const url = process.argv[2] || 'http://localhost:3000';
// Flags are filtered out so `screenshot.mjs <url> --mobile` (no label) cannot
// end up with a file called "screenshot-7---mobile.png".
const label = (process.argv[3] || '').startsWith('--') ? '' : process.argv[3] || '';

const screenshotsDir = './e2e/.shots';
mkdirSync(screenshotsDir, { recursive: true });

// Auto-increment screenshot number
const existing = existsSync(screenshotsDir)
  ? readdirSync(screenshotsDir).filter(f => f.endsWith('.png'))
  : [];
const nums = existing.map(f => parseInt(f.match(/screenshot-(\d+)/)?.[1] ?? '0')).filter(Boolean);
const next = nums.length > 0 ? Math.max(...nums) + 1 : 1;
const filename = label
  ? `screenshot-${next}-${label}.png`
  : `screenshot-${next}.png`;
const outPath = join(screenshotsDir, filename);

// The bundled Chromium can be missing/broken on some machines; fall back to a
// locally installed Chrome (override with PUPPETEER_EXECUTABLE_PATH).
const chromeCandidates = [
  process.env.PUPPETEER_EXECUTABLE_PATH,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].filter(Boolean);
const executablePath = chromeCandidates.find(p => existsSync(p));

const browser = await puppeteer.launch({
  headless: true,
  executablePath, // undefined => puppeteer's bundled browser
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});
const page = await browser.newPage();
// `--mobile` gives the same 390x844 iPhone viewport screenshot-auth.mjs uses
// (true since 2026-09-05; until then that script set the size and none of the
// three pointer properties, so its "mobile" shots had desktop hover semantics),
// so a public page can be checked at both sizes without going through the
// admin bypass. It was documented in the CLAUDE.md table but only ever
// implemented in the auth variant, so passing it here was silently ignored
// and produced a desktop shot labelled as mobile.
const mobile = process.argv.includes('--mobile');
await page.setViewport(
  mobile
    ? { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true }
    : { width: 1440, height: 900 },
);

try {
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
} catch {
  // Fallback if networkidle2 times out
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await new Promise(r => setTimeout(r, 2000));
}

await page.screenshot({ path: outPath, fullPage: false });
await browser.close();

console.log(`Screenshot saved: ${outPath}`);
