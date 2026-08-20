/**
 * Phase 3 behavioural probe: the two-gate trust model (audit H21 + the
 * harvesting half of M1), proved against the RUNNING dev server.
 *
 * Static checks cannot catch the class of bug that matters here -- Phase 2's
 * probe found a lockout that typechecked perfectly -- so every claim below is
 * made by a real HTTP request from a real signed-in session at each trust
 * tier, or by driving the real UI in a browser. The tiers:
 *
 *   Stage 0  account exists, email NOT confirmed  -> may read feed + map only
 *   Stage 1  email confirmed, profile unverified  -> directory names, profiles
 *   Stage 2  profile verified                     -> writes + contact details
 *
 * Creates its own disposable accounts (…@probe.invalid), signs each one in
 * through /api/dev-login, runs the checks, and deletes everything it made.
 * Safe to re-run; it cleans up leftovers from a crashed run first.
 *
 * Usage: node scripts/qa/phase3-probe.mjs
 * Needs: dev server on :3000, DEV_LOGIN_SECRET in .env.
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash, randomBytes } from "node:crypto";
import pg from "pg";
import bcrypt from "bcryptjs";
import puppeteer from "puppeteer";
import { fetchSessionCookie } from "./_dev-login.mjs";
import { EMAIL_UNVERIFIED } from "../../src/lib/email-gate-message.ts";
import { MEMBER_UNVERIFIED } from "../../src/lib/member-gate-message.ts";

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

const P = "@probe.invalid"; // no MX, nothing can ever be mailed here
const PASSWORD = "probe-password-1";
const hash = bcrypt.hashSync(PASSWORD, 4); // cheap cost: rows die in minutes

async function cleanup() {
  const ids = (await q(`SELECT id FROM "User" WHERE email LIKE '%${P}'`)).map((r) => r.id);
  if (ids.length) {
    await db.query(`DELETE FROM "Comment" WHERE "authorId" = ANY($1)`, [ids]);
    await db.query(`DELETE FROM "Like" WHERE "userId" = ANY($1)`, [ids]);
    await db.query(`DELETE FROM "Post" WHERE "authorId" = ANY($1)`, [ids]);
    await db.query(`DELETE FROM "AuthToken" WHERE "userId" = ANY($1)`, [ids]);
    await db.query(`DELETE FROM "Session" WHERE "userId" = ANY($1)`, [ids]);
    await db.query(`DELETE FROM "User" WHERE id = ANY($1)`, [ids]);
  }
  await db.query(`DELETE FROM "RosterEntry" WHERE source = 'phase3-probe'`).catch(() => {});
}
await cleanup();

/** Insert a probe user and return its id. */
async function mkUser(slug, { confirmed = false, verified = false, batchYear = null, name } = {}) {
  const id = `probe_${slug}_${randomBytes(4).toString("hex")}`;
  await db.query(
    `INSERT INTO "User" (id, name, email, password, "emailVerified", "verifyState", "batchYear", "updatedAt")
     VALUES ($1, $2, $3, $4, $5, $6, $7, now())`,
    [
      id,
      name ?? `Probe ${slug}`,
      `${slug}${P}`,
      hash,
      confirmed ? new Date() : null,
      verified ? "verified" : "unverified",
      batchYear,
    ]
  );
  return id;
}

/** A session cookie for a probe user, as a fetch()-ready header value. */
async function cookieFor(slug) {
  const c = await fetchSessionCookie(BASE, `${slug}${P}`);
  return `${c.name}=${c.value}`;
}

const get = (path, cookie) =>
  fetch(new URL(path, BASE), { headers: cookie ? { cookie } : {}, redirect: "manual" });

/* ------------------------------------------------------- reference member */

// A real verified member whose name/job/contact the tiers should and should
// not see. Picked for having the most on file so the serialization checks
// have something to look for.
const [ref] = await q(
  `SELECT id, name, email, "displayEmail", phone, phones, "jobTitle", "batchYear"
   FROM "User"
   WHERE "verifyState" = 'verified' AND "isBlocked" = false
     AND "jobTitle" IS NOT NULL AND email NOT LIKE '%${P}'
     AND id IN (SELECT "userId" FROM "UserPlace")
   ORDER BY (phone IS NOT NULL) DESC, "createdAt" ASC LIMIT 1`
);
if (!ref) throw new Error("no verified reference member with a jobTitle and a place on file");
const refContactEmail = (ref.displayEmail || "").trim() || ref.email;
console.log(`reference member: ${ref.name} (${ref.id})`);

// A visible post to comment on: newest published, ungrouped, unscoped post.
const [refPost] = await q(
  `SELECT id FROM "Post"
   WHERE "isHidden" = false AND "groupId" IS NULL AND status = 'published'
     AND "cityScope" IS NULL
   ORDER BY "createdAt" DESC LIMIT 1`
);
if (!refPost) throw new Error("no visible reference post to comment on");

/* ================================================================= stages */

console.log("\n-- creating disposable accounts");
const u0 = await mkUser("stage0");
const u1 = await mkUser("stage1", { confirmed: true });
const u2 = await mkUser("stage2", { confirmed: true, verified: true });
const c0 = await cookieFor("stage0");
const c1 = await cookieFor("stage1");
const c2 = await cookieFor("stage2");

/* ---------------------------------------------------- Stage 0: read-only */

console.log("\n-- Stage 0 (email unconfirmed): sees the site, not the people");
{
  const feed = await get("/feed", c0);
  check("stage0 can read the feed (200)", feed.status === 200, `got ${feed.status}`);

  const dir = await get("/directory", c0);
  const dirHtml = await dir.text();
  check("stage0 /directory renders (200)", dir.status === 200, `got ${dir.status}`);
  check(
    "stage0 /directory serializes no member names",
    !dirHtml.includes(ref.name),
    `page source contains "${ref.name}"`
  );

  const search = await get(`/api/users/search?q=${encodeURIComponent(ref.name.slice(0, 4))}`, c0);
  check("stage0 /api/users/search refused", search.status === 403, `got ${search.status}`);

  const batch = await get(
    `/api/users-by-batch?year=${ref.batchYear ?? 2010}`,
    c0
  );
  check("stage0 /api/users-by-batch refused", batch.status === 403, `got ${batch.status}`);

  const prof = await get(`/profile/${ref.id}`, c0);
  const profHtml = await prof.text();
  check(
    "stage0 profile page withholds the member's details",
    !profHtml.includes(ref.jobTitle) && !profHtml.includes(refContactEmail),
    "job title or contact email found in page source"
  );
}

/* ------------------------------------- Stage 1: people yes, contacts no */

console.log("\n-- Stage 1 (confirmed, unverified): directory yes, writes and contacts no");
{
  const dir = await get("/directory", c1);
  const dirHtml = await dir.text();
  check("stage1 /directory shows member names", dirHtml.includes(ref.name));

  const search = await get(`/api/users/search?q=${encodeURIComponent(ref.name.slice(0, 4))}`, c1);
  check("stage1 /api/users/search allowed", search.status === 200, `got ${search.status}`);

  const prof = await get(`/profile/${ref.id}`, c1);
  const profHtml = await prof.text();
  check("stage1 profile page renders the member", profHtml.includes(ref.name));
  const phones = [ref.phone, ...(ref.phones ? JSON.parse(ref.phones) : [])].filter(Boolean);
  check(
    "stage1 profile page serializes no contact details",
    !profHtml.includes(refContactEmail) && phones.every((p) => !profHtml.includes(p)),
    "contact email or phone found in page source"
  );

  const upload = await get2("/api/upload", c1);
  check(
    "stage1 upload refused with the member sentinel",
    upload.body?.error === MEMBER_UNVERIFIED,
    `got ${upload.status}: ${JSON.stringify(upload.body)?.slice(0, 120)}`
  );
}

/* ------------------------------------------------ Stage 2: writes open */

console.log("\n-- Stage 2 (verified): writes and contacts open");
{
  const prof = await get(`/profile/${ref.id}`, c2);
  const profHtml = await prof.text();
  check("stage2 profile page serializes contact details", profHtml.includes(refContactEmail));

  const upload = await get2("/api/upload", c2);
  check(
    "stage2 upload passes the gate (fails on the missing file, not the tier)",
    upload.body?.error !== MEMBER_UNVERIFIED && upload.body?.error !== EMAIL_UNVERIFIED,
    `got ${JSON.stringify(upload.body)?.slice(0, 120)}`
  );
}

/** POST an empty multipart form, return { status, body } with json body. */
async function get2(path, cookie) {
  const res = await fetch(new URL(path, BASE), {
    method: "POST",
    headers: { cookie },
    body: new FormData(),
  });
  let body = null;
  try {
    body = await res.json();
  } catch {
    /* non-json refusal */
  }
  return { status: res.status, body };
}

/* --------------------------------- the real UI: comment attempt per tier */

console.log("\n-- driving the real feed UI");
{
  const browser = await puppeteer.launch({
    headless: "new",
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
  });
  try {
    const drive = async (slug, text) => {
      const page = await browser.newPage();
      const c = await fetchSessionCookie(BASE, `${slug}${P}`);
      await page.setCookie({ name: c.name, value: c.value, url: BASE, httpOnly: true, path: "/" });
      await page.goto(`${BASE}/feed`, { waitUntil: "networkidle2", timeout: 60_000 });
      await page.waitForSelector('button[aria-label="Show comments"]', { timeout: 30_000 });
      await page.click('button[aria-label="Show comments"]');
      await page.waitForSelector('input[placeholder="Write a comment..."]', { timeout: 15_000 });
      await page.type('input[placeholder="Write a comment..."]', text);
      await page.keyboard.press("Enter");
      await new Promise((r) => setTimeout(r, 2500));
      const bodyText = await page.evaluate(() => document.body.innerText);
      return { page, bodyText };
    };

    // Stage 1: the comment must be refused and the member-gate card shown.
    const marker1 = `phase3 probe stage1 ${Date.now()}`;
    const { page: p1, bodyText: t1 } = await drive("stage1", marker1);
    const rows1 = await q(`SELECT id FROM "Comment" WHERE content = $1`, [marker1]);
    check("stage1 comment refused (no row written)", rows1.length === 0, "comment row exists");
    check(
      "stage1 refusal shows the verification card",
      t1.includes("verif") || t1.includes("Verif"),
      "no verification copy on screen after refusal"
    );

    // …and the card's button files a verification request.
    const asked = await p1.evaluate(() => {
      const btn = [...document.querySelectorAll("button")].find((b) =>
        (b.textContent || "").includes("Ask to be verified")
      );
      if (btn) btn.click();
      return !!btn;
    });
    await new Promise((r) => setTimeout(r, 2000));
    const [u1row] = await q(`SELECT "verifyState" FROM "User" WHERE id = $1`, [u1]);
    check(
      "stage1 'Ask to be verified' writes verifyState pending",
      asked && u1row.verifyState === "pending",
      asked ? `verifyState is ${u1row.verifyState}` : "button not found"
    );
    await p1.close();

    // Stage 2: the same gesture lands.
    const marker2 = `phase3 probe stage2 ${Date.now()}`;
    const { page: p2 } = await drive("stage2", marker2);
    const rows2 = await q(`SELECT id FROM "Comment" WHERE content = $1`, [marker2]);
    check("stage2 comment lands (row written)", rows2.length === 1);
    await p2.close();
  } finally {
    await browser.close();
  }
}

/* -------------------------------------- pending request reaches the admin */

{
  const admin = await fetchSessionCookie(BASE); // ADMIN_EMAIL
  const res = await get("/admin", `${admin.name}=${admin.value}`);
  const html = await res.text();
  check(
    "admin worklist surfaces the pending request",
    html.includes("Probe stage1"),
    "pending member not named on /admin"
  );
}

/* --------------------------------------------- roster: office_list verify */

console.log("\n-- roster auto-verification through the real /verify-email link");

/** Mint a confirmation token the way auth-tokens.ts does, straight into the DB. */
async function mintVerifyToken(userId, email) {
  const raw = randomBytes(32).toString("base64url");
  await db.query(
    `INSERT INTO "AuthToken" (id, "userId", kind, "tokenHash", "sentTo", "expiresAt", "createdAt")
     VALUES ($1, $2, 'verify', $3, $4, now() + interval '1 day', now())`,
    [`probe_tok_${randomBytes(6).toString("hex")}`, userId, createHash("sha256").update(raw).digest("hex"), email]
  );
  return raw;
}

async function confirmAndRead(slug, userId) {
  const token = await mintVerifyToken(userId, `${slug}${P}`);
  const res = await get(`/verify-email?token=${token}`);
  await res.text();
  const [row] = await q(
    `SELECT "emailVerified" IS NOT NULL AS confirmed, "verifyState", "verifyMethod",
            "admissionNumber", houses
     FROM "User" WHERE id = $1`,
    [userId]
  );
  return row;
}

{
  // r1: email is on the roster -> confirming the address verifies the member.
  const r1 = await mkUser("roster-email");
  await db.query(
    `INSERT INTO "RosterEntry" (id, "fullName", "normalizedName", email, "batchYear", source, "createdAt")
     VALUES ($1, 'Probe roster-email', 'probe roster email', $2, NULL, 'phase3-probe', now())`,
    [`probe_re_${randomBytes(4).toString("hex")}`, `roster-email${P}`]
  );
  const row1 = await confirmAndRead("roster-email", r1);
  check(
    "roster email match auto-verifies on confirmation",
    row1.confirmed && row1.verifyState === "verified" && row1.verifyMethod === "office_list",
    `state=${row1.verifyState} method=${row1.verifyMethod}`
  );
  check(
    "roster match fills no admission number or house",
    row1.admissionNumber === null && row1.houses === null
  );

  // r2: no email on the sheet, but name + batch year match.
  const r2 = await mkUser("roster-name", { batchYear: 1999, name: "Probe Rostername" });
  await db.query(
    `INSERT INTO "RosterEntry" (id, "fullName", "normalizedName", email, "batchYear", source, "createdAt")
     VALUES ($1, 'Probe  ROSTERNAME', 'probe rostername', NULL, 1999, 'phase3-probe', now())`,
    [`probe_rn_${randomBytes(4).toString("hex")}`]
  );
  const row2 = await confirmAndRead("roster-name", r2);
  check(
    "roster name+batch match auto-verifies on confirmation",
    row2.confirmed && row2.verifyState === "verified" && row2.verifyMethod === "office_list",
    `state=${row2.verifyState} method=${row2.verifyMethod}`
  );

  // r3: on no list at all -> confirmed, still unverified.
  const r3 = await mkUser("roster-none");
  const row3 = await confirmAndRead("roster-none", r3);
  check(
    "no roster match stays unverified after confirmation",
    row3.confirmed && row3.verifyState === "unverified",
    `state=${row3.verifyState}`
  );
}

/* ------------------------------------------------------------------ done */

await cleanup();
await db.end();

console.log(`\n${pass}/${pass + fail} passed`);
process.exit(fail === 0 ? 0 : 1);
