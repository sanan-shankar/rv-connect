import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// The old default Vercel-assigned domain. Exact match only -- preview
// deployment hosts (e.g. "rv-alumni-git-branch-team.vercel.app" or
// "rv-alumni-<hash>.vercel.app") must keep working unredirected, so this is
// never a prefix/suffix/contains check.
const LEGACY_HOST = "rv-alumni.vercel.app";
const CANONICAL_ORIGIN = "https://rishivalley.space";

/* ------------------------------------------------------------------ *
 *  Demo deployment (DEMO_MODE=1, separate Vercel project, separate
 *  database of invented people). Two jobs, both of which must happen
 *  before any of the real-site logic below.
 *
 *  1. There is no session cookie in demo mode -- identity is a constant
 *     resolved in src/lib/auth.ts -- so the cookie check further down
 *     would bounce every single request to /login. The demo branch
 *     returns before it can.
 *  2. Shut the doors that lead somewhere the demo has no business going,
 *     before the route code runs at all. This is the outermost of the
 *     three layers (proxy -> per-action guard -> Prisma allowlist).
 * ------------------------------------------------------------------ */
const IS_DEMO = process.env.DEMO_MODE === "1";

// Page routes the demo does not open: the admin surface, the dev/preview
// rooms, and every flow that only makes sense when accounts are real.
// Mirrors DEMO_CLOSED_PATHS in src/lib/demo.ts (kept honest by demo.test.mjs;
// this file cannot import it, because proxy is bundled for the edge runtime).
const DEMO_CLOSED_PATHS = [
  "/admin",
  "/lab",
  "/onboarding",
  "/signup",
  "/verify",
  "/catchups/join",
  // The email flows. The demo persona has no password to reset and no mailbox
  // to confirm (sendMail refuses outright in demo mode), so these three could
  // only ever show a stranger a form that does nothing.
  "/forgot-password",
  "/reset-password",
  "/verify-email",
];

// API routes the demo refuses outright. Each either spends real money,
// writes real bytes to a real bucket, or hands out a real session:
//   /api/upload   -- an anonymous stranger putting files into R2 is the
//                    single most dangerous thing a public link can offer.
//   /api/razorpay -- live payment intents and the payment webhook.
//   /api/auth     -- the credentials sign-in endpoint. The demo has one
//                    invented visitor and no real accounts, so every call
//                    here is either an attack or a mistake. (Until
//                    2026-08-19 this line also guarded admin-login, which
//                    minted an ADMIN session from an email address alone;
//                    that route is deleted -- security audit C1-b.)
//   /api/places   -- a metered geocoding provider, i.e. a billing
//                    amplifier pointed at the owner's account.
//   /api/resend   -- delivery reports write to the real OutboundEmail rows.
//                    The demo has no business recording anything about mail
//                    sent to real members.
const DEMO_CLOSED_APIS = [
  "/api/upload",
  "/api/razorpay",
  "/api/auth",
  "/api/places",
  "/api/resend",
];

/* Not a session and not an identity: a per-browser id for one sitting, used
   only to attribute page views to one Visit row. Rolling, so it expires 30
   minutes after the LAST page view rather than the first. */
const VISIT_COOKIE = "rv-visit";
const VISIT_TTL_SECONDS = 30 * 60;

/* FNV-1a. Synchronous (the proxy is not async), stable, and only ever used to
   agree on an arbitrary key -- nothing here is a security boundary, so a
   non-cryptographic hash is the right tool. */
function derivedVisitId(seed: string): string {
  const bucket = Math.floor(Date.now() / (VISIT_TTL_SECONDS * 1000));
  const input = `${seed}:${bucket}`;
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return `v-${bucket.toString(36)}-${h.toString(36)}`;
}

function isUnder(pathname: string, prefixes: string[]): boolean {
  return prefixes.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (IS_DEMO) {
    // JSON for APIs, not a redirect: a fetch() handed a 302 to an HTML page
    // fails far more confusingly in the client than a plain 403 does.
    if (isUnder(pathname, DEMO_CLOSED_APIS)) {
      return NextResponse.json({ error: "Not available in the demo." }, { status: 403 });
    }
    // Closed pages go to the feed rather than 404: the visitor clicked
    // something that does not apply to them, and a dead end reads as a
    // broken site when the whole purpose here is to look finished.
    if (isUnder(pathname, DEMO_CLOSED_PATHS)) {
      return NextResponse.redirect(new URL("/feed", request.url));
    }
    // "/" keeps its landing page (it is some of the best work on the site);
    // everything else is already signed in, so nothing is gated.
    return NextResponse.next();
  }

  // Canonical-domain redirect: send the old Vercel host to the real domain,
  // preserving the full path and query string. Runs before the auth check
  // below (and before the public-path allowlist) so it applies to every
  // route, logged in or not. NEXTAUTH_URL on Vercel should also be checked
  // against the env dashboard -- if it still points at the legacy host,
  // auth callbacks/cookies can mismatch even though this redirect fires.
  //
  // Reads the raw `Host` header rather than `request.nextUrl.hostname`:
  // verified locally (curl with a spoofed Host header against `next dev`)
  // that `nextUrl.hostname` stays "localhost" and does NOT pick up the
  // incoming Host header, while `headers.get("host")` reflects it exactly --
  // and that's also what Vercel's edge sets from the actual request domain,
  // so this is the reliable field in both places. Split off a port defensively
  // even though production Vercel traffic never carries one on this header.
  const requestHost = (request.headers.get("host") ?? request.nextUrl.hostname).split(":")[0];
  if (requestHost === LEGACY_HOST) {
    const target = new URL(pathname + request.nextUrl.search, CANONICAL_ORIGIN);
    return NextResponse.redirect(target, 308);
  }

  // Check for NextAuth session cookie (lightweight check — actual session
  // validation happens server-side in the layout)
  const sessionCookie =
    request.cookies.get("authjs.session-token") ||
    request.cookies.get("__Secure-authjs.session-token");

  // Signed-in visitors typing the bare domain want the app, not the sales
  // pitch. Handled here rather than in `app/page.tsx` so the landing page
  // stays statically rendered for logged-out visitors: calling `auth()` in
  // the page would opt the whole route into dynamic rendering for everyone.
  //
  // A stale cookie sends them "/" -> "/feed" -> "/login" (the (main) layout
  // does the real session check). That chain is self-correcting and lands
  // them exactly where a logged-out visitor to "/feed" belongs anyway.
  if (pathname === "/" && sessionCookie) {
    return NextResponse.redirect(new URL("/feed", request.url));
  }

  // Groups was retired as a user-facing feature (owner, 2026-07-25): a
  // Catch-up is now started from a set of people, and the Group row survives
  // only as the hidden membership container underneath. Old links, bookmarks
  // and notification deep links still exist, so send them somewhere real
  // rather than to a 404.
  if (pathname === "/groups" || pathname.startsWith("/groups/")) {
    return NextResponse.redirect(new URL("/catchups", request.url));
  }

  // Public routes that don't require auth
  // NOTE: "/lab" is NO LONGER public (audit M19). It was the one index over
  // every dev/preview room, and /lab/everything served an internal audit log
  // with quoted source paths. It is now admin-only: removed from this list, so
  // it requires a session, and gated to the admin role in src/app/lab/layout.tsx
  // (a non-admin gets a 404, which also hides that the tree exists).
  // "/catchups/join" is public so a shared invite link can be OPENED by
  // someone with no account (the whole point of it). Only the join page is
  // exposed: prefix matching means /catchups and /catchups/<id> stay gated,
  // because neither equals "/catchups/join" nor starts with "/catchups/join/".
  // The page itself shows a stranger only the Catch-up's name, its Keeper and
  // a member count, never anything anyone wrote.
  // "/hoopoe" is the mascot playground, a link handed to people who do not
  // have an account and are being shown the character rather than the site.
  // Gating it behind a session would defeat the only reason it exists. It
  // reads nothing and writes nothing: the page is one client component
  // driving the SVG rig, with no database call anywhere behind it.
  // "/api/razorpay" is public because Razorpay's webhook is a server-to-server
  // POST with no session cookie -- gated, every webhook would be answered with
  // a redirect to /login and no payment would ever be recorded when the payer
  // closed their tab. The route authenticates the request itself, by HMAC over
  // the raw body against RAZORPAY_WEBHOOK_SECRET.
  // "/forgot-password", "/reset-password" and "/verify-email" are public
  // because every one of them is reached by somebody who CANNOT sign in, or is
  // opening a link on whichever device holds their inbox rather than the one
  // they signed up on. Gating them behind a session would bounce exactly the
  // people they exist for. Each is guarded by its own single-use token instead
  // (src/lib/auth-tokens.ts); /forgot-password takes only an address and
  // answers identically whether or not it matches an account.
  const publicPaths = [
    "/",
    "/login",
    "/signup",
    // The three policy documents (audit H12). Public on principle: someone
    // deciding whether to sign up must be able to read the privacy policy
    // BEFORE handing over an email address, and the signup consent line
    // links all three.
    "/privacy",
    "/terms",
    "/guidelines",
    "/forgot-password",
    "/reset-password",
    "/verify-email",
    "/api/auth",
    "/api/razorpay",
    // The local tooling sign-in (screenshots, the visual suite, the
    // chrome-devtools MCP). It has to be reachable WITHOUT a session --
    // handing one out is its whole job -- but it answers 404 unless
    // NODE_ENV is not production AND DEV_LOGIN_SECRET is set and matches,
    // so on every Vercel build, preview included, this path is dead.
    "/api/dev-login",
    // Resend's delivery reports. Server-to-server, no session cookie, so
    // without this every webhook is answered with a redirect to /login and
    // Svix retries it into oblivion. Authenticated by its Svix signature in
    // the route itself; nothing there trusts an unsigned body.
    "/api/resend",
    // PostHog's reverse proxy (rewrites in next.config.ts). Analytics fires on
    // the signed-out landing page too, and every request carries no session by
    // design, so without this the very events we proxied to save from ad
    // blockers would be lost to a redirect instead.
    "/ingest",
    // The nightly Catch-up advance cron (audit M27). A server-to-server GET
    // from Vercel with no session cookie; authenticated by CRON_SECRET inside
    // the route, so it is exposed here only to get past the redirect-to-login.
    // Exact path, not a prefix, so the member-facing /api/catchups routes stay
    // gated.
    "/api/catchups/tick",
    // The nightly retention sweep (audit M34), same shape as the tick above:
    // a server-to-server GET from GitHub Actions carrying CRON_SECRET, no
    // session cookie. Exact path; nothing else lives under /api/retention.
    "/api/retention/sweep",
    "/catchups/join",
    "/hoopoe",
  ];
  const isPublic = publicPaths.some(
    (path) => pathname === path || pathname.startsWith(path + "/")
  );

  if (isPublic) {
    return NextResponse.next();
  }

  if (!sessionCookie) {
    const loginUrl = new URL("/login", request.url);
    // `next`, not `callbackUrl`. This used to write a parameter nothing read:
    // the login page and safeNextPath both look only at `next`, so every
    // shared deep link -- a letter, a profile, a Catch-up invitation --
    // dropped the visitor on /feed after they signed in (bug audit B-022).
    // The search string travels too, so a filtered directory link survives.
    loginUrl.searchParams.set("next", pathname + search);
    return NextResponse.redirect(loginUrl);
  }

  /* The path, forwarded as a request header so a SERVER component can read it.
     A layout has no usePathname and Next exposes no reliable equivalent, and
     the alternative -- a client component reporting its own location back over
     fetch -- would be a second round trip on every navigation to learn
     something this process already knows. Consumed by touchLastSeen
     (src/lib/last-seen.ts) to record which page a member is actually on. */
  const withPath = new Headers(request.headers);
  withPath.set("x-pathname", pathname);

  /* THE VISIT ID, held in a rolling 30-minute cookie.
     touchLastSeen used to find-then-create ("is there an open visit? no ->
     make one"), which races: several page loads land together, all read "no
     open visit" before any of them has written one, and each creates its own.
     The owner saw the result as four separate 0-second visits from one person
     in one sitting.
     A cookie removes the guess entirely. The browser carries its own visit's
     identity, so the write is an upsert on a known primary key with nothing to
     race over, and the 30-minute session gap comes free from the cookie's own
     expiry -- refreshed on every request, so it slides. */
  /* Cookie first. On a COLD browser there is no cookie yet and several
     requests land in parallel -- the page, its RSC payload, a prefetch -- so a
     random id per request would have each of them mint a different one and
     only the last Set-Cookie would win. That is what still produced six rows
     from one sitting after the first fix.
     So the fallback is DERIVED, not random: the same session token in the same
     30-minute bucket always yields the same id, which means a burst of
     simultaneous requests agrees without needing to coordinate. The cookie
     then takes over and slides, so a long visit never splits at a bucket
     boundary the way a bucket alone would. */
  const existing = request.cookies.get(VISIT_COOKIE)?.value;
  const visitId =
    existing && /^[0-9a-z-]{8,64}$/.test(existing)
      ? existing
      : derivedVisitId(sessionCookie?.value ?? request.headers.get("user-agent") ?? "anon");
  withPath.set("x-visit-id", visitId);

  const res = NextResponse.next({ request: { headers: withPath } });
  res.cookies.set(VISIT_COOKIE, visitId, {
    httpOnly: true,
    sameSite: "lax",
    secure: request.nextUrl.protocol === "https:",
    path: "/",
    maxAge: VISIT_TTL_SECONDS,
  });
  return res;
}

/* The brand assets (icon.svg, apple-icon.png, manifest.webmanifest) are
 * excluded because the thing fetching them is usually NOT signed in: a phone
 * doing "Add to Home Screen" from the landing page, a link preview, a browser
 * filling in a tab. Redirecting those to /login hands the installer an HTML
 * page where it expected an image, which is how iOS ended up drawing a plain
 * letter "R" instead of the mark. */
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|apple-icon.png|manifest.webmanifest|images/|uploads/).*)",
  ],
};
