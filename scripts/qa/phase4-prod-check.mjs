/**
 * The production half of the Phase 4 proof, against a LOCAL production
 * build: `npm run build && AUTH_TRUST_HOST=1 npx next start -p 3100`.
 * (AUTH_TRUST_HOST stands in for what Vercel sets on the real deployment;
 * without it NextAuth's production host check 500s every auth route from
 * localhost and all five refusals would pass vacuously -- which is exactly
 * why the positive human-pass control at the bottom exists.)
 * Same standard Phase 1
 * set for /api/dev-login: a bypass that exists for the QA scripts is only
 * safe when a production build is SHOWN to refuse it.
 *
 * What only a production build can prove:
 *   - the dev bypass is dead (NODE_ENV kills it before any secret is read)
 *   - the REAL Turnstile secret is consulted: a garbage token is refused
 *     by a live siteverify round trip, not by a test key's courtesy
 *   - the human pass still works, so production login is not bricked for
 *     the two flows that legitimately carry one
 *   - /api/dev-login is a 404, with the right secret in hand (regression
 *     pin on Phase 1)
 *
 * Usage: node scripts/qa/phase4-prod-check.mjs [base-url]
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes } from "node:crypto";
import pg from "pg";
import bcrypt from "bcryptjs";
import { signHumanPass } from "../../src/lib/human-pass-rule.ts";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const BASE = process.argv[2] || "http://localhost:3100";

for (const line of readFileSync(resolve(repoRoot, ".env"), "utf8").split("\n")) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (!m) continue;
  let v = m[2];
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'")))
    v = v.slice(1, -1);
  if (!(m[1] in process.env)) process.env[m[1]] = v;
}
const AUTH_SECRET = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;

const db = new pg.Client({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL });
await db.connect();

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

const RUN = randomBytes(3).toString("hex");
const email = `prodcheck_${RUN}@probe.invalid`;
const PASSWORD = "probe-password-1";
await db.query(
  `INSERT INTO "User" (id, name, email, password, "emailVerified", "updatedAt")
   VALUES ($1, 'Probe ProdCheck', $2, $3, now(), now())`,
  [`probe4p_${RUN}`, email, bcrypt.hashSync(PASSWORD, 4)],
);

const ip = `10.99.${Math.floor(Math.random() * 200) + 1}.${Math.floor(Math.random() * 200) + 1}`;

async function credLogin({ password, turnstileToken, devBypass, cookie = "" }) {
  const csrfRes = await fetch(`${BASE}/api/auth/csrf`, { headers: { "x-forwarded-for": ip } });
  const { csrfToken } = await csrfRes.json();
  const csrfCookies = csrfRes.headers.getSetCookie().map((c) => c.split(";")[0]).join("; ");
  const body = new URLSearchParams({ csrfToken, email, password });
  if (turnstileToken) body.set("turnstileToken", turnstileToken);
  if (devBypass) body.set("devBypass", devBypass);
  const res = await fetch(`${BASE}/api/auth/callback/credentials`, {
    method: "POST",
    redirect: "manual",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      cookie: cookie ? `${csrfCookies}; ${cookie}` : csrfCookies,
      "x-forwarded-for": ip,
      origin: BASE,
    },
    body,
  });
  const signedIn = res.headers
    .getSetCookie()
    .some((c) => c.includes("session-token") && !c.includes("=;"));
  return { signedIn, location: res.headers.get("location") ?? "" };
}

console.log(`\n-- production build at ${BASE}`);
{
  const up = await fetch(BASE, { redirect: "manual" });
  check("server answers", up.status < 500, `got ${up.status}`);

  const devLogin = await fetch(`${BASE}/api/dev-login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, secret: process.env.DEV_LOGIN_SECRET }),
  });
  check("/api/dev-login is a 404 even with the correct secret (Phase 1 pin)", devLogin.status === 404, `got ${devLogin.status}`);

  const bypass = await credLogin({ password: PASSWORD, devBypass: process.env.DEV_LOGIN_SECRET });
  check("the QA bypass with the CORRECT secret is refused in production", !bypass.signedIn, bypass.location);

  const bare = await credLogin({ password: PASSWORD });
  check("correct password with no token is refused", !bare.signedIn);

  const garbage = await credLogin({ password: PASSWORD, turnstileToken: "XXXX.garbage-token" });
  check("a garbage Turnstile token is refused by the REAL siteverify", !garbage.signedIn, garbage.location);

  const pass1 = `rv_human=${signHumanPass(email, Date.now(), AUTH_SECRET)}`;
  const human = await credLogin({ password: PASSWORD, cookie: pass1 });
  check("a valid human pass signs in (production login is not bricked)", human.signedIn, human.location);
}

await db.query(`DELETE FROM "LoginAttempt" WHERE email = $1`, [email]);
await db.query(`DELETE FROM "Session" WHERE "userId" IN (SELECT id FROM "User" WHERE email = $1)`, [email]);
await db.query(`DELETE FROM "User" WHERE email = $1`, [email]);
await db.end();

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
