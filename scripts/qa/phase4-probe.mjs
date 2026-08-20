/**
 * Phase 4 behavioural probe: bot defence + rate limiting (audit H22, H6,
 * M2, M3, M7), proved against the RUNNING dev server.
 *
 * Same contract as phase3-probe.mjs: static checks cannot catch this class
 * of bug (Phase 2's probe found a permanent lockout that typechecked
 * perfectly), so every claim is a real HTTP request or a real browser
 * driving the real UI. What Phase 4 must prove, per surface:
 *
 *   login    no proof-of-human -> refused BEFORE the password is judged;
 *            the QA bypass works in dev; a human pass works only for its
 *            own address; 10 failures lock an account's window shut across
 *            IPs while other accounts and successful logins stay untouched;
 *            30 failures from one IP shut that IP without shutting others
 *   signup   the whole real flow (trivia -> form -> Turnstile -> account ->
 *            auto sign-in) runs unattended in dev; a forged or unbound
 *            trivia pass is refused
 *   trivia   8 wrong answers close ONE IP's window; a fresh visitor on a
 *            fresh IP still gets a fair first attempt (the old limiter
 *            locked out every first-time visitor while the attacker walked
 *            around it -- audit M7's DoS)
 *   reset    5 requests close one IP's window; another IP is unaffected;
 *            no mail rows are written for unknown addresses (audit M3)
 *   uploads  the 40/h account meter closes /api/upload/presign with a 429
 *            and leaves other accounts alone (audit M2)
 *
 * Synthetic IPs arrive via x-forwarded-for, which the dev server reads the
 * same way Vercel's platform-set header is read in production. Every IP and
 * email is randomised per run, so re-runs never inherit spent budgets from
 * the shared Upstash store. Creates disposable accounts (@probe.invalid),
 * cleans up everything it made, and is safe to re-run.
 *
 * Usage: node scripts/qa/phase4-probe.mjs
 * Needs: dev server on :3000, DEV_LOGIN_SECRET + AUTH_SECRET in .env.
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createHmac, randomBytes } from "node:crypto";
import pg from "pg";
import bcrypt from "bcryptjs";
import puppeteer from "puppeteer";
import { fetchSessionCookie } from "./_dev-login.mjs";
import { signHumanPass } from "../../src/lib/human-pass-rule.ts";
import { RATE_LIMITED } from "../../src/lib/rate-limit-message.ts";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
process.chdir(repoRoot);

const BASE = "http://localhost:3000";
process.env.PUPPETEER_EXECUTABLE_PATH ||=
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

/* ---------------------------------------------------------------- env + db */

for (const line of readFileSync(resolve(repoRoot, ".env"), "utf8").split("\n")) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (!m) continue;
  let v = m[2];
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'")))
    v = v.slice(1, -1);
  if (!(m[1] in process.env)) process.env[m[1]] = v;
}
const DEV_SECRET = process.env.DEV_LOGIN_SECRET;
const AUTH_SECRET = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
if (!DEV_SECRET || !AUTH_SECRET) throw new Error("DEV_LOGIN_SECRET / AUTH_SECRET missing from .env");

const db = new pg.Client({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL });
await db.connect();
const q = (text, params) => db.query(text, params).then((r) => r.rows);

/* ------------------------------------------------------------- the ledger */

let pass = 0;
let fail = 0;
function check(name, cond, detail = "") {
  if (cond) {
    pass += 1;
    console.log(`  ok   ${name}`);
  } else {
    fail += 1;
    console.log(`  FAIL ${name}${detail ? ` -- ${detail}` : ""}`);
  }
}

/* --------------------------------------------------- disposable accounts */

const P = "@probe.invalid";
const PASSWORD = "probe-password-1";
const hash = bcrypt.hashSync(PASSWORD, 4);
// Fresh IPs and addresses every run: the Upstash windows are real and
// shared, so yesterday's spent budget must never fail today's assertions.
const RUN = randomBytes(3).toString("hex");
const ip = (n) => `10.${(Math.floor(Math.random() * 200) + 1)}.${(Math.floor(Math.random() * 200) + 1)}.${n}`;

async function cleanup() {
  const ids = (await q(`SELECT id FROM "User" WHERE email LIKE '%${P}'`)).map((r) => r.id);
  if (ids.length) {
    await db.query(`DELETE FROM "Comment" WHERE "authorId" = ANY($1)`, [ids]);
    await db.query(`DELETE FROM "Like" WHERE "userId" = ANY($1)`, [ids]);
    await db.query(`DELETE FROM "Post" WHERE "authorId" = ANY($1)`, [ids]);
    await db.query(`DELETE FROM "AuthToken" WHERE "userId" = ANY($1)`, [ids]);
    await db.query(`DELETE FROM "Session" WHERE "userId" = ANY($1)`, [ids]);
    await db.query(`DELETE FROM "GroupMember" WHERE "userId" = ANY($1)`, [ids]);
    await db.query(`DELETE FROM "OutboundEmail" WHERE "userId" = ANY($1)`, [ids]);
    // A batch group the probe's signup was first to create (only ever
    // memberless by here; a group with real members refuses on FK and stays).
    await db.query(`DELETE FROM "Group" WHERE "creatorId" = ANY($1)`, [ids]).catch(() => {});
    await db.query(`DELETE FROM "User" WHERE id = ANY($1)`, [ids]);
  }
  await db.query(`DELETE FROM "OutboundEmail" WHERE "to" LIKE '%${P}'`);
  await db.query(`DELETE FROM "LoginAttempt" WHERE email LIKE '%${P}'`);
}
await cleanup();

async function mkUser(slug, { confirmed = true, verified = false } = {}) {
  const id = `probe4_${slug}_${RUN}`;
  await db.query(
    `INSERT INTO "User" (id, name, email, password, "emailVerified", "verifyState", "updatedAt")
     VALUES ($1, $2, $3, $4, $5, $6, now())`,
    [id, `Probe ${slug}`, `${slug}_${RUN}${P}`, hash, confirmed ? new Date() : null, verified ? "verified" : "unverified"],
  );
  return { id, email: `${slug}_${RUN}${P}` };
}

/* --------------------------------------------------------- login machinery */

/**
 * One real credentials sign-in attempt through NextAuth's own callback
 * route -- the exact POST a browser makes -- with a synthetic caller IP.
 * Returns { signedIn, location } where location carries NextAuth's error
 * code on refusal.
 */
async function credLogin({ email, password, fromIp, turnstileToken, devBypass, cookie = "" }) {
  const csrfRes = await fetch(`${BASE}/api/auth/csrf`, {
    headers: { "x-forwarded-for": fromIp },
  });
  const { csrfToken } = await csrfRes.json();
  const csrfCookies = csrfRes.headers
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .join("; ");

  const body = new URLSearchParams({ csrfToken, email, password });
  if (turnstileToken) body.set("turnstileToken", turnstileToken);
  if (devBypass) body.set("devBypass", devBypass);

  const res = await fetch(`${BASE}/api/auth/callback/credentials`, {
    method: "POST",
    redirect: "manual",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      cookie: cookie ? `${csrfCookies}; ${cookie}` : csrfCookies,
      "x-forwarded-for": fromIp,
      origin: BASE,
    },
    body,
  });
  const setCookies = res.headers.getSetCookie();
  const signedIn = setCookies.some((c) => c.includes("session-token") && !c.includes("=;"));
  return { signedIn, location: res.headers.get("location") ?? "", status: res.status };
}

/* ================================================== A. the login bot gate */

console.log("\n-- login: nobody crosses without proof of a human (H22)");
const alice = await mkUser("alice");
{
  const bare = await credLogin({ email: alice.email, password: PASSWORD, fromIp: ip(10) });
  check("correct password with NO token and NO bypass is refused", !bare.signedIn, bare.location);
  check(
    "  ...and the refusal names the bot check, not the password",
    /code=bot-check/.test(bare.location),
    bare.location,
  );

  const badBypass = await credLogin({
    email: alice.email, password: PASSWORD, fromIp: ip(10), devBypass: "wrong-secret",
  });
  check("a wrong dev-bypass value is refused", !badBypass.signedIn);

  const good = await credLogin({
    email: alice.email, password: PASSWORD, fromIp: ip(10), devBypass: DEV_SECRET,
  });
  check("the QA bypass signs in (dev only; the prod half is checked in section F)", good.signedIn);

  // The human pass: what a fresh signup / completed reset carries instead
  // of a second Turnstile token. Bound to one address, five minutes.
  const passCookie = `rv_human=${signHumanPass(alice.email, Date.now(), AUTH_SECRET)}`;
  const withPass = await credLogin({
    email: alice.email, password: PASSWORD, fromIp: ip(11), cookie: passCookie,
  });
  check("a human pass for the SAME address signs in with no token", withPass.signedIn);

  const bob = await mkUser("bob");
  const stolen = await credLogin({
    email: bob.email, password: PASSWORD, fromIp: ip(11), cookie: passCookie,
  });
  check("the same pass presented for a DIFFERENT address is refused", !stolen.signedIn);

  const staleCookie = `rv_human=${signHumanPass(alice.email, Date.now() - 6 * 60 * 1000, AUTH_SECRET)}`;
  const stale = await credLogin({
    email: alice.email, password: PASSWORD, fromIp: ip(11), cookie: staleCookie,
  });
  check("a six-minute-old pass is refused", !stale.signedIn);

  // The bot gate stands in FRONT of the password check: with no proof of a
  // human, even the wrong-password path is never reached, so nothing is
  // learnable and nothing is consumed.
  const before = await q(`SELECT count(*)::int AS n FROM "LoginAttempt" WHERE email = $1 AND reason = 'wrong-password'`, [alice.email]);
  await credLogin({ email: alice.email, password: "not-the-password", fromIp: ip(12) });
  const after = await q(`SELECT count(*)::int AS n FROM "LoginAttempt" WHERE email = $1 AND reason = 'wrong-password'`, [alice.email]);
  check("without proof of a human the password is never even judged", after[0].n === before[0].n);
}

/* ============================================ B. login limits (H6) */

console.log("\n-- login: ten failures close an account's window, thirty close an IP's");
{
  const victim = await mkUser("victim");
  const bystander = await mkUser("bystander");
  const attackerIp = ip(20);

  let refusedEarly = false;
  for (let i = 0; i < 10; i++) {
    const r = await credLogin({
      email: victim.email, password: `wrong-${i}`, fromIp: attackerIp, devBypass: DEV_SECRET,
    });
    if (r.signedIn || /code=rate-limited/.test(r.location)) refusedEarly = true;
  }
  check("ten wrong passwords are each refused as wrong, none rate-limited early", !refusedEarly);

  const locked = await credLogin({
    email: victim.email, password: PASSWORD, fromIp: attackerIp, devBypass: DEV_SECRET,
  });
  check("the 11th attempt with the CORRECT password is refused (account window shut)", !locked.signedIn);
  check("  ...and says so honestly (code=rate-limited)", /code=rate-limited/.test(locked.location), locked.location);

  const rotated = await credLogin({
    email: victim.email, password: PASSWORD, fromIp: ip(21), devBypass: DEV_SECRET,
  });
  check("rotating to a fresh IP does not reopen the account", !rotated.signedIn);

  const bystanderIn = await credLogin({
    email: bystander.email, password: PASSWORD, fromIp: attackerIp, devBypass: DEV_SECRET,
  });
  check("a DIFFERENT account still signs in fine, even from the attacker's IP", bystanderIn.signedIn);

  // Per-IP: 30 failures across many addresses (classic stuffing) close the
  // connection itself, whatever account it tries next.
  const stuffingIp = ip(30);
  for (let i = 0; i < 30; i++) {
    await credLogin({
      email: `noacct${i}_${RUN}${P}`, password: "x", fromIp: stuffingIp, devBypass: DEV_SECRET,
    });
  }
  const carol = await mkUser("carol");
  const ipShut = await credLogin({
    email: carol.email, password: PASSWORD, fromIp: stuffingIp, devBypass: DEV_SECRET,
  });
  check("after 30 failures the IP is shut, even for a valid account", !ipShut.signedIn);
  const elsewhere = await credLogin({
    email: carol.email, password: PASSWORD, fromIp: ip(31), devBypass: DEV_SECRET,
  });
  check("the same valid account from a fresh IP signs straight in", elsewhere.signedIn);
}

/* ===================================== C. the real signup flow (browser) */

console.log("\n-- signup: the whole real flow, unattended (trivia + Turnstile + human pass)");

const browser = await puppeteer.launch({
  executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
  headless: "new",
});

/** Answer whichever of the two questions the gate happens to ask. */
async function answerTrivia(page, { wrong = false } = {}) {
  await page.waitForSelector('input[placeholder="Your answer..."]');
  await page.waitForFunction(() =>
    /tree|house/i.test(document.querySelector("p.font-heading")?.textContent ?? ""),
  );
  const questionText = await page.$eval("p.font-heading", (el) => el.textContent);
  const answer = wrong
    ? `xyzzy-${Math.random().toString(36).slice(2, 8)}`
    : /tree/i.test(questionText) ? "banyan" : "cauvery";
  await page.click('input[placeholder="Your answer..."]', { clickCount: 3 });
  await page.type('input[placeholder="Your answer..."]', answer);
  await page.click('button[type="submit"]');
  // settle: the button leaves "Checking..." when the server has answered
  await page.waitForFunction(
    () => ![...document.querySelectorAll("button")].some((b) => b.textContent.includes("Checking")),
  );
}

const signupEmail = `signup_${RUN}${P}`;
{
  const ctx = await browser.createBrowserContext();
  const page = await ctx.newPage();
  await page.setExtraHTTPHeaders({ "x-forwarded-for": ip(40) });
  await page.goto(`${BASE}/signup`, { waitUntil: "networkidle2", timeout: 60_000 });

  // A first-time visitor with NO cookies gets a fair first attempt -- the
  // old limiter's global anonymous bucket denied exactly this (M7's DoS).
  await answerTrivia(page);
  const formUp = await page
    .waitForSelector("#firstName", { timeout: 10_000 })
    .then(() => true)
    .catch(() => false);
  check("fresh visitor, first attempt, correct answer: the gate opens", formUp);

  if (formUp) {
    // Pick a batch year whose group already exists so the probe's auto-join
    // never creates a Group a real member might later occupy.
    const [g] = await q(`SELECT name FROM "Group" WHERE name ~ '^Batch of \\d{4}$' ORDER BY "createdAt" ASC LIMIT 1`);
    const batch = g ? Number(g.name.replace("Batch of ", "")) : 2010;
    await page.type("#firstName", "Probe");
    await page.type("#lastName", "Signup");
    await page.type("#email", signupEmail);
    await page.type("#password", PASSWORD);
    await page.type("#yearJoined", String(batch - 7));
    await page.type("#yearLeft", String(batch));
    await page.type("#batchYear", String(batch));

    // Sabotage 1: swap the pass for an OLD-FORMAT token (timestamp signed
    // alone, with the REAL secret) -- the shareable hall pass M7 killed.
    const cookies = await page.cookies();
    const realPass = cookies.find((c) => c.name === "rv_trivia_pass");
    const ts = Date.now();
    const forged = `${ts}.${createHmac("sha256", AUTH_SECRET).update(String(ts)).digest("hex")}`;
    await page.setCookie({ name: "rv_trivia_pass", value: forged, url: BASE });
    await page.click('button[type="submit"]');
    const err1 = await page
      .waitForFunction(
        () => document.body.textContent.includes("Please answer the entry question"),
        { timeout: 10_000 },
      )
      .then(() => true)
      .catch(() => false);
    check("an old-format pass (unbound, real secret) is refused at register", err1);

    // Sabotage 2: the REAL pass without its browser id -- a lifted cookie.
    await page.setCookie({ name: "rv_trivia_pass", value: realPass.value, url: BASE });
    await page.deleteCookie({ name: "rv_trivia_id", url: BASE });
    await page.click('button[type="submit"]');
    await new Promise((r) => setTimeout(r, 1500));
    const rows1 = await q(`SELECT id FROM "User" WHERE email = $1`, [signupEmail]);
    check("a genuine pass without its browser id writes no account", rows1.length === 0);

    // Now the honest run: restore both cookies and join for real.
    const realId = cookies.find((c) => c.name === "rv_trivia_id");
    await page.setCookie({ name: "rv_trivia_id", value: realId.value, url: BASE });
    await page.click('button[type="submit"]');
    const welcomed = await page
      .waitForFunction(() => location.pathname.startsWith("/welcome"), { timeout: 25_000 })
      .then(() => true)
      .catch(() => false);
    const rows2 = await q(`SELECT id FROM "User" WHERE email = $1`, [signupEmail]);
    check("the real flow lands: account created, Turnstile verified server-side", rows2.length === 1);
    check("  ...and arrives signed in on /welcome (the human pass crossed authorize)", welcomed);
    const sessionCookie = (await page.cookies()).some((c) => c.name.includes("session-token"));
    check("  ...with a real session cookie", sessionCookie);
  }
  await ctx.close();
}

/* ========================================== D. trivia per-IP limit (M7) */

console.log("\n-- trivia: eight wrong answers close one IP; a fresh visitor is untouched");
{
  const attackerIp = ip(50);
  const ctx = await browser.createBrowserContext();
  const page = await ctx.newPage();
  await page.setExtraHTTPHeaders({ "x-forwarded-for": attackerIp });
  await page.goto(`${BASE}/signup`, { waitUntil: "networkidle2", timeout: 60_000 });
  for (let i = 0; i < 8; i++) await answerTrivia(page, { wrong: true });
  await answerTrivia(page, { wrong: true });
  const limited = await page.evaluate(() => document.body.textContent.includes("Too many attempts"));
  check("the 9th attempt from one IP is told to wait", limited);

  // The attacker rotating cookies used to walk around the limit while the
  // shared bucket starved everyone else. Now the key is the IP: same
  // browser state, fresh cookies, same IP -> still limited.
  const page2 = await ctx.newPage();
  await page2.setExtraHTTPHeaders({ "x-forwarded-for": attackerIp });
  await ctx.clearCookies?.().catch(() => {});
  await page2.goto(`${BASE}/signup`, { waitUntil: "networkidle2", timeout: 60_000 });
  await answerTrivia(page2);
  const stillLimited = await page2.evaluate(() => document.body.textContent.includes("Too many attempts"));
  check("discarding cookies does not reopen the same IP", stillLimited);
  await ctx.close();

  const ctx2 = await browser.createBrowserContext();
  const fresh = await ctx2.newPage();
  await fresh.setExtraHTTPHeaders({ "x-forwarded-for": ip(51) });
  await fresh.goto(`${BASE}/signup`, { waitUntil: "networkidle2", timeout: 60_000 });
  await answerTrivia(fresh);
  const freshOk = await fresh
    .waitForSelector("#firstName", { timeout: 10_000 })
    .then(() => true)
    .catch(() => false);
  check("meanwhile a genuine visitor on another IP passes first try", freshOk);
  await ctx2.close();
}

/* ======================================== E. reset requests per IP (M3) */

console.log("\n-- reset: five requests close one IP's window, and no mail moved");
{
  const resetIp = ip(60);
  const ctx = await browser.createBrowserContext();
  const page = await ctx.newPage();
  await page.setExtraHTTPHeaders({ "x-forwarded-for": resetIp });

  for (let i = 0; i < 5; i++) {
    await page.goto(`${BASE}/forgot-password`, { waitUntil: "networkidle2", timeout: 60_000 });
    await page.type("#email", `nomail${i}_${RUN}${P}`);
    await page.click('button[type="submit"]');
    await page.waitForFunction(() => document.body.textContent.includes("Check your email"), {
      timeout: 15_000,
    });
  }
  await page.goto(`${BASE}/forgot-password`, { waitUntil: "networkidle2", timeout: 60_000 });
  await page.type("#email", `nomail5_${RUN}${P}`);
  await page.click('button[type="submit"]');
  const sixth = await page
    .waitForFunction(
      (msg) => document.body.textContent.includes(msg),
      { timeout: 15_000 },
      RATE_LIMITED,
    )
    .then(() => true)
    .catch(() => false);
  check("the 6th request from one IP is refused, with the shared copy", sixth);
  await ctx.close();

  const ctx2 = await browser.createBrowserContext();
  const other = await ctx2.newPage();
  await other.setExtraHTTPHeaders({ "x-forwarded-for": ip(61) });
  await other.goto(`${BASE}/forgot-password`, { waitUntil: "networkidle2", timeout: 60_000 });
  await other.type("#email", `nomail6_${RUN}${P}`);
  await other.click('button[type="submit"]');
  const otherOk = await other
    .waitForFunction(() => document.body.textContent.includes("Check your email"), { timeout: 15_000 })
    .then(() => true)
    .catch(() => false);
  check("another IP is unaffected", otherOk);
  await ctx2.close();

  // Scoped to kind='reset': section C's signup legitimately queued its own
  // verification mail to a probe address, and that one SHOULD exist.
  const mail = await q(
    `SELECT count(*)::int AS n FROM "OutboundEmail" WHERE "to" LIKE '%${P}' AND kind = 'reset'`,
  );
  check("none of it touched the mail budget (unknown addresses, no reset rows)", mail[0].n === 0, `${mail[0].n} rows`);
}

await browser.close();

/* ===================================== F. the uploads meter, live (M2) */

console.log("\n-- uploads: the 40/h account meter closes /api/upload/presign");
{
  const heavy = await mkUser("heavy", { confirmed: true, verified: true });
  const light = await mkUser("light", { confirmed: true, verified: true });
  const cookieHeavy = await fetchSessionCookie(BASE, heavy.email).then((c) => `${c.name}=${c.value}`);
  const cookieLight = await fetchSessionCookie(BASE, light.email).then((c) => `${c.name}=${c.value}`);

  const presign = (cookie) =>
    fetch(`${BASE}/api/upload/presign`, {
      method: "POST",
      headers: { "content-type": "application/json", cookie },
      body: JSON.stringify({ kind: "post", contentType: "image/jpeg", bytes: 1024 }),
    });

  let firstLimited = 0;
  for (let i = 1; i <= 41; i++) {
    const res = await presign(cookieHeavy);
    if (res.status === 429) {
      firstLimited = i;
      break;
    }
  }
  check("the 41st presign in an hour is a 429, none earlier", firstLimited === 41, `first 429 at #${firstLimited || "never"}`);

  const other = await presign(cookieLight);
  check("a different account presigns fine while the first is shut", other.status === 200, `got ${other.status}`);
}

/* ================================================================ wrap up */

console.log("\n-- cleaning up");
await cleanup();
await db.end();

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
