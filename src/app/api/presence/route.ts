import { NextResponse, after } from "next/server";
import { auth } from "@/lib/auth";
import { IS_DEMO } from "@/lib/demo";
import { readPresence, recordPageView } from "@/lib/last-seen";
import { statsWritesEnabled } from "@/lib/stats-exclusion";
import { presencePingSchema } from "@/lib/validators";

/**
 * POST /api/presence  { kind: "view" | "beat", path }
 *
 * The only writer of Visit. Called by <PresenceBeacon> when a member's page
 * actually changes, and once a minute while they are active on it. See that
 * component for why the (main) layout stopped being the witness.
 *
 * Always answers 204 once the caller is signed in, including when nothing is
 * recorded: the beacon does nothing with a response, and a statistics endpoint
 * that answered differently for "skipped" would only be telling a caller
 * which of its pings were believed.
 *
 * The path is the browser's word, checked for shape and not against a route
 * table, so a member with devtools open can claim pages on their OWN visit.
 * The update is scoped to their row and the counts are capped in
 * last-seen.ts, so that is the whole reach: page popularity is roughly
 * honest, not tamper-proof. No rate limiter, deliberately: it would cost a
 * round trip on every minute's beat to bound a write that can only touch the
 * caller's own row.
 */

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  /* The demo's every visitor is one persona, so its visits are no statistic;
     its Prisma guard refuses Visit writes regardless. */
  /* And nothing off the production deployment: dev and QA sign in against the
     same database (src/lib/stats-exclusion.ts). recordPageView checks too;
     this spares the body parse. */
  if (IS_DEMO || !statsWritesEnabled()) return new NextResponse(null, { status: 204 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  const parsed = presencePingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  const { kind, path } = parsed.data;
  if (path.startsWith("/admin")) return new NextResponse(null, { status: 204 });

  /* Headers during the request; the write behind it (headers() throws inside
     after(), see readPresence). */
  const presence = await readPresence();
  const userId = session.user.id;
  after(() => recordPageView(userId, presence, path, kind));

  return new NextResponse(null, { status: 204 });
}
