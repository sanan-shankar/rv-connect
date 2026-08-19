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
/* Kept as documentation of the window; the window itself is now enforced by
 * the rolling cookie's max-age in src/proxy.ts. */
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
    /* Percent-encoded by Vercel (e.g. "New%20Delhi"), and a malformed value
     * must not take the page down. */
    const cityName = safeDecode(h.get("x-vercel-ip-city"));
    const region = safeDecode(h.get("x-vercel-ip-country-region"));
    const timezone = h.get("x-vercel-ip-timezone");
    const lat = num(h.get("x-vercel-ip-latitude"));
    const lng = num(h.get("x-vercel-ip-longitude"));

    /* Host only. The full referring URL carries query strings -- somebody
     * else's search terms and tracking ids -- which are not ours to keep, and
     * "where do people arrive from" only ever needed the domain. Same-origin
     * referrers are dropped: every internal navigation would otherwise report
     * this site as its own source and drown the one interesting row. */
    const referrer = refererHost(h.get("referer"), h.get("host"));

    /* First tag only: "en-GB,en;q=0.9,hi;q=0.8" is a preference list, and the
     * question ("does anyone need this in another language") wants the top
     * choice, not the whole negotiation. */
    const language = h.get("accept-language")?.split(",")[0]?.trim() || null;

    /* The browser's own visit id, minted and rolled by src/proxy.ts. With it
     * this is a single upsert on a known primary key: no read-then-write, so
     * nothing to race over. Without it (a request that somehow skipped the
     * proxy) there is no safe way to attribute the view, so the Visit is
     * skipped rather than guessed at -- lastSeenAt below still records that
     * the member was here. */
    const visitId = h.get("x-visit-id");

    await Promise.all([
      visitId
        ? prisma.visit.upsert({
            where: { id: visitId },
            create: {
              id: visitId,
              userId,
              startedAt: now,
              endedAt: now,
              views: 1,
              lastPath: path ?? null,
              entryPath: path ?? null,
              referrer,
              device,
              os,
              browser,
              language,
              country,
              city: cityName,
              region,
              timezone,
              lat,
              lng,
            },
            update: {
              endedAt: now,
              views: { increment: 1 },
              lastPath: path ?? undefined,
              /* Refreshed: someone moving from wifi to mobile data mid-visit is
                 more usefully described by where they are now. entryPath and
                 referrer are NOT here on purpose -- they describe how the visit
                 began, and overwriting them would turn "where people arrive"
                 into "where they are now". */
              device,
              os,
              browser,
              language: language ?? undefined,
              country: country ?? undefined,
              city: cityName ?? undefined,
              region: region ?? undefined,
              timezone: timezone ?? undefined,
              lat: lat ?? undefined,
              lng: lng ?? undefined,
            },
          })
        : Promise.resolve(),

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

function safeDecode(v: string | null): string | null {
  if (!v) return null;
  try {
    return decodeURIComponent(v);
  } catch {
    return v;
  }
}

function num(v: string | null): number | null {
  if (!v) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** The referring host, or null for same-origin and unparseable values. */
function refererHost(referer: string | null, host: string | null): string | null {
  if (!referer) return null;
  try {
    const h = new URL(referer).host;
    return h && h !== host ? h : null;
  } catch {
    return null;
  }
}
