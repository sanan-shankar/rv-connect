/**
 * Phase 10 behavioural probe: the remaining mediums and lows that changed
 * behaviour (audit M33, M8, L9, plus the PostHog console-noise fix),
 * proved against the running server.
 *
 *  - a cross-site Origin cannot spend a member's cookie on the upload
 *    routes, while the site's own origin and origin-less callers still can
 *    (M33, both directions);
 *  - the REAL signup form refuses a top-of-every-list password with the new
 *    copy and no account row, then accepts a decent one — the same form,
 *    same session, so the refusal is proved non-vacuous (M8);
 *  - signing up with an email that already has an account answers the
 *    friendly sentence, not a 500 (L9's visible half; the race itself is
 *    pinned by the P2002 catch);
 *  - a page load produces ZERO /ingest 404s (the three-PostHog-404s
 *    baseline noise, docs/SECURITY.md traps, is gone).
 *
 * Usage: node scripts/qa/phase10-probe.mjs
 * Needs: dev server on :3000, DEV_LOGIN_SECRET + ADMIN_EMAIL in .env.
 */
import bcrypt from "bcryptjs";
import { createId } from "@paralleldrive/cuid2";
import puppeteer from "puppeteer";
import { fetchSessionCookie } from "./_dev-login.mjs";
import { bootstrap, openDb, makeLedger, chromePath } from "./_probe-kit.mjs";

const { BASE } = bootstrap(import.meta.url, { chrome: true });


const { default: sharp } = await import("sharp");
const { db, q } = await openDb();
const L = makeLedger();

const P = "@probe10.invalid";
async function cleanup() {
  await db.query(`DELETE FROM "User" WHERE email LIKE '%${P}'`).catch(() => {});
}
await cleanup();

/* ============================== M33: cross-site origins cannot spend cookies */
console.log("\n-- M33: the upload routes refuse a cross-site Origin");
{
  const id = createId();
  await db.query(
    `INSERT INTO "User" (id, name, email, password, "emailVerified", "verifyState", "batchYear", "updatedAt")
     VALUES ($1,'Probe Uploader',$2,$3, now(), 'verified', 2001, now())`,
    [id, `uploader${P}`, bcrypt.hashSync("probe-password-10", 4)]
  );
  const c = await fetchSessionCookie(BASE, `uploader${P}`);
  const cookie = `${c.name}=${c.value}`;
  const png = await sharp({ create: { width: 8, height: 8, channels: 3, background: "#3F7CA6" } }).png().toBuffer();

  const upload = (headers) => {
    const fd = new FormData();
    fd.append("files", new Blob([png], { type: "image/png" }), "p10.png");
    return fetch(new URL("/api/upload", BASE), { method: "POST", headers: { cookie, ...headers }, body: fd });
  };

  const evil = await upload({ origin: "https://evil.example" });
  L.check("a cross-site Origin with a valid cookie is refused (403)", evil.status === 403, `got ${evil.status}`);

  const nullOrigin = await upload({ origin: "null" });
  L.check("the sandboxed-iframe 'null' origin is refused (403)", nullOrigin.status === 403, `got ${nullOrigin.status}`);

  const own = await upload({ origin: BASE });
  L.check("the site's own origin still uploads (positive control)", own.status === 200, `got ${own.status}`);

  const bare = await upload({});
  L.check("an origin-less caller (probes, servers) still uploads", bare.status === 200, `got ${bare.status}`);

  for (const path of ["/api/upload/presign", "/api/upload/finalize"]) {
    const res = await fetch(new URL(path, BASE), {
      method: "POST",
      headers: { cookie, origin: "https://evil.example", "content-type": "application/json" },
      body: "{}",
    });
    L.check(`${path} refuses the cross-site Origin too (403)`, res.status === 403, `got ${res.status}`);
  }
}

/* ================== M8 + L9: the real signup form, hostile passwords first */
console.log("\n-- M8/L9: the real signup form refuses weak passwords and duplicate emails politely");
const browser = await puppeteer.launch({
  executablePath: chromePath(),
  headless: "new",
});
{
  const ctx = await browser.createBrowserContext();
  const page = await ctx.newPage();
  await page.goto(`${BASE}/signup`, { waitUntil: "networkidle2", timeout: 90_000 });

  await page.waitForSelector('input[placeholder="Your answer..."]', { timeout: 30_000 });
  await page.waitForFunction(() => /tree|house/i.test(document.querySelector("p.font-heading")?.textContent ?? ""));
  const question = await page.$eval("p.font-heading", (el) => el.textContent);
  await page.type('input[placeholder="Your answer..."]', /tree/i.test(question) ? "banyan" : "cauvery");
  await page.click('button[type="submit"]');
  await page.waitForSelector("#firstName", { timeout: 15_000 });

  const email = `weakpw${P}`;
  const [g] = await q(`SELECT name FROM "Group" WHERE name ~ '^Batch of \\d{4}$' ORDER BY "createdAt" ASC LIMIT 1`);
  const batch = g ? Number(g.name.replace("Batch of ", "")) : 2010;
  await page.type("#firstName", "Probe");
  await page.type("#lastName", "Weakpw");
  await page.type("#email", email);
  await page.type("#password", "Password123");
  await page.type("#yearJoined", String(batch - 7));
  await page.type("#yearLeft", String(batch));
  await page.type("#batchYear", String(batch));
  await page.click('input[name="consent"]');
  await page.click('button[type="submit"]');

  const refused = await page
    .waitForFunction(() => document.body.textContent.includes("guessing list"), { timeout: 15_000 })
    .then(() => true).catch(() => false);
  const rows1 = await q(`SELECT id FROM "User" WHERE email = $1`, [email]);
  L.check("Password123 is refused with the new copy (M8)", refused);
  L.check("  ...and no account is created", rows1.length === 0);

  // Same form, decent password: lands. The refusal above is proved
  // non-vacuous by this succeeding.
  await page.click("#password", { clickCount: 3 });
  await page.type("#password", "banyan shade at noon 42");
  await page.click('button[type="submit"]');
  await page.waitForFunction(() => location.pathname.startsWith("/welcome"), { timeout: 30_000 }).catch(() => {});
  const rows2 = await q(`SELECT id FROM "User" WHERE email = $1`, [email]);
  L.check("a decent password on the same form lands (positive control)", rows2.length === 1);
  await ctx.close();

  // L9's visible half: the same address again answers the sentence, not a 500.
  const ctx2 = await browser.createBrowserContext();
  const page2 = await ctx2.newPage();
  await page2.goto(`${BASE}/signup`, { waitUntil: "networkidle2", timeout: 90_000 });
  await page2.waitForSelector('input[placeholder="Your answer..."]', { timeout: 30_000 });
  await page2.waitForFunction(() => /tree|house/i.test(document.querySelector("p.font-heading")?.textContent ?? ""));
  const q2 = await page2.$eval("p.font-heading", (el) => el.textContent);
  await page2.type('input[placeholder="Your answer..."]', /tree/i.test(q2) ? "banyan" : "cauvery");
  await page2.click('button[type="submit"]');
  await page2.waitForSelector("#firstName", { timeout: 15_000 });
  await page2.type("#firstName", "Probe");
  await page2.type("#lastName", "Duplicate");
  await page2.type("#email", email);
  await page2.type("#password", "another decent one 77");
  await page2.type("#yearJoined", String(batch - 7));
  await page2.type("#yearLeft", String(batch));
  await page2.type("#batchYear", String(batch));
  await page2.click('input[name="consent"]');
  await page2.click('button[type="submit"]');
  const dupRefused = await page2
    .waitForFunction(() => document.body.textContent.includes("already exists"), { timeout: 15_000 })
    .then(() => true).catch(() => false);
  L.check("the same address again gets the friendly sentence (L9's visible half)", dupRefused);
  await ctx2.close();
}

/* ============================= the PostHog 404s are gone (plan trap 3) */
console.log("\n-- the three PostHog 404s: gone from every page load");
{
  const ctx = await browser.createBrowserContext();
  const page = await ctx.newPage();
  const bad = [];
  page.on("response", (res) => {
    if (res.status() === 404 && res.url().includes("/ingest/")) bad.push(res.url());
  });
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle2", timeout: 90_000 });
  await new Promise((r) => setTimeout(r, 3000));
  L.check("a page load produces zero /ingest 404s", bad.length === 0, bad.join(", "));
  await ctx.close();
}

await browser.close();
await cleanup();
await db.end();
L.finish();
