import crypto from "crypto";

/* ------------------------------------------------------------------ *
 *  Cloudflare Turnstile, verified SERVER-SIDE (audit H22 — Phase 4).
 *
 *  Three doors wear this: sign-in (checked inside NextAuth's authorize,
 *  the only place a direct POST to /api/auth/callback/credentials cannot
 *  skip), signup (registerUser) and the password-reset request. The
 *  widget in the browser only produces the token; nothing it says is
 *  trusted until the siteverify call below says it too.
 *
 *  Environments: in production the real key pair comes from the env. In
 *  development and test the code pins Cloudflare's OFFICIAL dummy pair —
 *  the widget always passes without interaction and siteverify accepts
 *  its tokens — so local sign-in, the e2e suite and the visual suite run
 *  exactly the enforcement path production runs, minus the challenge.
 *  A request with NO token is refused in both environments alike.
 * ------------------------------------------------------------------ */

const IS_PROD = process.env.NODE_ENV === "production";

/** Cloudflare's documented test pair: widget always passes invisibly,
 *  secret accepts the tokens it mints. Not a secret — published in the
 *  Turnstile docs for exactly this use. */
const TEST_SITE_KEY = "1x00000000000000000000AA";
const TEST_SECRET_KEY = "1x0000000000000000000000000000000AA";

/** What the page hands the widget. Null means "not configured" (the demo
 *  project, or a stripped env) and the widget simply is not rendered —
 *  the server side below stays consistent by skipping verification too. */
export function turnstileSiteKey(): string | null {
  if (!IS_PROD) return TEST_SITE_KEY;
  return process.env.TURNSTILE_SITE_KEY || null;
}

function turnstileSecret(): string | null {
  if (!IS_PROD) return TEST_SECRET_KEY;
  return process.env.TURNSTILE_SECRET_KEY || null;
}

export const BOT_CHECK_FAILED =
  "We couldn't confirm you're human. Refresh the page and try once more.";

/**
 * The server-side verdict on a widget token. Fail-open ONLY when Turnstile
 * is unconfigured or Cloudflare itself is unreachable: a bot check that
 * takes sign-in down with it whenever a third party blinks would be a
 * worse bug than the bots (same posture as rate-limit.ts, and it means
 * the demo project, which has no keys, is never locked out). A token that
 * is missing, spent or forged is a plain NO in every environment.
 */
export async function verifyTurnstile(
  token: string | null | undefined,
  ip?: string,
): Promise<boolean> {
  const secret = turnstileSecret();
  if (!secret) return true; // unconfigured: nothing to verify against
  if (!token) return false;

  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        secret,
        response: token,
        ...(ip && ip !== "unknown" ? { remoteip: ip } : {}),
      }),
      // Sign-in must not hang on Cloudflare; past this, fail open (below).
      signal: AbortSignal.timeout(5000),
    });
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch (err) {
    console.error("[turnstile] siteverify unreachable; failing open", err);
    return true;
  }
}

/**
 * The QA escape hatch, and nothing else. The behavioural probes need to
 * sign in and sign up hundreds of times with no browser and therefore no
 * widget; they present DEV_LOGIN_SECRET instead — the same secret, the
 * same timingSafeEqual, and the same production kill switch (NODE_ENV)
 * that Phase 1 built into /api/dev-login and then PROVED dead in a
 * production build. A production caller with the correct secret is still
 * refused, because the first check never asks the env for it there.
 */
export function devBypassAllowed(candidate: string | null | undefined): boolean {
  if (IS_PROD) return false;
  const secret = process.env.DEV_LOGIN_SECRET;
  if (!secret || !candidate) return false;
  const a = Buffer.from(candidate);
  const b = Buffer.from(secret);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
