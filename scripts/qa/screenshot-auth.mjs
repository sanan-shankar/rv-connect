import puppeteer from 'puppeteer';
import { existsSync, mkdirSync, readdirSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
process.chdir(repoRoot);

// Load .env.local for ADMIN_EMAIL
config({ path: '.env.local' });

const args = process.argv.slice(2);
const mobileFlag = args.includes('--mobile');
const filteredArgs = args.filter(a => a !== '--mobile');

const url = filteredArgs[0] || 'http://localhost:3000/feed';
const label = filteredArgs[1] || '';

const adminEmail = process.env.ADMIN_EMAIL;
if (!adminEmail) {
  console.error('Error: ADMIN_EMAIL not found in .env.local');
  process.exit(1);
}

const screenshotsDir = './temporary screenshots';
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

const viewport = mobileFlag
  ? { width: 390, height: 844 }
  : { width: 1440, height: 900 };

const browser = await puppeteer.launch({
  headless: true,
  executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});

const page = await browser.newPage();
await page.setViewport(viewport);

// Step 1: Authenticate via admin-login API
try {
  // Navigate to the base URL first to establish cookie domain
  const baseUrl = new URL(url).origin;
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });

  // Call the admin-login endpoint
  const authResult = await page.evaluate(async (email) => {
    const res = await fetch('/api/auth/admin-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    return { ok: res.ok, status: res.status, data: await res.json() };
  }, adminEmail);

  if (!authResult.ok) {
    console.error(`Auth failed (${authResult.status}):`, authResult.data);
    await browser.close();
    process.exit(1);
  }

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

// Step 3: Take screenshot
await page.screenshot({ path: outPath, fullPage: false });
await browser.close();

console.log(`Screenshot saved: ${outPath} (${viewport.width}x${viewport.height})`);
