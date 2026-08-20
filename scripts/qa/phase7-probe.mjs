/**
 * Phase 7 behavioural probe: audit log and admin accountability
 * (audit H10, H14, M36, H5), proved against the running server.
 *
 *  - the audit VIEW is admin-only and renders (H14);
 *  - a real admin action (Verify) writes an ATTRIBUTED AuditLog row and then
 *    shows up on the view (H10 end to end: who did what, to whom);
 *  - the Report per-pair unique actually rejects a duplicate flag (H5).
 *
 * Usage: node scripts/qa/phase7-probe.mjs
 * Needs: dev server on :3000, DEV_LOGIN_SECRET + ADMIN_EMAIL in .env.
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes } from "node:crypto";
import pg from "pg";
import bcrypt from "bcryptjs";
import { createId } from "@paralleldrive/cuid2";
import puppeteer from "puppeteer";
import { fetchSessionCookie } from "./_dev-login.mjs";
import { makeLedger } from "./_probe-kit.mjs";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
process.chdir(repoRoot);
const BASE = "http://localhost:3000";
process.env.PUPPETEER_EXECUTABLE_PATH ||= "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

for (const line of readFileSync(resolve(repoRoot, ".env"), "utf8").split("\n")) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (!m) continue;
  let v = m[2];
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
  if (!(m[1] in process.env)) process.env[m[1]] = v;
}

const db = new pg.Client({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL });
await db.connect();
const q = (t, p) => db.query(t, p).then((r) => r.rows);
const L = makeLedger();

const P = "@probe.invalid";
const hash = bcrypt.hashSync("probe-password-1", 4);

async function cleanup() {
  const ids = (await q(`SELECT id FROM "User" WHERE email LIKE '%${P}'`)).map((r) => r.id);
  if (ids.length) {
    await db.query(`DELETE FROM "AuditLog" WHERE "actorId" = ANY($1) OR "targetId" = ANY($1)`, [ids]).catch(() => {});
    await db.query(`DELETE FROM "Report" WHERE "reporterId" = ANY($1) OR "reportedUserId" = ANY($1)`, [ids]).catch(() => {});
    await db.query(`DELETE FROM "Session" WHERE "userId" = ANY($1)`, [ids]).catch(() => {});
    await db.query(`DELETE FROM "User" WHERE id = ANY($1)`, [ids]);
  }
}
await cleanup();

async function mkUser(slug, { verified = false } = {}) {
  const id = createId();
  await db.query(
    `INSERT INTO "User" (id, name, email, password, "emailVerified", "verifyState", "batchYear", "updatedAt")
     VALUES ($1,$2,$3,$4, now(), $5, 2001, now())`,
    [id, `Probe ${slug}`, `${slug}${P}`, hash, verified ? "verified" : "unverified"]
  );
  return id;
}
const get = (path, cookie) =>
  fetch(new URL(path, BASE), { headers: cookie ? { cookie } : {}, redirect: "manual" });

const admin = await fetchSessionCookie(BASE); // ADMIN_EMAIL
const adminCookie = `${admin.name}=${admin.value}`;
const [adminRow] = await q(`SELECT id FROM "User" WHERE email = $1`, [process.env.ADMIN_EMAIL]);
const adminId = adminRow.id;

/* ============================================ 1. H14: audit view is admin-only */
console.log("\n-- H14: the audit view is admin-gated");
{
  const anon = await get("/admin/audit");
  L.check("/admin/audit signed out redirects", anon.status === 307 || anon.status === 302, `got ${anon.status}`);

  const member = await mkUser("auditmember", { verified: true });
  const mc = await fetchSessionCookie(BASE, `auditmember${P}`);
  const asMember = await get("/admin/audit", `${mc.name}=${mc.value}`);
  // The admin layout redirects a non-admin to /feed.
  L.check("/admin/audit as a non-admin member is redirected", asMember.status === 307 || asMember.status === 302, `got ${asMember.status}`);
  void member;

  const asAdmin = await get("/admin/audit", adminCookie);
  const html = await asAdmin.text();
  L.check("/admin/audit as admin renders the page", asAdmin.status === 200 && html.includes("Audit log"), `got ${asAdmin.status}`);
}

/* ============================================ 2. H5: the per-pair report unique */
console.log("\n-- H5: a duplicate flag of the same person is rejected by the DB");
{
  const reporter = await mkUser("h5reporter", { verified: true });
  const reported = await mkUser("h5reported", { verified: true });
  const mkReport = (rep, target) =>
    db.query(
      `INSERT INTO "Report" (id, reason, "reporterId", "targetType", "reportedUserId", "createdAt")
       VALUES ($1,$2,$3,'user',$4, now())`,
      [createId(), "probe", rep, target]
    );
  await mkReport(reporter, reported);
  let secondFailed = false;
  try {
    await mkReport(reporter, reported);
  } catch (e) {
    secondFailed = e.code === "23505"; // unique_violation
  }
  L.check("a second (reporter, reported) user-report is refused by the unique index", secondFailed);

  // A post report carries reportedUserId NULL; two of them must both be allowed
  // (Postgres keeps NULLs distinct), so post reporting is unaffected.
  const [post] = await q(`SELECT id FROM "Post" WHERE "isHidden" = false LIMIT 1`);
  let bothPostReportsOk = true;
  try {
    for (let i = 0; i < 2; i++) {
      await db.query(
        `INSERT INTO "Report" (id, reason, "reporterId", "targetType", "postId", "createdAt")
         VALUES ($1,'probe',$2,'post',$3, now())`,
        [createId(), reporter, post.id]
      );
    }
  } catch {
    bothPostReportsOk = false;
  }
  L.check("two post reports from one member are both allowed (NULLs stay distinct)", bothPostReportsOk);
  void reporter; void reported;
}

/* ============================================ 3. H10: a real admin action logs an attributed row */
console.log("\n-- H10: verifying a member writes an attributed audit row, and it shows on the view");
{
  const target = await mkUser("auditverify"); // unverified -> the Verify button shows
  const browser = await puppeteer.launch({ headless: "new", executablePath: process.env.PUPPETEER_EXECUTABLE_PATH });
  try {
    const page = await browser.newPage();
    await page.setCookie({ name: admin.name, value: admin.value, url: BASE, httpOnly: true, path: "/" });
    await page.goto(`${BASE}/admin/people/${target}`, { waitUntil: "networkidle2", timeout: 60_000 });
    const clicked = await page.evaluate(() => {
      const btn = [...document.querySelectorAll("button")].find((b) => (b.textContent || "").trim() === "Verify" && !b.disabled);
      if (btn) { btn.click(); return true; }
      return false;
    });
    L.check("the admin Verify button was reachable", clicked, "no Verify button on the person page");
    await new Promise((r) => setTimeout(r, 2500));

    const [row] = await q(`SELECT "verifyState" FROM "User" WHERE id = $1`, [target]);
    L.check("the member is now verified (the action ran)", row.verifyState === "verified", `state ${row.verifyState}`);

    const audit = await q(
      `SELECT "actorId","action","targetId","detail" FROM "AuditLog" WHERE action = 'admin.verify' AND "targetId" = $1`,
      [target]
    );
    L.check(
      "an admin.verify audit row was written, attributed to the admin acting on the member",
      audit.length === 1 && audit[0].actorId === adminId && audit[0].targetId === target,
      `rows ${JSON.stringify(audit)}`
    );

    // And it renders on the audit view.
    const view = await get("/admin/audit", adminCookie);
    const html = await view.text();
    L.check("the new event shows on /admin/audit as 'Verified'", html.includes("Verified"), "no 'Verified' label on the view");
  } finally {
    await browser.close();
  }
}

await cleanup();
await db.end();
L.finish();
