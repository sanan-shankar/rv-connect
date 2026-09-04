/**
 * One sign-in for every QA script.
 *
 * Replaces the nine hand-copied `fetch('/api/auth/admin-login')` blocks that
 * used to live in these files. That route is gone -- it was security audit
 * finding C1-b, an unauthenticated endpoint that minted a 30-day ADMIN
 * session from an email address alone -- and its replacement,
 * /api/dev-login, needs a secret rather than an identifier.
 *
 * Two reasons this is a shared module rather than another paste:
 *
 *  1. Drift. The audit's finding R6 is about exactly this: security logic
 *     copy-pasted into four files and then diverging. Nine copies of a
 *     sign-in, each with its own error handling, is how one of them quietly
 *     stops checking whether the sign-in worked.
 *  2. The secret must not enter page JavaScript. Eight of the nine copies
 *     did the fetch inside page.evaluate, which serializes its arguments
 *     into the page's main world -- app-controlled ground. Exactly one of
 *     the nine got this right (tour-mobile-verify.mjs, deleted 2026-09-05
 *     with the tour it checked), with a comment explaining why.
 *     That is now what everybody does: the request goes from Node, and only
 *     the resulting HttpOnly cookie is copied into the browser.
 */

const COOKIE_NAMES = ["authjs.session-token", "__Secure-authjs.session-token"];

function requireSecret() {
  const secret = process.env.DEV_LOGIN_SECRET;
  if (!secret) {
    throw new Error(
      "DEV_LOGIN_SECRET is not set.\n" +
        "  It lives in .env. If it is missing, generate one with:\n" +
        "    openssl rand -base64 32\n" +
        "  and add it as DEV_LOGIN_SECRET. Never set it on Vercel -- the route\n" +
        "  404s in production regardless."
    );
  }
  return secret;
}

/**
 * Sign in from Node and return the session cookie as { name, value }.
 * `email` defaults to ADMIN_EMAIL; pass another address to drive the tooling as
 * that person, which is how the verified/unverified tiers of the trust model
 * get screenshotted.
 *
 * That address is Jerry Maguire (sanan.shankar@gmail.com), the account kept for
 * this, and NOT a real alumnus. Signing in as one is not read-only: the (main)
 * layout records a Visit and stamps lastSeenAt against whoever the cookie says,
 * into the one database production also uses. A guard check run as a 1978
 * alumnus on 2026-08-25 left him reading "on the admin panel" in the owner's
 * analytics room, which is a false accusation in the one place that names
 * people.
 */
export async function fetchSessionCookie(baseUrl, email = process.env.ADMIN_EMAIL) {
  const secret = requireSecret();
  if (!email) throw new Error("No email given and ADMIN_EMAIL is not set in .env");

  const res = await fetch(new URL("/api/dev-login", baseUrl), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, secret }),
    /* A redirect here means the proxy did not treat /api/dev-login as public
       and is bouncing us to /login. Failing loudly beats following it and
       then reporting a confusing "no cookie" error. */
    redirect: "error",
  });

  if (!res.ok) {
    const hint =
      res.status === 404
        ? "404 means one of: NODE_ENV is production, DEV_LOGIN_SECRET is unset or under 32 chars, or the secret did not match."
        : `HTTP ${res.status}`;
    throw new Error(`/api/dev-login refused the sign-in. ${hint}`);
  }

  const setCookies = res.headers.getSetCookie?.() ?? [];
  for (const raw of setCookies) {
    const [pair] = raw.split(";");
    const idx = pair.indexOf("=");
    const name = pair.slice(0, idx).trim();
    if (COOKIE_NAMES.includes(name)) {
      return { name, value: pair.slice(idx + 1).trim() };
    }
  }
  throw new Error("/api/dev-login answered OK but set no session cookie.");
}

/** Sign a puppeteer page in. Returns the cookie that was installed. */
export async function devLogin(page, baseUrl = "http://localhost:3000", email) {
  const cookie = await fetchSessionCookie(baseUrl, email);
  await page.setCookie({
    name: cookie.name,
    value: cookie.value,
    url: baseUrl,
    httpOnly: true,
    path: "/",
  });
  return cookie;
}

/** Sign a Playwright browser context in. */
export async function devLoginContext(context, baseUrl = "http://localhost:3000", email) {
  const cookie = await fetchSessionCookie(baseUrl, email);
  const { hostname } = new URL(baseUrl);
  await context.addCookies([
    { name: cookie.name, value: cookie.value, domain: hostname, path: "/", httpOnly: true, sameSite: "Lax" },
  ]);
  return cookie;
}
