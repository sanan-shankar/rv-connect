/**
 * Phase 8 behavioural probe: deletion with a 60-day grace, retention, the
 * data export, and the transparency layer (audit H8, H9, H12, M34, M35),
 * proved against the running server and the REAL R2 bucket.
 *
 *  - the three policy documents answer signed out, with the controller
 *    reachable (H12);
 *  - the REAL signup form refuses without the consent tick, client AND
 *    server side, and stamps consentAt when ticked (H12);
 *  - the REAL delete-account dialog refuses a wrong password and leaves no
 *    request behind; the right password records the request, ends the live
 *    session, writes the audit entry and queues the written confirmation
 *    (M35);
 *  - signing in during the grace window cancels the request, with an audit
 *    entry and a welcome-back notification (M35);
 *  - a grace-period account is held out of people search (M35);
 *  - the retention sweep route refuses without the cron secret; with it, a
 *    grace-expired account is purged INCLUDING its R2 objects (H9), a
 *    report-filer purges cleanly (H8), seeded over-age rows die on the
 *    owner's schedule while recent rows survive (M34);
 *  - the data export serves the caller's own data as a download, refuses
 *    signed out, and is audit-logged (M35).
 *
 * Usage: node scripts/qa/phase8-probe.mjs
 * Needs: dev server on :3000 STARTED WITH CRON_SECRET in its environment
 *        (any value; pass the same one to this probe, or use the dev default
 *        below), DEV_LOGIN_SECRET + ADMIN_EMAIL + R2 creds in .env.
 */
import bcrypt from "bcryptjs";
import { createId } from "@paralleldrive/cuid2";
import puppeteer from "puppeteer";
import { fetchSessionCookie } from "./_dev-login.mjs";
import { bootstrap, openDb, makeLedger, credLogin } from "./_probe-kit.mjs";

const { BASE } = bootstrap(import.meta.url, { chrome: true });


/* The dev value the session's own server restart uses when .env carries no
   CRON_SECRET. Guards nothing real; production has its own in Vercel. */
const CRON = process.env.CRON_SECRET || "dev-cron-secret-for-local-probes-only";

/* storage.ts has no relative imports, so node loads it directly — the same
   in-process R2 access phase5-probe established. Env is loaded above FIRST
   (useR2 is computed at module load). */
const storage = await import("../../src/lib/storage.ts");
const { default: sharp } = await import("sharp");

const { db, q } = await openDb();
const L = makeLedger();

const P = "@probe8.invalid";
const PASSWORD = "probe-password-8";
const hash = bcrypt.hashSync(PASSWORD, 4);

async function cleanup() {
  const ids = (await q(`SELECT id FROM "User" WHERE email LIKE '%${P}'`)).map((r) => r.id);
  if (ids.length) {
    await db.query(`DELETE FROM "AuditLog" WHERE "actorId" = ANY($1) OR "targetId" = ANY($1)`, [ids]).catch(() => {});
    await db.query(`DELETE FROM "Report" WHERE "reporterId" = ANY($1) OR "reportedUserId" = ANY($1)`, [ids]).catch(() => {});
    await db.query(`DELETE FROM "Session" WHERE "userId" = ANY($1)`, [ids]).catch(() => {});
    await db.query(`DELETE FROM "User" WHERE id = ANY($1)`, [ids]);
  }
  await db.query(`DELETE FROM "LoginAttempt" WHERE email LIKE '%${P}'`).catch(() => {});
  await db.query(`DELETE FROM "OutboundEmail" WHERE "to" LIKE '%${P}'`).catch(() => {});
}
await cleanup();

async function mkUser(slug) {
  const id = createId();
  await db.query(
    `INSERT INTO "User" (id, name, email, password, "emailVerified", "verifyState", "batchYear", "updatedAt")
     VALUES ($1,$2,$3,$4, now(), 'verified', 2001, now())`,
    [id, `Probe ${slug[0].toUpperCase()}${slug.slice(1)}`, `${slug}${P}`, hash]
  );
  return id;
}
const get = (path, cookie) =>
  fetch(new URL(path, BASE), { headers: cookie ? { cookie } : {}, redirect: "manual" });
const cookieFor = async (email) => {
  const c = await fetchSessionCookie(BASE, email);
  return `${c.name}=${c.value}`;
};

/* ================================== A. H12: the documents answer signed out */
console.log("\n-- H12: the three policy documents, signed out");
{
  for (const path of ["/privacy", "/terms", "/guidelines"]) {
    const res = await get(path);
    L.check(`${path} answers 200 with no session`, res.status === 200, `got ${res.status}`);
  }
  const privacy = await (await get("/privacy")).text();
  L.check("the privacy policy names the retention windows (60 days is on the page)", privacy.includes("60 days"));
  L.check("the controller is reachable (contact email on the page)", privacy.includes("sanan.shankar@gmail.com"));
  const signedIn = await get("/privacy", await cookieFor(process.env.ADMIN_EMAIL));
  L.check("/privacy also renders for a signed-in member", signedIn.status === 200, `got ${signedIn.status}`);
}

/* ============ C. M35: the real delete dialog — re-auth, grace, revocation */
console.log("\n-- M35: deletion via the real dialog (wrong password, right password, cancel)");

const browser = await puppeteer.launch({
  executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
  headless: "new",
});

const leaver = await mkUser("leaver");
{
  const cookie = await fetchSessionCookie(BASE, `leaver${P}`);
  const ctx = await browser.createBrowserContext();
  const page = await ctx.newPage();
  await page.setCookie({ name: cookie.name, value: cookie.value, url: BASE });
  await page.goto(`${BASE}/profile/${leaver}`, { waitUntil: "networkidle2", timeout: 90_000 });

  const openDialog = async () => {
    // The delete row lives in edit mode ("the pen out"): press Edit profile
    // first, exactly as a member would.
    await page.waitForFunction(
      () => [...document.querySelectorAll("button")].some((b) => b.textContent.trim() === "Edit profile"),
      { timeout: 30_000 },
    );
    await page.evaluate(() => {
      [...document.querySelectorAll("button")].find((b) => b.textContent.trim() === "Edit profile").click();
    });
    await page.waitForFunction(
      () => [...document.querySelectorAll("button")].some((b) => b.textContent.includes("Delete your account")),
      { timeout: 30_000 },
    );
    await page.evaluate(() => {
      [...document.querySelectorAll("button")].find((b) => b.textContent.includes("Delete your account")).click();
    });
    await page.waitForSelector('div[role="dialog"] input[type="password"]', { timeout: 10_000 });
  };

  await openDialog();
  // Wrong password: refused, and nothing recorded.
  await page.type('div[role="dialog"] input[type="password"]', "not-the-password");
  await page.evaluate(() => {
    [...document.querySelectorAll('div[role="dialog"] button')]
      .find((b) => b.textContent.includes("Delete my account")).click();
  });
  const refused = await page
    .waitForFunction(() => document.body.textContent.includes("isn't right"), { timeout: 15_000 })
    .then(() => true).catch(() => false);
  const [afterWrong] = await q(`SELECT "deletionRequestedAt" FROM "User" WHERE id = $1`, [leaver]);
  L.check("a wrong password is refused in the dialog", refused);
  L.check("  ...and no deletion request is recorded", afterWrong.deletionRequestedAt === null);

  // Right password: the request lands.
  await page.click('div[role="dialog"] input[type="password"]', { clickCount: 3 });
  await page.type('div[role="dialog"] input[type="password"]', PASSWORD);
  await page.evaluate(() => {
    [...document.querySelectorAll('div[role="dialog"] button')]
      .find((b) => b.textContent.includes("Delete my account")).click();
  });
  await page.waitForFunction(() => location.pathname === "/" || location.pathname.startsWith("/login"), { timeout: 30_000 }).catch(() => {});
  const [afterRight] = await q(`SELECT "deletionRequestedAt" FROM "User" WHERE id = $1`, [leaver]);
  L.check("the right password records the deletion request", afterRight.deletionRequestedAt !== null);

  const audit = await q(
    `SELECT 1 FROM "AuditLog" WHERE "actorId" = $1 AND action = 'account.delete_request'`, [leaver]);
  L.check("  ...with an account.delete_request audit entry", audit.length === 1);

  const mail = await q(
    `SELECT 1 FROM "OutboundEmail" WHERE "userId" = $1 AND kind = 'deletion-scheduled'`, [leaver]);
  L.check("  ...and the written confirmation queued (deletion-scheduled email row)", mail.length === 1);

  // The session that existed BEFORE the request is dead (epoch bump).
  const revoked = await get("/feed", `${cookie.name}=${cookie.value}`);
  L.check("the pre-request session no longer opens /feed (every session ended)", revoked.status === 307, `got ${revoked.status}`);
  await ctx.close();
}

// Signing in during the grace window IS the cancel gesture.
{
  const login = await credLogin(BASE, {
    email: `leaver${P}`,
    password: PASSWORD,
    devBypass: process.env.DEV_LOGIN_SECRET,
  });
  L.check("the member signs back in during the grace window", login.signedIn);
  const [row] = await q(`SELECT "deletionRequestedAt" FROM "User" WHERE id = $1`, [leaver]);
  L.check("  ...which cancels the deletion request", row.deletionRequestedAt === null);
  const audit = await q(
    `SELECT 1 FROM "AuditLog" WHERE "actorId" = $1 AND action = 'account.delete_cancel'`, [leaver]);
  L.check("  ...with an account.delete_cancel audit entry", audit.length === 1);
  const note = await q(
    `SELECT 1 FROM "Notification" WHERE "userId" = $1 AND message LIKE '%cancelled%'`, [leaver]);
  L.check("  ...and a welcome-back notification", note.length === 1);
}

/* ==================== D. M35: a grace-period account leaves people search */
console.log("\n-- M35: an account inside its grace window is out of people search");
const watcher = await mkUser("watcher");
{
  const ghost = await mkUser("ghost");
  await db.query(`UPDATE "User" SET "deletionRequestedAt" = now() WHERE id = $1`, [ghost]);
  const wc = await cookieFor(`watcher${P}`);
  const hit = await (await get(`/api/users/search?q=Probe%20Ghost`, wc)).json().catch(() => null);
  const found = JSON.stringify(hit ?? "").includes(ghost);
  L.check("search returns no grace-period account", !found);
  const control = await (await get(`/api/users/search?q=Probe%20Leaver`, wc)).json().catch(() => null);
  L.check("  ...while an ordinary account still surfaces (positive control)", JSON.stringify(control ?? "").includes(leaver));
  await db.query(`DELETE FROM "User" WHERE id = $1`, [ghost]);
}

/* ===== E. H9 + H8 + M34: the sweep — grace purge with real R2 bytes ===== */
console.log("\n-- H9/M34: the retention sweep purges a grace-expired account, bytes and all");
{
  const purged = await mkUser("purged");
  const pc = await cookieFor(`purged${P}`);

  // A real image into the real bucket, as this member.
  const png = await sharp({ create: { width: 8, height: 8, channels: 3, background: "#C2622F" } }).png().toBuffer();
  const fd = new FormData();
  fd.append("files", new Blob([png], { type: "image/png" }), "probe8.png");
  const up = await fetch(new URL("/api/upload", BASE), { method: "POST", headers: { cookie: pc }, body: fd });
  const upBody = await up.json().catch(() => null);
  const url = upBody?.urls?.[0] ?? upBody?.url ?? null;
  L.check("the doomed member uploads a real image (200 with a URL)", up.status === 200 && !!url, `status ${up.status}`);
  const key = url ? storage.keyForUrl(url) : null;
  const existedBefore = key ? (await storage.headObjectSize(key)) !== null : false;
  L.check("  ...and the object exists in the bucket before the purge", existedBefore);

  // The rows that make the purge interesting: a post carrying the image, an
  // avatar, and a report THEY filed (the RESTRICT FK that used to break H8).
  await db.query(
    `INSERT INTO "Post" (id, "authorId", content, images, "updatedAt") VALUES ($1,$2,'probe8 post',$3, now())`,
    [createId(), purged, JSON.stringify([url])]
  );
  await db.query(`UPDATE "User" SET "photoUrl" = $2 WHERE id = $1`, [purged, url]);
  await db.query(
    `INSERT INTO "Report" (id, reason, "reporterId", "targetType", "reportedUserId") VALUES ($1,'probe8',$2,'user',$3)`,
    [createId(), purged, watcher]
  );
  // 61 days into the past: one day past the owner's grace window.
  await db.query(`UPDATE "User" SET "deletionRequestedAt" = now() - interval '61 days' WHERE id = $1`, [purged]);

  // Over-age rows for the schedule (M34), plus fresh controls that must live.
  const oldNote = createId(), newNote = createId(), oldMail = createId(), newMail = createId(), oldAttempt = createId();
  await db.query(
    `INSERT INTO "Notification" (id, "userId", type, message, "createdAt")
     VALUES ($1,$3,'admin','probe8 old', now() - interval '400 days'), ($2,$3,'admin','probe8 new', now())`,
    [oldNote, newNote, watcher]
  );
  await db.query(
    `INSERT INTO "OutboundEmail" (id, "to", kind, "createdAt")
     VALUES ($1,'old${P}','verify', now() - interval '200 days'), ($2,'new${P}','verify', now())`,
    [oldMail, newMail]
  );
  await db.query(
    `INSERT INTO "LoginAttempt" (id, email, ok, reason, "createdAt")
     VALUES ($1,'old${P}', false, 'probe8', now() - interval '400 days')`,
    [oldAttempt]
  );

  // The door: no secret and a wrong secret are both refused.
  L.check("the sweep refuses with no secret (401)", (await fetch(`${BASE}/api/retention/sweep`)).status === 401);
  L.check("the sweep refuses a wrong secret (401)",
    (await fetch(`${BASE}/api/retention/sweep`, { headers: { authorization: "Bearer wrong" } })).status === 401);

  const run = await fetch(`${BASE}/api/retention/sweep`, { headers: { authorization: `Bearer ${CRON}` } });
  const result = await run.json().catch(() => null);
  L.check("the right secret runs the sweep (200)", run.status === 200, `got ${run.status}`);
  L.check("  ...which reports the purge and no step errors", !!result && result.accountsPurged >= 1 && result.errors.length === 0,
    JSON.stringify(result));

  const gone = await q(`SELECT 1 FROM "User" WHERE id = $1`, [purged]);
  L.check("the grace-expired account is gone, report-filer FK and all (H8)", gone.length === 0);
  const objectAfter = key ? (await storage.headObjectSize(key)) !== null : true;
  L.check("the R2 object is gone with it (H9)", !objectAfter);
  const purgeAudit = await q(`SELECT 1 FROM "AuditLog" WHERE "targetId" = $1 AND action = 'account.purge'`, [purged]);
  L.check("  ...with an account.purge audit entry", purgeAudit.length === 1);

  const notes = await q(`SELECT id FROM "Notification" WHERE id = ANY($1)`, [[oldNote, newNote]]);
  L.check("a 400-day notification dies; a fresh one survives (M34)",
    notes.length === 1 && notes[0].id === newNote);
  const mails = await q(`SELECT id FROM "OutboundEmail" WHERE id = ANY($1)`, [[oldMail, newMail]]);
  L.check("a 200-day email row dies; a fresh one survives (M34)",
    mails.length === 1 && mails[0].id === newMail);
  const attempts = await q(`SELECT id FROM "LoginAttempt" WHERE id = $1`, [oldAttempt]);
  L.check("a 400-day login attempt dies (M34)", attempts.length === 0);
  const sweepAudit = await q(
    `SELECT 1 FROM "AuditLog" WHERE action = 'retention.sweep' AND "createdAt" > now() - interval '5 minutes'`);
  L.check("the sweep itself is audit-logged", sweepAudit.length >= 1);
  await db.query(`DELETE FROM "OutboundEmail" WHERE id = $1`, [newMail]);
}

/* ================================= G. M35: the data export is self-service */
console.log("\n-- M35: the data export");
{
  await db.query(
    `INSERT INTO "Post" (id, "authorId", content, "updatedAt") VALUES ($1,$2,'probe8 export post', now())`,
    [createId(), watcher]
  );
  const wc = await cookieFor(`watcher${P}`);
  const res = await get("/api/account/export", wc);
  const disposition = res.headers.get("content-disposition") ?? "";
  const body = await res.text();
  L.check("a member downloads their data (200, attachment)", res.status === 200 && disposition.includes("attachment"));
  L.check("  ...containing their profile and their post", body.includes(`watcher${P}`) && body.includes("probe8 export post"));
  L.check("  ...and nobody else's address", !body.includes(`leaver${P}`));
  // The proxy holds the outer door: with no session cookie the request never
  // reaches the route, it is bounced to /login (the route's own 401 is the
  // second layer, for a cookie that fails auth()).
  const anon = await get("/api/account/export");
  const bounced = anon.status === 307 && (anon.headers.get("location") ?? "").includes("/login");
  L.check("signed out, the export refuses (redirected to /login, no data served)", bounced || anon.status === 401, `got ${anon.status}`);
  const audit = await q(`SELECT 1 FROM "AuditLog" WHERE "actorId" = $1 AND action = 'account.export'`, [watcher]);
  L.check("  ...and the export is audit-logged", audit.length >= 1);
}

/* =============== B. H12: the consent tick at the real signup form (browser) */
console.log("\n-- H12: signup consent — browser-required, server-enforced, stamped");
{
  const ctx = await browser.createBrowserContext();
  const page = await ctx.newPage();
  await page.goto(`${BASE}/signup`, { waitUntil: "networkidle2", timeout: 90_000 });

  // Trivia gate first (same drive as phase4-probe).
  await page.waitForSelector('input[placeholder="Your answer..."]', { timeout: 30_000 });
  await page.waitForFunction(() => /tree|house/i.test(document.querySelector("p.font-heading")?.textContent ?? ""));
  const question = await page.$eval("p.font-heading", (el) => el.textContent);
  await page.type('input[placeholder="Your answer..."]', /tree/i.test(question) ? "banyan" : "cauvery");
  await page.click('button[type="submit"]');
  await page.waitForSelector("#firstName", { timeout: 15_000 });

  const email = `consent${P}`;
  const [g] = await q(`SELECT name FROM "Group" WHERE name ~ '^Batch of \\d{4}$' ORDER BY "createdAt" ASC LIMIT 1`);
  const batch = g ? Number(g.name.replace("Batch of ", "")) : 2010;
  await page.type("#firstName", "Probe");
  await page.type("#lastName", "Consent");
  await page.type("#email", email);
  await page.type("#password", PASSWORD);
  await page.type("#yearJoined", String(batch - 7));
  await page.type("#yearLeft", String(batch));
  await page.type("#batchYear", String(batch));

  // Untouched box: the browser refuses to submit at all.
  await page.click('button[type="submit"]');
  await new Promise((r) => setTimeout(r, 1500));
  const rows1 = await q(`SELECT id FROM "User" WHERE email = $1`, [email]);
  L.check("submit with the box unticked creates no account (browser blocks it)", rows1.length === 0);

  // A client that strips `required`: the SERVER refuses.
  await page.evaluate(() => document.querySelector('input[name="consent"]').removeAttribute("required"));
  await page.click('button[type="submit"]');
  const serverRefused = await page
    .waitForFunction(() => document.body.textContent.includes("Please agree"), { timeout: 15_000 })
    .then(() => true).catch(() => false);
  const rows2 = await q(`SELECT id FROM "User" WHERE email = $1`, [email]);
  L.check("a submit that strips `required` is refused by the server", serverRefused && rows2.length === 0);

  // Ticked: the account lands, with the consent receipt stamped.
  await page.click('input[name="consent"]');
  await page.click('button[type="submit"]');
  await page.waitForFunction(() => location.pathname.startsWith("/welcome"), { timeout: 30_000 }).catch(() => {});
  const rows3 = await q(`SELECT "consentAt" FROM "User" WHERE email = $1`, [email]);
  L.check("ticked, the account is created", rows3.length === 1);
  L.check("  ...with consentAt stamped (the Art. 7 receipt)", rows3.length === 1 && rows3[0].consentAt !== null);
  await ctx.close();
}

await browser.close();
await cleanup();
await db.end();
L.finish();
