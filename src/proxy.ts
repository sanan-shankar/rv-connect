import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// The old default Vercel-assigned domain. Exact match only -- preview
// deployment hosts (e.g. "rv-alumni-git-branch-team.vercel.app" or
// "rv-alumni-<hash>.vercel.app") must keep working unredirected, so this is
// never a prefix/suffix/contains check.
const LEGACY_HOST = "rv-alumni.vercel.app";
const CANONICAL_ORIGIN = "https://rishivalley.space";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

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
  // NOTE: "/preview" is temporary — design-direction mockups; remove before shipping.
  const publicPaths = ["/", "/login", "/signup", "/api/auth", "/preview"];
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
