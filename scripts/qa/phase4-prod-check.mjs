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
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes } from "node:crypto";
import pg from "pg";
import bcrypt from "bcryptjs";
import { loadEnv, makeLedger, credLogin as kitCredLogin } from "./_probe-kit.mjs";
import { signHumanPass } from "../../src/lib/human-pass-rule.ts";
import { withDatabaseTls } from "../../src/lib/db-tls.ts";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const BASE = process.argv[2] || "http://localhost:3100";

loadEnv(repoRoot);
const AUTH_SECRET = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;

const db = new pg.Client(withDatabaseTls(process.env.DIRECT_URL || process.env.DATABASE_URL));
await db.connect();

const { check, finish } = makeLedger();

const RUN = randomBytes(3).toString("hex");
const email = `prodcheck_${RUN}@probe.invalid`;
const PASSWORD = "probe-password-1";
await db.query(
  `INSERT INTO "User" (id, name, email, password, "emailVerified", "updatedAt")
   VALUES ($1, 'Probe ProdCheck', $2, $3, now(), now())`,
  [`probe4p_${RUN}`, email, bcrypt.hashSync(PASSWORD, 4)],
);

const ip = `10.99.${Math.floor(Math.random() * 200) + 1}.${Math.floor(Math.random() * 200) + 1}`;

// The kit's credLogin, with this check's one account and one IP baked in.
const credLogin = (opts) => kitCredLogin(BASE, { email, fromIp: ip, ...opts });

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

finish();
