/**
 * Shared plumbing for the security probes, for the same reason
 * _dev-login.mjs exists: audit R6 was nine hand-copied sign-in blocks
 * quietly diverging across QA scripts, and phase4-probe/phase4-prod-check
 * were about to repeat that with three fresh copies of their own.
 */
import { resolve } from "node:path";
import { config } from "dotenv";

/** Load .env exactly like the rest of scripts/qa does (dotenv never
 *  overrides variables already set in the environment). */
export function loadEnv(repoRoot) {
  config({ path: resolve(repoRoot, ".env"), quiet: true });
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
