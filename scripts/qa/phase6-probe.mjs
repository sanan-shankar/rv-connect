/**
 * Phase 6 behavioural probe: headers, dependencies, quick highs
 * (audit H7, C3, H18, M19, M27, M32, M18), proved against the running server.
 *
 * The one that most needs proving is C3: the auth library moved beta.30 ->
 * beta.32 and Next moved 16.2 -> 16.3. A static check cannot tell whether
 * authentication still works after that, so this signs a real account in
 * through the real credentials callback and confirms the minted session opens
 * a members-only route.
 *
 * Usage: node scripts/qa/phase6-probe.mjs
 * Needs: dev server on :3000, DEV_LOGIN_SECRET in .env.
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes } from "node:crypto";
import pg from "pg";
import bcrypt from "bcryptjs";
import { createId } from "@paralleldrive/cuid2";
import { fetchSessionCookie } from "./_dev-login.mjs";
import { credLogin, makeLedger } from "./_probe-kit.mjs";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
process.chdir(repoRoot);
const BASE = "http://localhost:3000";

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
const PW = "probe-password-1";
const hash = bcrypt.hashSync(PW, 4);
const DEV = process.env.DEV_LOGIN_SECRET;

async function cleanup() {
  const ids = (await q(`SELECT id FROM "User" WHERE email LIKE '%${P}'`)).map((r) => r.id);
  if (!ids.length) return;
  await db.query(`DELETE FROM "Session" WHERE "userId" = ANY($1)`, [ids]).catch(() => {});
  await db.query(`DELETE FROM "LoginAttempt" WHERE identifier = ANY($1)`, [ids]).catch(() => {});
  await db.query(`DELETE FROM "User" WHERE id = ANY($1)`, [ids]);
}
await cleanup();

async function mkUser(slug, { confirmed = false, verified = false } = {}) {
  const id = createId();
  await db.query(
    `INSERT INTO "User" (id, name, email, password, "emailVerified", "verifyState", "updatedAt")
     VALUES ($1,$2,$3,$4,$5,$6, now())`,
    [id, `Probe ${slug}`, `${slug}${P}`, hash, confirmed ? new Date() : null, verified ? "verified" : "unverified"]
  );
  return id;
}
const get = (path, cookie) =>
  fetch(new URL(path, BASE), { headers: cookie ? { cookie } : {}, redirect: "manual" });

/* ============================================ 1. H7: headers present */
console.log("\n-- H7: security headers on every response");
{
  const res = await fetch(`${BASE}/login`);
  const h = res.headers;
  const csp = h.get("content-security-policy") ?? "";
  L.check("Content-Security-Policy present with frame-ancestors 'none'", /frame-ancestors 'none'/.test(csp));
  L.check("CSP allows Turnstile + Razorpay script hosts", /challenges\.cloudflare\.com/.test(csp) && /checkout\.razorpay\.com/.test(csp));
  L.check("X-Frame-Options: DENY", h.get("x-frame-options") === "DENY");
  L.check("Referrer-Policy set", h.get("referrer-policy") === "strict-origin-when-cross-origin");
  L.check("X-Content-Type-Options: nosniff", h.get("x-content-type-options") === "nosniff");
  L.check("Permissions-Policy present", /geolocation=\(\)/.test(h.get("permissions-policy") ?? ""));
}

/* ============================================ 2. C3: auth still works */
console.log("\n-- C3: next-auth beta.32 still authenticates a real login");
{
  const u = await mkUser("c3login", { confirmed: true, verified: true });
  // The bot check is crossed with the dev bypass (Phase 4 mechanism), so this
  // exercises the real authorize() -> session path under the upgraded library.
  const login = await credLogin(BASE, { email: `c3login${P}`, password: PW, fromIp: "203.0.113.60", devBypass: DEV });
  L.check("a real credentials login mints a session", login.signedIn, `location ${login.location}`);
  if (login.signedIn) {
    const c = await fetchSessionCookie(BASE, `c3login${P}`);
    const feed = await get("/feed", `${c.name}=${c.value}`);
    L.check("the minted session opens a members-only route (/feed 200)", feed.status === 200, `got ${feed.status}`);
  }
  // Negative control: a wrong password mints nothing (the guard is not failing open).
  const bad = await credLogin(BASE, { email: `c3login${P}`, password: "wrong-password", fromIp: "203.0.113.61", devBypass: DEV });
  L.check("a wrong password mints no session (auth not failing open)", !bad.signedIn);
  void u;
}

/* ============================================ 3. M19: /lab admin-only */
console.log("\n-- M19: /lab is admin-gated, not public");
{
  const anon = await get("/lab");
  L.check("/lab signed out redirects to login (no longer public)", anon.status === 307 || anon.status === 302, `got ${anon.status}`);

  const u1 = await mkUser("labuser", { confirmed: true, verified: true });
  const c1 = await fetchSessionCookie(BASE, `labuser${P}`);
  const nonAdmin = await get("/lab", `${c1.name}=${c1.value}`);
  L.check("/lab as a non-admin member is 404 (existence hidden)", nonAdmin.status === 404, `got ${nonAdmin.status}`);
  void u1;

  const admin = await fetchSessionCookie(BASE); // ADMIN_EMAIL
  const adminRes = await get("/lab", `${admin.name}=${admin.value}`);
  L.check("/lab as an admin renders (200)", adminRes.status === 200, `got ${adminRes.status}`);
}

/* ============================================ 4. M27: cron route secured */
console.log("\n-- M27: /api/catchups/tick exists and requires the cron secret");
{
  const noAuth = await fetch(`${BASE}/api/catchups/tick`);
  L.check("the tick route exists and refuses an unauthenticated call (401, not 404)", noAuth.status === 401, `got ${noAuth.status}`);

  const wrong = await fetch(`${BASE}/api/catchups/tick`, { headers: { authorization: "Bearer wrong-secret" } });
  L.check("a wrong cron secret is refused (401)", wrong.status === 401, `got ${wrong.status}`);

  if (process.env.CRON_SECRET) {
    const ok = await fetch(`${BASE}/api/catchups/tick`, { headers: { authorization: `Bearer ${process.env.CRON_SECRET}` } });
    L.check("the correct cron secret runs the tick (200)", ok.status === 200, `got ${ok.status}`);
  } else {
    console.log("  note: CRON_SECRET not set in .env; the 200 path is owner-config, not probed");
  }
}

/* ============================================ 5. H18: users-by-batch bounded but working */
console.log("\n-- H18: users-by-batch still returns for a real batch");
{
  const admin = await fetchSessionCookie(BASE);
  const [{ y }] = await q(`SELECT "batchYear" y FROM "User" WHERE "batchYear" IS NOT NULL GROUP BY "batchYear" ORDER BY count(*) DESC LIMIT 1`);
  const res = await get(`/api/users-by-batch?batches=${y}&detail=1`, `${admin.name}=${admin.value}`);
  const body = await res.json().catch(() => ({}));
  L.check("a normal batch query still returns users (the take did not break it)", res.status === 200 && Array.isArray(body.users) && body.users.length > 0, `status ${res.status}, ${body.users?.length} users`);
}

await cleanup();
await db.end();
L.finish();
