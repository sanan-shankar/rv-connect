import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { isUniqueViolation } from "@/lib/prisma-errors";
import { statsWritesEnabled } from "@/lib/stats-exclusion";

/* ------------------------------------------------------------------ *
 *  Presence: who is here, where, on what, and for how long.
 *
 *  Two writers, deliberately apart. `touchLastSeen` runs from the (main)
 *  layout on every authenticated render and only stamps User.lastSeenAt.
 *  `recordPageView` runs from /api/presence, which the browser calls on a
 *  real navigation and once a minute while the member is active, and it
 *  alone writes Visit. The layout used to write Visit too, and it renders
 *  for link prefetches and never while somebody reads, which is how most
 *  visits came to read as one page and 0s (2026-09-15).
 *
 *  Nothing here may throw at a member.
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
 * it counts views and follows the path, which is the whole point. */
const LAST_SEEN_STALE_MS = 15 * 60 * 1000;

/* The longest trail one visit keeps. Forty distinct stops is a long sitting;
   past it the visit still counts views and time, it just stops listing. */
const TRAIL_MAX = 40;

/* And the most views one visit may count. The path now arrives from the
   browser, so a scripted account could otherwise post views for ever and drag
   the room's "pages per visit" with it; its own row is all it can reach, and
   this keeps that row inside what a person could do. Four hundred pages in a
   sitting that never goes idle for thirty minutes is far past any real one. */
const VIEWS_MAX = 400;

/** Everything about the visit that is not its identity. */
type VisitFacts = {
  referrer: string | null;
  device: string | null;
  os: string | null;
  browser: string | null;
  language: string | null;
  country: string | null;
  cityName: string | null;
  region: string | null;
};

/**
 * One ping, recorded against this member's own visit.
 *
 * A "view" counts a page and appends it to the trail; a "beat" only moves
 * endedAt, which is what lets a visit spent reading one letter have a length.
 *
 * Update-then-create rather than an upsert, and the update is scoped to
 * `id AND userId` -- not to the id alone. The id arrives in a request header
 * the proxy fills from the caller's own cookie, so an upsert keyed on it let a
 * replayed id write into ANOTHER member's row: their view count, their
 * endedAt, their device and their city (bug-report-2 C-163). Scoped, a foreign
 * id matches nothing, the create then loses to the primary key, and the
 * request records nothing at all -- which is the right outcome for a visit
 * that is not yours.
 *
 * Raw SQL for the update because the trail needs two things Prisma's
 * `push` cannot say: stop at TRAIL_MAX, and skip a page that is already the
 * last one (a reload is a view, not a new stop).
 */
async function recordVisit(
  visitId: string,
  userId: string,
  now: Date,
  path: string,
  kind: "view" | "beat",
  facts: VisitFacts
): Promise<void> {
  const { referrer, device, os, browser, language, country, cityName, region } = facts;
  const isView = kind === "view";

  /* Device and place are refreshed: someone moving from wifi to mobile data
     mid-visit is more usefully described by where they are now. entryPath
     and referrer are NOT here on purpose -- they describe how the visit
     began, and overwriting them would turn "where people arrive" into "where
     they are now". */
  const touched = await prisma.$executeRaw`
    UPDATE "Visit" SET
      "endedAt"  = ${now},
      "views"    = LEAST("views" + ${isView ? 1 : 0}, ${VIEWS_MAX}),
      "lastPath" = ${path},
      "paths"    = CASE
                     WHEN ${isView}
                      AND cardinality("paths") < ${TRAIL_MAX}
                      AND "paths"[cardinality("paths")] IS DISTINCT FROM ${path}::text
                     THEN array_append("paths", ${path}::text)
                     ELSE "paths"
                   END,
      "device"   = ${device},
      "os"       = ${os},
      "browser"  = ${browser},
      "language" = coalesce(${language}, "language"),
      "country"  = coalesce(${country}, "country"),
      "city"     = coalesce(${cityName}, "city"),
      "region"   = coalesce(${region}, "region")
    WHERE "id" = ${visitId} AND "userId" = ${userId}
  `;
  if (touched > 0) return;

  /* A new visit, so check the day's ceiling before opening one. Only reached
     when the id is one we have not seen -- once per sitting for a real
     browser, and every request for the rotating-cookie case this bounds.
     Counted on endedAt, which the (userId, endedAt) index already serves.
     A beat can land here too, when a member comes back to a tab after the
     30-minute window: that is the first page of a new visit, and is opened
     as one. */
  const today = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const opened = await prisma.visit.count({ where: { userId, endedAt: { gte: today } } });
  if (opened >= MAX_VISITS_PER_DAY) return;

  try {
    await prisma.visit.create({
      data: {
        id: visitId,
        userId,
        startedAt: now,
        endedAt: now,
        views: 1,
        lastPath: path,
        entryPath: path,
        paths: [path],
        referrer,
        device,
        os,
        browser,
        language,
        country,
        city: cityName,
        region,
      },
    });
  } catch (err) {
    /* P2002: the id exists and belongs to somebody else, or two requests from
       this browser raced into the create together. Either way there is
       nothing to record and nothing to report -- the row that won is the
       right one. Anything else is re-thrown to the caller's own guard. */
    if (!isUniqueViolation(err)) throw err;
  }
}

/* How many Visit rows one account may open in a day.
 *
 * A browser carries one sliding 30-minute cookie, so an ordinary member makes
 * one row per sitting -- a handful a day, and this ceiling is never in sight.
 * It exists because the visit id arrives in a cookie, and a signed-in caller
 * who rotates that cookie on every request mints one row per page view, for
 * ever, with nothing anywhere to stop them: about 660,000 rows fills the
 * database's whole free-tier disk and takes the site read-only for everybody
 * (bug-report-2 C-163). Presence telemetry is not worth that, so past this
 * line the Visit is simply not opened. `lastSeenAt` still records that the
 * member was here, which is what the rest of the app actually reads. */
const MAX_VISITS_PER_DAY = 40;

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

/** Everything the visit write needs from the request, read during it. */
export type PresenceRequest = VisitFacts & {
  /* The browser's own visit id, minted and rolled by src/proxy.ts. Without it
     (a request that somehow skipped the proxy) there is no safe way to
     attribute the view, so the Visit is skipped rather than guessed at. */
  visitId: string | null;
};

/**
 * Read the request's presence facts. Separate from the write below, and it has
 * to be: the write belongs behind the response, and `headers()` is one of the
 * request-time APIs that may NOT be called inside `after()` -- it throws there
 * (`after.md`: "Calling cookies() or headers() inside the after callback in a
 * Server Component will throw a runtime error"). Since the write swallows
 * everything it catches, doing it the obvious way would have killed presence
 * telemetry in production and said nothing.
 */
export async function readPresence(): Promise<PresenceRequest> {
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

  return {
    referrer, device, os, browser, language, country, cityName, region,
    visitId: h.get("x-visit-id"),
  };
}

/**
 * Record one ping from the presence beacon. Fire-and-forget and deliberately
 * silent: no member may ever see an error because a statistics row would not
 * write. Takes its request facts rather than reading them, so the caller can
 * run it behind the response.
 */
export async function recordPageView(
  userId: string,
  req: PresenceRequest,
  path: string,
  kind: "view" | "beat",
): Promise<void> {
  /* Production only (stats-exclusion.ts). */
  if (!statsWritesEnabled()) return;
  try {
    const { visitId, ...facts } = req;
    if (visitId) await recordVisit(visitId, userId, new Date(), path, kind, facts);
  } catch (err) {
    reportInDev(err);
  }
}

/**
 * Stamp User.lastSeenAt. Not gated by statsWritesEnabled: it is app state the
 * rest of the site reads, not a statistic. One indexed column on User, so
 * "active in the last 30 days" is a count rather than a join, and it survives
 * any pruning of visit history. From the layout, so it does not depend on the
 * browser running JavaScript.
 *
 * Skipped entirely when the caller can already say the column is fresh. The
 * WHERE below makes this a no-op UPDATE for fourteen minutes in every fifteen
 * -- it writes nothing, but it is still a round trip and a row-lock attempt
 * on User on every page view by every member. The layout's session callback
 * has already read this member's row, so the answer is free there. The WHERE
 * stays regardless: it is what keeps two concurrent requests from both
 * deciding to write.
 */
export async function touchLastSeen(userId: string, lastSeenAt?: string | null): Promise<void> {
  const now = new Date();
  if (fresh(lastSeenAt, now)) return;
  try {
    await prisma.user.updateMany({
      where: {
        id: userId,
        OR: [{ lastSeenAt: null }, { lastSeenAt: { lt: new Date(now.getTime() - LAST_SEEN_STALE_MS) } }],
      },
      data: { lastSeenAt: now },
    });
  } catch (err) {
    reportInDev(err);
  }
}

/* Swallowed in production on purpose: no member sees an error page because a
   statistics row would not write. LOUD in development, because the first time
   this failed it failed silently and the only symptom was an empty table with
   no clue why. A guard that hides its own breakage is worse than no guard. */
function reportInDev(err: unknown) {
  if (process.env.NODE_ENV !== "production") {
    console.error("[presence] write failed:", err);
  }
}

/* Unknown reads as stale: the demo persona carries no timestamp, and one
   extra throttled UPDATE is the right price for never skipping a real one.
   An unparseable one reads as stale too, for the same reason. */
function fresh(lastSeenAt: string | null | undefined, now: Date): boolean {
  if (!lastSeenAt) return false;
  const then = Date.parse(lastSeenAt);
  return !Number.isNaN(then) && now.getTime() - then < LAST_SEEN_STALE_MS;
}

function safeDecode(v: string | null): string | null {
  if (!v) return null;
  try {
    return decodeURIComponent(v);
  } catch {
    return v;
  }
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
