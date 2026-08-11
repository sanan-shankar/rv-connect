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
//   /api/auth     -- admin-login mints an ADMIN session from an email
//                    alone. It must not exist on a link anyone can open.
//   /api/places   -- a metered geocoding provider, i.e. a billing
//                    amplifier pointed at the owner's account.
const DEMO_CLOSED_APIS = [
  "/api/upload",
  "/api/razorpay",
  "/api/auth",
  "/api/places",
];

function isUnder(pathname: string, prefixes: string[]): boolean {
  return prefixes.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

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
  // NOTE: "/lab" is temporary — it is the one index over every dev/preview room
  // (the old /preview tree was folded into it on 2026-07-30). Remove before
  // shipping to the public, along with the rooms themselves.
  // "/catchups/join" is public so a shared invite link can be OPENED by
  // someone with no account (the whole point of it). Only the join page is
  // exposed: prefix matching means /catchups and /catchups/<id> stay gated,
  // because neither equals "/catchups/join" nor starts with "/catchups/join/".
  // The page itself shows a stranger only the Catch-up's name, its Keeper and
  // a member count, never anything anyone wrote.
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
    "/forgot-password",
    "/reset-password",
    "/verify-email",
    "/api/auth",
    "/api/razorpay",
    "/lab",
    "/catchups/join",
  ];
  const isPublic = publicPaths.some(
    (path) => pathname === path || pathname.startsWith(path + "/")
  );

  if (isPublic) {
    return NextResponse.next();
  }

  if (!sessionCookie) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|images/|uploads/).*)",
  ],
};
