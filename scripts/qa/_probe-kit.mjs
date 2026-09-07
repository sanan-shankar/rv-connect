/**
 * Shared plumbing for the security probes, for the same reason
 * _dev-login.mjs exists: audit R6 was nine hand-copied sign-in blocks
 * quietly diverging across QA scripts, and phase4-probe/phase4-prod-check
 * were about to repeat that with three fresh copies of their own.
 */
import { existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import pg from "pg";

/** Load .env exactly like the rest of scripts/qa does (dotenv never
 *  overrides variables already set in the environment). */
export function loadEnv(repoRoot) {
  config({ path: resolve(repoRoot, ".env"), quiet: true });
}

/* The bundled Puppeteer Chrome does not run on this machine; every browser
   script falls back to the installed one (CLAUDE.md gotcha 2). */
const MAC_CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

/**
 * Which Chrome to launch. The one answer; there used to be four.
 *
 * This literal was typed out fifteen times across `scripts/`, under four
 * different policies: `env || literal`, `env ?? literal`, the literal alone
 * with no override, and -- the dangerous one -- `executablePath:
 * process.env.PUPPETEER_EXECUTABLE_PATH` with nothing behind it, which is
 * `undefined` and dies with "Failed to launch the browser process" the day
 * its script stops calling `bootstrap(..., { chrome: true })` first.
 * `crawl.mjs` and `verify-shot.mjs` passed nothing at all and made the CALLER
 * export the variable, which is what CLAUDE.md gotcha 2 and this folder's
 * README both had to warn about.
 *
 * `existsSync` rather than the bare literal, copied from `screenshot.mjs`,
 * because it is the only version that degrades to puppeteer's own bundled
 * browser on a machine that is not this Mac -- which matters the first time
 * somebody runs this on Linux. `undefined` is puppeteer's "use your own".
 */
export function chromePath() {
  if (process.env.PUPPETEER_EXECUTABLE_PATH) return process.env.PUPPETEER_EXECUTABLE_PATH;
  return existsSync(MAC_CHROME) ? MAC_CHROME : undefined;
}

/**
 * The eight lines every probe opened with: find the repo root, work from it,
 * read .env, and point Puppeteer at a Chrome that exists.
 *
 * Four of the probes hand-rolled an eight-line `.env` parser here, beside a
 * kit that already exported `loadEnv` -- the shape this file's banner exists
 * to stop. Additive on purpose: a probe that needs something else keeps doing
 * it itself rather than growing an option here.
 */
export function bootstrap(importMetaUrl, { base = "http://localhost:3000", chrome = false } = {}) {
  const repoRoot = resolve(dirname(fileURLToPath(importMetaUrl)), "../..");
  process.chdir(repoRoot);
  loadEnv(repoRoot);
  /* Kept even though every launch site now calls `chromePath()` directly: a
     probe that shells out to another tool inherits the variable this way.
     Never set to a path that is not there -- an absent Chrome must stay
     absent so `chromePath()` can fall through to the bundled browser. */
  if (chrome) {
    const found = chromePath();
    if (found) process.env.PUPPETEER_EXECUTABLE_PATH = found;
  }
  return { repoRoot, BASE: base };
}

/**
 * A connected client on the session pooler, plus the row helper every probe
 * defines as `q`.
 *
 * DIRECT_URL first, like the Prisma CLI: probes read and write real tables and
 * the transaction pooler is the wrong end for that. Deliberately no default
 * pointing anywhere else -- scripts/demo/* keeps its own opener precisely so
 * a convenience here can never seed the wrong database.
 */
export async function openDb() {
  const db = new pg.Client({
    connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
  });
  await db.connect();
  return { db, q: (text, params) => db.query(text, params).then((r) => r.rows) };
}

/** The pass/fail ledger every probe prints. exit() with the right code. */
export function makeLedger() {
  let pass = 0;
  let fail = 0;
  return {
    check(name, cond, detail = "") {
      if (cond) {
        pass += 1;
        console.log(`  ok   ${name}`);
      } else {
        fail += 1;
        console.log(`  FAIL ${name}${detail ? ` -- ${detail}` : ""}`);
      }
    },
    finish() {
      console.log(`\n${pass} passed, ${fail} failed`);
      process.exit(fail === 0 ? 0 : 1);
    },
  };
}

/**
 * One real credentials sign-in attempt through NextAuth's own callback
 * route -- the exact POST a browser makes -- with a synthetic caller IP.
 * Returns { signedIn, location, status }; `location` carries NextAuth's
 * error code on refusal (e.g. code=rate-limited).
 */
export async function credLogin(base, { email, password, fromIp, turnstileToken, devBypass, cookie = "" }) {
  const csrfRes = await fetch(`${base}/api/auth/csrf`, {
    headers: fromIp ? { "x-forwarded-for": fromIp } : {},
  });
  const { csrfToken } = await csrfRes.json();
  const csrfCookies = csrfRes.headers
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .join("; ");

  const body = new URLSearchParams({ csrfToken, email, password });
  if (turnstileToken) body.set("turnstileToken", turnstileToken);
  if (devBypass) body.set("devBypass", devBypass);

  const res = await fetch(`${base}/api/auth/callback/credentials`, {
    method: "POST",
    redirect: "manual",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      cookie: cookie ? `${csrfCookies}; ${cookie}` : csrfCookies,
      ...(fromIp ? { "x-forwarded-for": fromIp } : {}),
      origin: base,
    },
    body,
  });
  const signedIn = res.headers
    .getSetCookie()
    .some((c) => c.includes("session-token") && !c.includes("=;"));
  return { signedIn, location: res.headers.get("location") ?? "", status: res.status };
}
