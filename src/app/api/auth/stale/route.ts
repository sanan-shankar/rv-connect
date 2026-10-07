import { NextResponse, type NextRequest } from "next/server";
import { sessionIsStale } from "@/lib/auth";
import { safeNextPath } from "@/lib/next-path";
import { isSessionCookie, signedOutDestination, withNext } from "@/lib/stale-session";

/**
 * Deletes a sign-in cookie that no longer signs anyone in, then sends the
 * visitor where a visitor with no cookie would have gone. Every signed-out
 * redirect comes through here (src/lib/sign-in-redirect.ts); the loop it
 * ends is described in src/lib/stale-session.ts.
 *
 * A GET that deletes something, so it re-checks rather than trusting the
 * caller: a link from another site can only ever clear a cookie that was
 * already dead. A live session, or a database that did not answer, gets the
 * plain sign-in redirect this route replaced, with the cookie untouched.
 * Signing somebody out because the database was slow is the exact bug the
 * session-unavailable guard exists to prevent (bug audit 3, O-03).
 *
 * Public because /api/auth is public in src/proxy.ts. A static segment, so it
 * takes precedence over the [...nextauth] catch-all beside it.
 */
export async function GET(request: NextRequest) {
  const next = safeNextPath(request.nextUrl.searchParams.get("next"), "") || null;

  if (!(await sessionIsStale())) {
    return NextResponse.redirect(new URL(withNext("/login", next), request.url));
  }

  const response = NextResponse.redirect(new URL(signedOutDestination(next), request.url));
  for (const { name } of request.cookies.getAll()) {
    if (!isSessionCookie(name)) continue;
    // A `__Secure-` cookie can only be overwritten, expiry included, by a
    // Set-Cookie that is itself Secure, so the flag follows the name.
    response.cookies.set(name, "", {
      path: "/",
      maxAge: 0,
      httpOnly: true,
      sameSite: "lax",
      secure: name.startsWith("__Secure-"),
    });
  }
  return response;
}
