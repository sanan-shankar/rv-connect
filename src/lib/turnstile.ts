import { headers } from "next/headers";
import { timingSafeEqualStrings } from "./timing-safe";
import { IS_DEMO } from "./demo";
import { normaliseHost, sameOrigin } from "./turnstile-origin-rule";

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
 *  `TURNSTILE_DEV_CHALLENGE=1` swaps in the key that always challenges,
 *  for working on the interactive path; off by default, because every
 *  unattended flow depends on the widget passing on its own.
 * ------------------------------------------------------------------ */

const IS_PROD = process.env.NODE_ENV === "production";

/** Cloudflare's documented test pair: widget always passes, secret accepts
 *  the tokens it mints. Not a secret — published in the Turnstile docs for
 *  exactly this use. The site key is the INVISIBLE variant (…BB), not the
 *  visible one (…AA): the visible variant renders Cloudflare's dark
 *  "Success!" box into the middle of the auth forms, which is how the owner
 *  met a widget that was designed never to be seen (2026-08-20). */
const TEST_SITE_KEY = "1x00000000000000000000BB";
const TEST_SECRET_KEY = "1x0000000000000000000000000000000AA";

/** Cloudflare's third published test key: the widget ALWAYS puts its
 *  checkbox up, whoever you are. `TURNSTILE_DEV_CHALLENGE=1` pins it in
 *  development, and it is the only way to see the interactive path without
 *  going to production in an incognito window.
 *
 *  Worth having as a switch rather than a five-minute local hack, because
 *  not having it is what let a real bug ship: dev pins the invisible
 *  always-pass key above, so nobody here had ever WATCHED a member tick
 *  the box, and the widget was re-arming itself 33ms into a 2.5s sign-in
 *  and wiping the tick out from under them. Invisible locally meant
 *  untested locally (owner report, 2026-08-22).
 *
 *  It pairs with the always-pass SECRET below on purpose: the dummy token
 *  a tick produces here is accepted, so the flow runs end to end and a
 *  refusal is about the password, never the widget. */
const TEST_CHALLENGE_SITE_KEY = "3x00000000000000000000FF";
const DEV_CHALLENGE = process.env.TURNSTILE_DEV_CHALLENGE === "1";

/** TURNSTILE_DEV_REAL=1 makes non-production use the real env pair instead
 *  of the pinned test pair — the escape hatch for debugging a live Turnstile
 *  issue locally (real widget, real siteverify latency, real failure modes).
 *  Off by default because real keys in dev would break every unattended
 *  flow: the widget only passes on the key's registered hostnames. */
const DEV_REAL = process.env.TURNSTILE_DEV_REAL === "1";

/** What the page hands the widget. Null means "not configured" (the demo
 *  project, or a stripped env) and the widget simply is not rendered —
 *  the server side below stays consistent by skipping verification too. */
export function turnstileSiteKey(): string | null {
  // The demo renders no widget at all: its signup/reset routes are closed
  // by the proxy and its "login" is a constant session, so a real widget
  // there could only ever be decoration wired to real Cloudflare traffic.
  if (IS_DEMO) return null;
  if (!IS_PROD && !DEV_REAL) return DEV_CHALLENGE ? TEST_CHALLENGE_SITE_KEY : TEST_SITE_KEY;
  return process.env.TURNSTILE_SITE_KEY || null;
}

function turnstileSecret(): string | null {
  if (!IS_PROD && !DEV_REAL) return TEST_SECRET_KEY;
  return process.env.TURNSTILE_SECRET_KEY || null;
}


/** The host from a Request the framework hands us — the NextAuth authorize
 *  path, which runs before `next/headers` has a request scope. Mirrors
 *  `ipFromRequest` in rate-limit.ts, for the same reason. */
export function hostFromRequest(req: Request): string | null {
  return normaliseHost(req.headers.get("host"));
}

/**
 * The server-side verdict on a widget token. Fail-open ONLY when Turnstile
 * is unconfigured or Cloudflare itself is unreachable: a bot check that
 * takes sign-in down with it whenever a third party blinks would be a
 * worse bug than the bots (same posture as rate-limit.ts, and it means
 * the demo project, which has no keys, is never locked out). A token that
 * is missing, spent or forged is a plain NO in every environment.
 *
 * `host` is the host the request arrived on, checked against the host the
 * token was solved on (turnstile-origin-rule.ts). It is REQUIRED rather than
 * optional-with-a-default because an omitted argument would silently drop
 * that check — the exact shape of the bugs this file's own history is made
 * of. Pass null where there is genuinely nothing to read.
 */
export async function verifyTurnstile(
  token: string | null | undefined,
  ip: string | undefined,
  host: string | null,
): Promise<boolean> {
  /* Defence in depth, same posture as rate-limit.ts: every route that could
     reach this is already closed on the demo by DEMO_CLOSED_PATHS, but the
     owner's real keys ARE on that project, so without this line a future
     route added without remembering the proxy list would silently start
     spending real Cloudflare calls on invented traffic. */
  if (IS_DEMO) return true;
  const secret = turnstileSecret();
  if (!secret) {
    // Unconfigured: nothing to verify against, so fail open -- but in
    // PRODUCTION that means bot protection has silently vanished from sign-in,
    // signup and reset, with no other symptom. The network fail-open below is
    // a deliberate availability tradeoff; a MISSING key is a misconfiguration,
    // so say so loudly rather than let it pass unnoticed. (Not a throw: taking
    // the auth surface down over a config gap would be the worse failure.)
    if (IS_PROD) console.error("[turnstile] TURNSTILE_SECRET_KEY is unset in production; bot checks are OFF");
    return true;
  }
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
    const data = (await res.json()) as {
      success?: boolean;
      hostname?: string;
      "error-codes"?: string[];
    };
    if (data.success !== true) {
      // Cloudflare says WHY, and until now we threw it away — which is how a
      // widened-hostname problem read as "we couldn't confirm you're human"
      // with nothing else to go on, on both sides of the wire (2026-08-28).
      const why = data["error-codes"]?.join(",");
      if (why) console.warn(`[turnstile] siteverify refused a token: ${why}`);
      return false;
    }
    /* Only the REAL key pair needs an origin check. The pinned test secret
       accepts tokens minted anywhere and reports a hostname of Cloudflare's
       choosing, so applying this to it would fail local sign-in, the e2e
       suite and the visual suite for a key that protects nothing. */
    if (secret !== TEST_SECRET_KEY && !sameOrigin(data.hostname ?? null, host)) {
      // error, not warn: this is a refusal at the auth door, so it belongs
      // in Sentry. It should be silent forever on rishivalley.space — the
      // page host and the Host header are the same there — which is exactly
      // why a burst of it is the signal that either someone is replaying
      // farmed tokens, or this check is wrong and members are being locked
      // out. A silent lockout is the failure mode worth spending a log line
      // to avoid.
      console.error(
        `[turnstile] token was solved on ${data.hostname} but the request arrived on ${host}; refusing`,
      );
      return false;
    }
    return true;
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
  return timingSafeEqualStrings(candidate, secret);
}

/**
 * The whole bot check as one question, for the two form actions (signup and
 * the reset request) that carry their proof in FormData. authorize() keeps
 * its own three-branch order because its proof arrives differently (a cookie
 * header) and its failure is a throw, not a return.
 */
export async function verifyHumanFromForm(formData: FormData, ip: string): Promise<boolean> {
  if (devBypassAllowed(formData.get("devBypass") as string | null)) return true;
  // Read here rather than at the two call sites: a server action has a request
  // scope, so the host is free, and asking for it once means neither door can
  // forget to pass it and quietly lose the origin check.
  const host = normaliseHost((await headers()).get("host"));
  return verifyTurnstile(formData.get("turnstileToken") as string | null, ip, host);
}
