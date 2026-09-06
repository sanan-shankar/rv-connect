import puppeteer from 'puppeteer';
import { existsSync, mkdirSync, readdirSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';
import { devLogin } from "./_dev-login.mjs";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
process.chdir(repoRoot);

// Load .env for ADMIN_EMAIL
config({ path: '.env' });

const args = process.argv.slice(2);
const mobileFlag = args.includes('--mobile');
/* `--full` captures the whole page rather than the first viewport. Added for
   the Catch-ups sketch room (2026-09-06), whose phone drawings are one tall
   page each: a viewport shot showed the first 844px and nothing of the
   answers below the masthead, which was the part being judged.

   One trap, proved the same day: with `--mobile` (deviceScaleFactor 2) a
   page taller than about 8,000 CSS px that contains a `backdrop-filter`
   element captures as blank background from top to bottom, while the DOM
   is fine. The 2x bitmap passes Chrome's 16,384px compositing limit and the
   blurred layer takes the rest with it. Capture such a page at scale 1
   (15,951px came out whole) or in viewport-sized pieces. */
const fullFlag = args.includes('--full');
const filteredArgs = args.filter(a => a !== '--mobile' && a !== '--full');

const url = filteredArgs[0] || 'http://localhost:3000/feed';
const label = filteredArgs[1] || '';

const adminEmail = process.env.ADMIN_EMAIL;
if (!adminEmail) {
  console.error('Error: ADMIN_EMAIL not found in .env');
  process.exit(1);
}

const screenshotsDir = './e2e/.shots';
mkdirSync(screenshotsDir, { recursive: true });

// Auto-increment screenshot number
const existing = existsSync(screenshotsDir)
  ? readdirSync(screenshotsDir).filter(f => f.endsWith('.png'))
  : [];
const nums = existing.map(f => parseInt(f.match(/screenshot-(\d+)/)?.[1] ?? '0')).filter(Boolean);
const next = nums.length > 0 ? Math.max(...nums) + 1 : 1;

const suffix = [label, mobileFlag ? 'mobile' : ''].filter(Boolean).join('-');
const filename = suffix
  ? `screenshot-${next}-${suffix}.png`
  : `screenshot-${next}.png`;
const outPath = join(screenshotsDir, filename);

/* A phone is not a narrow desktop. Without deviceScaleFactor/isMobile/hasTouch
   Chrome keeps desktop pointer semantics at 390px, so `(hover: hover)` matches
   when it should not and `(pointer: coarse)` does not match when it should, and
   the shot shows affordances a phone never draws. screenshot.mjs and
   map-cluster-verify.mjs have had these three since they were written. */
const viewport = mobileFlag
  ? { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true }
  : { width: 1440, height: 900 };

const browser = await puppeteer.launch({
  headless: true,
  executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});

const page = await browser.newPage();
await page.setViewport(viewport);

// Step 1: Authenticate via the local dev-login route
try {
  // Navigate to the base URL first to establish cookie domain
  const baseUrl = new URL(url).origin;
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });

  await devLogin(page, baseUrl, adminEmail);
  console.log('Authenticated successfully');
} catch (e) {
  console.error('Auth error:', e.message);
  await browser.close();
  process.exit(1);
}

// Step 2: Navigate to the target authenticated page
try {
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
} catch {
  // Fallback if networkidle2 times out
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await new Promise(r => setTimeout(r, 3000));
}
// Let streamed/Suspense content (e.g. feed posts) resolve before capture
await new Promise(r => setTimeout(r, 4000));

/* A full-page capture photographs the page as laid out, but every `<img
   loading="lazy">` below the first viewport has not been asked for yet, so
   the shot showed paper-coloured holes where photographs belonged. Walk the
   page a viewport at a time so each one loads, then return to the top. */
if (fullFlag) {
  await page.evaluate(async () => {
    const step = window.innerHeight;
    for (let y = 0; y < document.body.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise(r => setTimeout(r, 120));
    }
    window.scrollTo(0, 0);
  });
  await new Promise(r => setTimeout(r, 2500));
}

// Step 3: Take screenshot
await page.screenshot({ path: outPath, fullPage: fullFlag });
await browser.close();

console.log(`Screenshot saved: ${outPath} (${viewport.width}x${viewport.height})`);
