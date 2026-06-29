import puppeteer from 'puppeteer';
import { config } from 'dotenv';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
process.chdir(repoRoot);

config({ path: '.env.local' });
const OWN = 'cmmz0vvws0000ynsg3ueb9scp';
const OTHER = 'b9d8okmgtb1yp6a58jv3xky1';
const routes = ['/feed','/directory','/groups','/letters','/catchups','/events','/collection','/about','/settings','/support','/donate','/admin',`/profile/${OWN}`,`/profile/${OTHER}`,'/','/login','/signup','/preview/v2','/preview/birds'];
const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });
await page.evaluate(async (email) => {
  await fetch('/api/auth/admin-login', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ email }) });
}, process.env.ADMIN_EMAIL);
for (const r of routes) {
  const errs = [];
  const onConsole = m => { if (m.type()==='error') errs.push('console: '+m.text().slice(0,120)); };
  const onPageErr = e => errs.push('pageerror: '+String(e.message).slice(0,140));
  page.on('console', onConsole); page.on('pageerror', onPageErr);
  let status = '?';
  try {
    const resp = await page.goto('http://localhost:3000'+r, { waitUntil:'networkidle2', timeout: 25000 });
    status = resp ? resp.status() : 'no-resp';
    await new Promise(s=>setTimeout(s,300));
    // detect Next error overlay / app error text
    const hasErr = await page.evaluate(() => document.body && /Application error|Unhandled Runtime Error|This page could not be found/i.test(document.body.innerText||''));
    if (hasErr) errs.push('overlay/text: error visible');
  } catch(e) { status = 'NAV-ERR'; errs.push('nav: '+String(e.message).slice(0,100)); }
  page.off('console', onConsole); page.off('pageerror', onPageErr);
  const tag = (status===200 && errs.length===0) ? 'OK ' : '!! ';
  console.log(`${tag}${String(status).padEnd(8)} ${r}${errs.length? '  | '+errs.slice(0,3).join(' ;; '):''}`);
}
await browser.close();
