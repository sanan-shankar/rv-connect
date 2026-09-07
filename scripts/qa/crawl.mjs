import puppeteer from 'puppeteer';
import pg from 'pg';
import { config } from 'dotenv';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { devLogin } from "./_dev-login.mjs";
import { chromePath } from "./_probe-kit.mjs";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
process.chdir(repoRoot);

config({ path: '.env', quiet: true });

/* The two profile rows used to be hardcoded cuids. Both had been deleted from
   the database by 2026-08-26, and a profile page for a user who does not exist
   answers 200 with the app shell and no profile in it -- so the crawler had
   been printing `OK 200` for two pages that rendered nothing, for as long as
   nobody looked. Ids now come from the database, and each profile row also has
   to show that person's name before it counts as OK. */
async function pickProfiles() {
  const db = new pg.Client({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL });
  await db.connect();
  try {
    const own = (await db.query('SELECT id, name FROM "User" WHERE lower(email) = lower($1)', [process.env.ADMIN_EMAIL])).rows[0];
    if (!own) throw new Error(`No user matches ADMIN_EMAIL (${process.env.ADMIN_EMAIL || 'unset'}).`);
    const other = (await db.query('SELECT id, name FROM "User" WHERE id <> $1 AND name IS NOT NULL ORDER BY "createdAt" LIMIT 1', [own.id])).rows[0];
    if (!other) throw new Error('The database holds no second user to crawl.');
    return { own, other };
  } finally {
    await db.end();
  }
}

const { own: OWN, other: OTHER } = await pickProfiles();
const expectedOnPage = new Map([[`/profile/${OWN.id}`, OWN.name], [`/profile/${OTHER.id}`, OTHER.name]]);
// Every live destination, signed in as the admin. Keep this in step with the
// sidebar in src/components/layout/sidebar.tsx: a route that 404s here but is
// still listed is a route somebody deleted without telling the crawler.
// /donate is deliberately included: it survives only as a redirect to /support
// for old links, so a 200 here is the redirect working.
// Cross-check against `ls src/app/(main)` when adding: /birds, /pick-bird and
// /welcome had each shipped without being added here. NOT every directory in
// there is a route -- `notifications` holds only actions.ts and `notice` only
// a [id] segment, so neither has a page to crawl.
const routes = ['/feed','/directory','/letters','/catchups','/collection','/about','/support','/donate','/admin','/messages','/dark-mode','/birds','/pick-bird','/welcome',`/profile/${OWN.id}`,`/profile/${OTHER.id}`,'/','/login','/signup','/lab'];
const browser = await puppeteer.launch({ headless: true, executablePath: chromePath(), args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });
await devLogin(page, 'http://localhost:3000');
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
    const expected = expectedOnPage.get(r);
    if (expected) {
      const rendered = await page.evaluate((name) => !!document.body && (document.body.innerText || '').includes(name), expected);
      if (!rendered) errs.push(`profile did not render "${expected}"`);
    }
  } catch(e) { status = 'NAV-ERR'; errs.push('nav: '+String(e.message).slice(0,100)); }
  page.off('console', onConsole); page.off('pageerror', onPageErr);
  const tag = (status===200 && errs.length===0) ? 'OK ' : '!! ';
  console.log(`${tag}${String(status).padEnd(8)} ${r}${errs.length? '  | '+errs.slice(0,3).join(' ;; '):''}`);
}
await browser.close();
