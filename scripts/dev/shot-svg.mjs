// Fast static-SVG -> PNG harness for character/illustration iteration.
// Renders a local HTML file (SVG laid out at various sizes / backgrounds) and screenshots it,
// so art (proportions, crest, coloring) can be checked in ~1s without the Next app.
// Usage: node scripts/dev/shot-svg.mjs <input.html> <output.png> [width] [height]
import puppeteer from 'puppeteer';
import { existsSync } from 'fs';
import { resolve } from 'path';

const input = resolve(process.argv[2]);
const out = resolve(process.argv[3] || './out.png');
const width = parseInt(process.argv[4] || '1100', 10);
const height = parseInt(process.argv[5] || '800', 10);

// The bundled Chrome-for-Testing install is incomplete on this machine; prefer system Chrome.
const SYSTEM_CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || (existsSync(SYSTEM_CHROME) ? SYSTEM_CHROME : undefined);

const browser = await puppeteer.launch({ headless: true, executablePath, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
const page = await browser.newPage();
await page.setViewport({ width, height, deviceScaleFactor: 2 });
await page.goto('file://' + input, { waitUntil: 'networkidle0', timeout: 20000 });
await new Promise((r) => setTimeout(r, 250));
await page.screenshot({ path: out, fullPage: true });
await browser.close();
console.log('saved', out);
