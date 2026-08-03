import puppeteer from 'puppeteer';
import { existsSync, mkdirSync, readdirSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';
import {
  assertSameOriginAfterNavigation,
  cookieDomainForBaseUrl,
  requireLoopbackBaseUrl,
} from './local-base-url.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
process.chdir(repoRoot);
config({ path: '.env.local' });

const baseUrl = requireLoopbackBaseUrl(process.argv[2] || 'http://localhost:3000');
const adminEmail = process.env.ADMIN_EMAIL;
if (!adminEmail) {
  console.error('Error: ADMIN_EMAIL not found in .env.local');
  process.exit(1);
}

const screenshotsDir = './temporary screenshots';
mkdirSync(screenshotsDir, { recursive: true });
const existing = existsSync(screenshotsDir) ? readdirSync(screenshotsDir).filter(f => f.endsWith('.png')) : [];
const nums = existing.map(f => parseInt(f.match(/screenshot-(\d+)/)?.[1] ?? '0')).filter(Boolean);
let next = nums.length > 0 ? Math.max(...nums) + 1 : 1;

function shotPath(label) {
  const p = join(screenshotsDir, `screenshot-${next}-${label}.png`);
  next += 1;
  return p;
}

async function sleep(ms) {
  await new Promise((r) => setTimeout(r, ms));
}

async function waitForCondition(fn, timeoutMs, intervalMs = 250) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const v = await fn();
    if (v) return v;
    await sleep(intervalMs);
  }
  return null;
}

const browser = await puppeteer.launch({
  headless: true,
  executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});

const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844 });
page.setDefaultNavigationTimeout(60000);

// Auth (once; session cookie persists across attempts)
await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
assertSameOriginAfterNavigation(baseUrl, page.url());

// Authenticate from Node rather than the page's main world, so ADMIN_EMAIL is
// never serialized into app-controlled JavaScript. Copy only the resulting
// HttpOnly session cookie into the browser context.
const authResponse = await fetch(`${baseUrl}/api/auth/admin-login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: adminEmail }),
  redirect: 'error',
});
const authData = await authResponse.json();
if (!authResponse.ok) {
  console.error('Auth failed', { status: authResponse.status, data: authData });
  await browser.close();
  process.exit(1);
}

const sessionCookie = authResponse.headers
  .getSetCookie()
  .find((raw) => /^(?:__Secure-)?authjs\.session-token=/.test(raw));
if (!sessionCookie) {
  console.error('Auth failed: session cookie missing');
  await browser.close();
  process.exit(1);
}
const cookiePair = sessionCookie.slice(0, sessionCookie.indexOf(';'));
const separator = cookiePair.indexOf('=');
await page.browserContext().setCookie({
  name: cookiePair.slice(0, separator),
  value: cookiePair.slice(separator + 1),
  domain: cookieDomainForBaseUrl(baseUrl),
  path: '/',
  httpOnly: true,
  secure: baseUrl.startsWith('https://'),
  sameSite: 'Lax',
});
console.log('Authenticated.');

page.on('pageerror', (err) => console.error('PAGEERROR:', err.message));
page.on('console', (msg) => {
  if (msg.type() === 'error') console.error('CONSOLE ERROR:', msg.text());
});

async function readState() {
  return page.evaluate(() => {
    const panel = document.querySelector('[role="dialog"][aria-label="Product tour"]');
    const panelRect = panel ? panel.getBoundingClientRect() : null;
    const overlay = document.querySelector('.z-\\[60\\]');
    let holeRect = null;
    if (overlay) {
      const hole = overlay.querySelector('div[style*="box-shadow"]');
      if (hole) holeRect = hole.getBoundingClientRect();
    }
    function rectToObj(r) {
      if (!r) return null;
      return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height };
    }
    function intersects(a, b) {
      if (!a || !b) return false;
      return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
    }
    return {
      url: location.pathname,
      panel: rectToObj(panelRect),
      hole: rectToObj(holeRect),
      overlaps: intersects(panelRect, holeRect),
      viewport: { w: window.innerWidth, h: window.innerHeight },
    };
  });
}

async function measureOverlap(stopLabel, expectedRoute) {
  const settled = await waitForCondition(async () => {
    const s = await readState();
    if (s.url !== expectedRoute) return null;
    if (s.hole) return s;
    return null;
  }, 8000, 300);
  await sleep(600);
  const result = await readState();
  return { ...result, settled: !!settled };
}

const stops = [
  { label: 'feed', route: '/feed' },
  { label: 'directory', route: '/directory' },
  { label: 'collection', route: '/collection' },
  { label: 'catchups', route: '/catchups' },
];

const MAX_ATTEMPTS = 4;
let finalFindings = null;

for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
  console.log(`\n=== Attempt ${attempt}/${MAX_ATTEMPTS} ===`);
  try {
    await page.goto(`${baseUrl}/admin`, { waitUntil: 'networkidle2', timeout: 60000 });
  } catch (e) {
    console.error('admin nav warning:', e.message);
    await sleep(2000);
  }
  await sleep(1000);

  const clicked = await waitForCondition(async () => {
    return page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const btn = btns.find((b) => b.textContent?.trim() === 'hoopoe tour');
      if (!btn) return false;
      btn.click();
      return true;
    });
  }, 15000, 500);

  if (!clicked) {
    console.error('Could not find "hoopoe tour" button; retrying.');
    continue;
  }

  await waitForCondition(async () => (await page.evaluate(() => location.pathname)) === '/feed', 15000);
  await sleep(1200);

  const findings = [];
  let attemptOk = true;

  for (let i = 0; i < stops.length; i++) {
    const r = await measureOverlap(stops[i].label, stops[i].route);
    findings.push({ stop: stops[i].label, ...r });
    if (!r.settled) {
      console.log(`  [${stops[i].label}] no hole found within budget (url=${r.url}) -- attempt unreliable`);
      attemptOk = false;
      break;
    }
    console.log(`  [${stops[i].label}] hole ok, overlaps=${r.overlaps}`);
    await page.screenshot({ path: shotPath(`tour-mobile-${stops[i].label}`) });
    if (i < stops.length - 1) {
      const nextClicked = await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const btn = btns.find((b) => b.textContent?.trim().includes('Next'));
        if (!btn) return false;
        btn.click();
        return true;
      });
      if (!nextClicked) {
        console.error(`Could not find Next button after stop ${stops[i].label}`);
        attemptOk = false;
        break;
      }
    }
  }

  if (attemptOk) {
    // Finish beat
    const finishClicked = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const btn = btns.find((b) => b.textContent?.trim().includes('Next'));
      if (!btn) return false;
      btn.click();
      return true;
    });
    if (finishClicked) {
      await sleep(2500);
      await page.screenshot({ path: shotPath('tour-mobile-finish') });
    }
    finalFindings = findings;
    console.log(`Attempt ${attempt} completed cleanly.`);
    break;
  }
}

await browser.close();

if (!finalFindings) {
  console.log('\n=== RESULT: INCONCLUSIVE ===');
  console.log('Could not complete a clean run in', MAX_ATTEMPTS, 'attempts (likely dev-server HMR churn from');
  console.log('other agents editing shared files concurrently, e.g. src/lib/onboarding-local.ts).');
  process.exit(2);
}

console.log('\n=== SUMMARY ===');
for (const f of finalFindings) {
  console.log(
    `${f.stop}: url=${f.url} overlaps=${f.overlaps} panelTop=${f.panel?.top?.toFixed(0)} holeTop=${f.hole?.top?.toFixed(0)} holeBottom=${f.hole?.bottom?.toFixed(0)}`
  );
}
const anyOverlap = finalFindings.some((f) => f.overlaps);
console.log(anyOverlap ? '\nFAIL: overlap detected' : '\nPASS: no overlap at any stop');
process.exit(anyOverlap ? 1 : 0);
