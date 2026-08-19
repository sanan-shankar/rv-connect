/* ------------------------------------------------------------------ *
 *  POST /api/dev-login — mint a session on a LOCAL machine, for tooling.
 *
 *  This replaces /api/auth/admin-login, which the security audit named as
 *  finding C1-b and which was, fairly, the worst thing in the codebase: an
 *  unauthenticated endpoint on the live site that returned a 30-day ADMIN
 *  session to anyone who posted one email address -- an address that was
 *  itself compiled into the public JavaScript bundle. Deleting it was the
 *  single highest-value fix in the audit.
 *
 *  But that route was also load-bearing for every screenshot script
 *  (verify-shot, crawl, theme-shots, map-cluster-verify), the Playwright
 *  visual suite, and the chrome-devtools MCP workflow in CLAUDE.md -- all of
 *  which need to be signed in to see anything. Deleting it outright would
 *  have taken the project's whole verification apparatus with it, on a
 *  codebase whose house rule is that every UI change is screenshotted at two
 *  viewports. So the capability survives; the exposure does not.
 *
 *  Three things make this safe where the old route was not:
 *
 *   1. IT DOES NOT EXIST IN PRODUCTION. NODE_ENV is "production" for every
 *      Vercel build, preview deployments included, and this returns 404
 *      there -- not 403, which would confirm the path. Same shape as
 *      /api/demo/reset, which is 404 unless DEMO_MODE=1.
 *   2. IT NEEDS A SECRET, not an identifier. The old route's entire check
 *      was `email !== ADMIN_EMAIL`, and knowing a person's email address is
 *      not a credential. This wants DEV_LOGIN_SECRET, compared in constant
 *      time, and refuses to run at all if that secret is missing or short.
 *   3. IT NEVER GRANTS A ROLE. The old route wrote role:"admin" onto the
 *      row and then signed a token claiming it. This reads the role the
 *      database already holds and copies it. Signing in as a member gets you
 *      a member's session, which is what makes it useful for screenshotting
 *      the unverified and verified tiers of the new trust model.
 * ------------------------------------------------------------------ */

import { NextResponse, type NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { encode } from "@auth/core/jwt";
import { prisma } from "@/lib/prisma";

/* Matches the `session.maxAge` in src/lib/auth.ts. A tooling session that
   outlived a real one would be its own small oddity. */
const MAX_AGE = 30 * 24 * 60 * 60;

/* Long enough that guessing is hopeless even against a local server with no
   rate limit in front of it. `openssl rand -base64 32` clears it comfortably. */
const MIN_SECRET_LENGTH = 32;

/** Constant-time string compare. Bails on length first, because
 *  timingSafeEqual throws on mismatched buffer lengths -- and a thrown
 *  exception is itself a timing signal. */
function secretMatches(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function POST(req: NextRequest) {
  const expected = process.env.DEV_LOGIN_SECRET;

  /* One 404 for all three refusals -- wrong environment, unconfigured, wrong
     secret. Anything that distinguished them would tell a prober which of
     the three it had got right. */
  if (
    process.env.NODE_ENV === "production" ||
    !expected ||
    expected.length < MIN_SECRET_LENGTH
  ) {
    return new NextResponse("Not found", { status: 404 });
  }

  const authSecret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  if (!authSecret) {
    return NextResponse.json({ error: "AUTH_SECRET is not set" }, { status: 500 });
  }

  let body: { email?: string; secret?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Expected a JSON body" }, { status: 400 });
  }

  /* The secret may also ride in a header, because the chrome-devtools MCP
     drives this through evaluate_script where a header is tidier than
     threading the value through a fetch body by hand. */
  const provided = body.secret ?? req.headers.get("x-dev-login-secret") ?? "";
  if (!secretMatches(provided, expected)) {
    return new NextResponse("Not found", { status: 404 });
  }

  const email = body.email ?? process.env.ADMIN_EMAIL;
  if (!email) {
    return NextResponse.json(
      { error: "No email given and ADMIN_EMAIL is not set" },
      { status: 400 }
    );
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return NextResponse.json({ error: `No account for ${email}` }, { status: 404 });
  }

  const isSecure = req.nextUrl.protocol === "https:";
  const cookieName = isSecure
    ? "__Secure-authjs.session-token"
    : "authjs.session-token";

  const token = await encode({
    token: {
      name: user.name,
      email: user.email,
      sub: user.id,
      id: user.id,
      /* Whatever the row says. Never an elevation. */
      role: user.role,
      /* Must match the row, exactly as the real sign-in path does: the
         session callback compares this on every read and drops the session on
         a mismatch. A tooling token minted without it would be invalid the
         moment it was used against any account that had ever reset a
         password or been blocked. */
      credentialVersion: user.credentialVersion,
      batchType: user.batchType,
      batchYear: user.batchYear,
      avatarColor: user.avatarColor,
    },
    secret: authSecret,
    salt: cookieName,
    maxAge: MAX_AGE,
  });

  const response = NextResponse.json({
    success: true,
    signedInAs: { email: user.email, role: user.role, verifyState: user.verifyState },
  });

  response.cookies.set(cookieName, token, {
    httpOnly: true,
    secure: isSecure,
    sameSite: "lax",
    expires: new Date(Date.now() + MAX_AGE * 1000),
    path: "/",
  });

  return response;
}
