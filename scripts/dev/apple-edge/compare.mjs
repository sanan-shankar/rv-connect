/* Ground truth beside our render, same size, same crop. */
import sharp from 'sharp';
import puppeteer from 'puppeteer';
import { config } from 'dotenv';
import { devLogin } from '../../qa/_dev-login.mjs';
import { chromePath } from '../../qa/_probe-kit.mjs';
config({ path: '.env', quiet: true });

const truth = await sharp("sanan's stuff/Inspiration/not yet right.png")
  .extract({ left: 2218, top: 25, width: 400, height: 402 }).png().toBuffer();

const browser = await puppeteer.launch({ headless: true,
  executablePath: chromePath(),
  args: ['--no-sandbox','--disable-setuid-sandbox'] });
const page = await browser.newPage();
await page.setViewport({ width: 500, height: 500, deviceScaleFactor: 2 });
await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded', timeout: 20000 });
await devLogin(page, 'http://localhost:3000', process.env.ADMIN_EMAIL);
await page.goto('http://localhost:3000/lab/glass-edges', { waitUntil: 'networkidle2', timeout: 90000 });
await page.evaluate(() => {
  const cell = [...document.querySelectorAll('.cell')].find(c => c.querySelector('em')?.textContent === 'tone');
  const svg = cell.querySelector('svg');
  svg.setAttribute('width', '400'); svg.setAttribute('height', '400');
  svg.style.borderRadius = '75px';
  document.body.innerHTML = '';
  document.body.style.margin = '0';
  document.body.appendChild(svg);
});
const mine = await page.screenshot({ clip: { x: 0, y: 0, width: 400, height: 400 } });
await browser.close();

await sharp({ create: { width: 860, height: 440, channels: 4, background: '#8A8579' } })
  .composite([
    { input: truth, left: 20, top: 20 },
    { input: await sharp(mine).resize(400, 400).png().toBuffer(), left: 440, top: 20 },
  ]).png().toFile('scripts/dev/apple-edge/side-by-side.png');
console.log('ok');
