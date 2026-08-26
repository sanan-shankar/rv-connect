import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { requireVerifiedMember } from "@/lib/member-gate";
import { requireVerifiedEmail } from "@/lib/email-verification";
import { rateLimit } from "@/lib/rate-limit";
import { originAllowed } from "@/lib/origin-rule";
import { timingSafeEqualStrings } from "@/lib/timing-safe";

/* ------------------------------------------------------------------ *
 *  What an API route checks before it does anything.
 *
 *  Server actions get an origin check from Next itself and their gates from
 *  the sweep in gate-coverage.test.mjs. Route handlers get neither: each one
 *  is its own front door, and the three upload routes, the two lookup routes
 *  and the three cron routes had each written their door out by hand -- three
 *  copies of the M33/M2 reasoning, two of the M1 reasoning, and three of a
 *  constant-time secret comparison whose newest copy carries the comment
 *  "matching the two sibling cron routes". A sameness maintained by hand is
 *  drift with a date on it: this repo already learned that once, when M15 was
 *  fixed on one upload path and missed on three (C-073).
 *
 *  NOT in `lib/upload-shared.ts`, which the audit suggested: five client
 *  components import that file, and giving it `auth` would pull NextAuth and
 *  Prisma into five browser bundles. That is the failure that once broke
 *  /messages with "Module not found: Can't resolve 'dns'" while tsc stayed
 *  green (see the banner on admin-threads-server.ts). This module is server
 *  only, and nothing marked "use client" may import it.
 * ------------------------------------------------------------------ */

/** A gate either lets the caller through with their id, or answers for you. */
type Vetted = { ok: true; userId: string } | { ok: false; response: NextResponse };

/**
 * The door on every route that writes image bytes.
 *
 * Four checks, in this order:
 *
 *  1. Origin. A cross-site page must not be able to spend this cookie
 *     (audit M33). Server actions get this from Next; API routes do not.
 *  2. Signed in at all.
 *  3. A CONFIRMED address. Storage costs money and a bucket full of somebody
 *     else's images is not undoable, so writing bytes waits for a confirmed
 *     account. Checked at the route rather than only in the callers, because
 *     each of these endpoints is reachable straight from a console whatever
 *     the composer allows.
 *  4. One hourly uploads allowance per account, shared across every route
 *     bytes can travel through (audit M2).
 */
export async function vetUploadRequest(request: Request): Promise<Vetted> {
  if (!originAllowed(request.headers.get("origin"), request.headers.get("host"))) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Cross-site call refused" }, { status: 403 }),
    };
  }

  const session = await auth();
  if (!session?.user) {
    return { ok: false, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const gate = await requireVerifiedMember();
  if (!gate.ok) {
    return { ok: false, response: NextResponse.json({ error: gate.error }, { status: 403 }) };
  }

  const limited = await rateLimit("uploads", session.user.id);
  if (!limited.ok) {
    return { ok: false, response: NextResponse.json({ error: limited.error }, { status: 429 }) };
  }

  return { ok: true, userId: session.user.id };
}

/**
 * The door on the two routes that hand back other members' names.
 *
 * Names by query, and whole batches of names at a time, are the directory's
 * Stage 1 capability wearing an API shape -- the harvesting half of audit M1 --
 * so they hold the same line: no confirmed email, no names. Then one shared
 * throttle across the read-heavy lookups, because each request can return
 * thousands of rows and scripted polling is pure database load.
 *
 * No origin check: these are GETs that return data the caller can already
 * read on the directory, so there is no cross-site write to refuse.
 */
export async function vetLookupRequest(): Promise<Vetted> {
  const session = await auth();
  if (!session?.user) {
    return { ok: false, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const gate = await requireVerifiedEmail();
  if (!gate.ok) {
    return { ok: false, response: NextResponse.json({ error: gate.error }, { status: 403 }) };
  }

  const limited = await rateLimit("search", session.user.id);
  if (!limited.ok) {
    return { ok: false, response: NextResponse.json({ error: limited.error }, { status: 429 }) };
  }

  return { ok: true, userId: session.user.id };
}

/**
 * The door on a scheduled route: a bearer secret, compared in constant time.
 *
 * Returns the refusal to hand straight back, or null to carry on.
 *
 * FAILS CLOSED. An earlier `if (secret && ...)` form went public whenever
 * CRON_SECRET was unset, and a plain `!==` on the header is a timing oracle.
 * Both were fixed three times over, once per route; this is the one place
 * the next scheduled route inherits them from instead of copying.
 *
 * Each route still declares its own `export const maxDuration`, which is a
 * per-route budget and not a gate (audit C-079, pinned in
 * unattended-rule.test.mjs).
 */
export function requireCronSecret(req: Request): NextResponse | null {
  const secret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization") ?? "";
  if (!secret || !timingSafeEqualStrings(authHeader, `Bearer ${secret}`)) {
    return new NextResponse("Unauthorized", { status: 401 });
  }
  return null;
}
