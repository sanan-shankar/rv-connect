import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

/* ------------------------------------------------------------------ *
 *  Presence: who is here, where, on what, and for how long.
 *
 *  Called from the (main) layout, which renders on EVERY authenticated
 *  page, so everything here has to be cheap and nothing here may throw.
 * ------------------------------------------------------------------ */

/* A visit ends when 30 minutes pass with no page view. The standard
 * definition, and the one that makes "average session" mean what a person
 * expects: come back after lunch and that is a second visit, not a
 * four-hour one. */
export const SESSION_GAP_MIN = 30;

/* User.lastSeenAt is throttled because it only ever answers "roughly when",
 * and a write per page view to record that is waste. Visit is NOT throttled:
 * it counts views and follows the path, which is the whole point. One UPDATE
 * per page view at this size is nothing -- 2,000 members at 30 views a day is
 * 60k writes, which Postgres does not notice. */
const LAST_SEEN_STALE_MS = 15 * 60 * 1000;

/**
 * Coarse device class from the user agent.
 *
 * Deliberately three buckets. The question this exists to answer is "are the
 * older alumni struggling on phones", and no version of that question needs
 * the handset model. Hand-rolled rather than pulling a UA-parsing dependency
 * for six lines that will never need to be more precise than this.
 */
function parseAgent(ua: string) {
  const s = ua.toLowerCase();

  const device = /ipad|tablet|playbook|silk/.test(s)
    ? "tablet"
    : /mobi|iphone|android.*mobile|phone/.test(s)
      ? "phone"
      : "desktop";

  const os = /iphone|ipad|ipod/.test(s)
    ? "iOS"
    : /android/.test(s)
      ? "Android"
      : /mac os x/.test(s)
        ? "macOS"
        : /windows/.test(s)
          ? "Windows"
          : /linux/.test(s)
            ? "Linux"
            : null;

  /* Order matters: Edge and Chrome both claim "chrome" or "safari" in their
   * agent strings, so the most specific claim has to be tested first. */
  const browser = /edg\//.test(s)
    ? "Edge"
    : /opr\/|opera/.test(s)
      ? "Opera"
      : /firefox|fxios/.test(s)
        ? "Firefox"
        : /chrome|crios/.test(s)
          ? "Chrome"
          : /safari/.test(s)
            ? "Safari"
            : null;

  return { device, os, browser };
}

/**
 * Record a page view: stamp lastSeenAt, and extend or open a Visit.
 *
 * Fire-and-forget and deliberately silent. This is bookkeeping, and no member
 * may ever see an error page because a statistics row would not write --
 * the same contract advanceDueCatchups holds in the same layout.
 */
export async function touchLastSeen(userId: string, path?: string): Promise<void> {
  try {
    const now = new Date();

    const h = await headers();
    const { device, os, browser } = parseAgent(h.get("user-agent") ?? "");
    /* Vercel puts these on every request at the edge, so geography costs no
     * lookup and no third party. Absent locally, which is why both are
     * nullable and why a dev row simply has no city. */
    const country = h.get("x-vercel-ip-country");
    const city = h.get("x-vercel-ip-city");
    /* Percent-encoded by Vercel (e.g. "New%20Delhi"), and a malformed value
     * must not take the page down. */
    const cityName = city ? safeDecode(city) : null;

    const gapCutoff = new Date(now.getTime() - SESSION_GAP_MIN * 60 * 1000);

    /* The current visit, if there is one. Ordered and limited so this is an
     * index seek on (userId, endedAt) rather than a scan of a growing table. */
    const open = await prisma.visit.findFirst({
      where: { userId, endedAt: { gte: gapCutoff } },
      orderBy: { endedAt: "desc" },
      select: { id: true },
    });

    await Promise.all([
      open
        ? prisma.visit.update({
            where: { id: open.id },
            data: {
              endedAt: now,
              views: { increment: 1 },
              lastPath: path ?? undefined,
              /* Refreshed rather than left at the visit's first value: a
                 member who moves from wifi to mobile data mid-visit is more
                 usefully described by where they are now. */
              device,
              os,
              browser,
              country: country ?? undefined,
              city: cityName ?? undefined,
            },
          })
        : prisma.visit.create({
            data: {
              userId,
              startedAt: now,
              endedAt: now,
              views: 1,
              lastPath: path ?? null,
              device,
              os,
              browser,
              country,
              city: cityName,
            },
          }),

      /* Still worth keeping alongside Visit: it is one indexed column on User,
         so "active in the last 30 days" is a count rather than a join, and it
         survives any future pruning of visit history. */
      prisma.user.updateMany({
        where: {
          id: userId,
          OR: [{ lastSeenAt: null }, { lastSeenAt: { lt: new Date(now.getTime() - LAST_SEEN_STALE_MS) } }],
        },
        data: { lastSeenAt: now },
      }),
    ]);
  } catch (err) {
    /* Swallowed in production on purpose: no member sees an error page because
       a statistics row would not write. LOUD in development, because the first
       time this failed it failed silently and the only symptom was an empty
       table with no clue why. A guard that hides its own breakage is worse
       than no guard. */
    if (process.env.NODE_ENV !== "production") {
      console.error("[presence] touchLastSeen failed:", err);
    }
  }
}

function safeDecode(v: string): string {
  try {
    return decodeURIComponent(v);
  } catch {
    return v;
  }
}
