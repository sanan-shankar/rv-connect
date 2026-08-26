/**
 * Today's ACTUAL Wordle answer (owner, 2026-07-31: the gauntlet's word gate
 * "was supposed to be the answer to today's wordle"). The New York Times
 * publishes each day's solution at a public JSON endpoint keyed by date;
 * we ask for the IST date, because the valley's day is an IST day (same
 * rule the old word-of-day used).
 *
 * Server-only: the fetch runs in the dark-mode page's server component and
 * Next caches it for an hour, so the NYT sees at most a couple of requests
 * a day, not one per gauntlet visitor. If the endpoint is unreachable
 * (offline dev, NYT change), a small deterministic fallback keeps the gate
 * functional rather than unpassable - the ceremony must never hard-fail on
 * someone eight steps deep.
 */

import { fnv1a } from "./fnv1a.ts";

const FALLBACK_WORDS = ["crane", "slate", "perch", "robin", "stork"] as const;

/**
 * How long the NYT gets to answer before the gauntlet stops waiting.
 *
 * The catch below only ever caught a REJECTION, and the failure this file
 * exists to survive is not always a rejection: an endpoint that accepts the
 * connection and then never replies does not reject, so the await sat in the
 * /dark-mode render until the platform killed the function -- a 504 for the
 * first visitor after each cache expiry, which is precisely the hard-fail the
 * header above promises cannot happen (audit C-116). Three seconds is far
 * longer than this call has ever needed and far shorter than a page render.
 */
const NYT_TIMEOUT_MS = 3000;

function istDateKey(date: Date = new Date()): string {
  // en-CA renders YYYY-MM-DD, which is exactly the NYT URL format.
  return date.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}

export async function getWordleAnswer(): Promise<string> {
  const key = istDateKey();
  try {
    const res = await fetch(`https://www.nytimes.com/svc/wordle/v2/${key}.json`, {
      // One-hour cache: the answer only changes once a day, but a short
      // window keeps a bad cached failure from sticking all day.
      next: { revalidate: 3600 },
      // A deadline, so a hang becomes the rejection the catch below can
      // actually act on. Without it the fallback was unreachable in the one
      // case it was written for.
      signal: AbortSignal.timeout(NYT_TIMEOUT_MS),
    });
    if (res.ok) {
      const data = (await res.json()) as { solution?: string };
      if (typeof data.solution === "string" && data.solution.length > 0) {
        return data.solution.toLowerCase();
      }
    }
  } catch {
    /* fall through to the local pick */
  }
  return FALLBACK_WORDS[fnv1a(key) % FALLBACK_WORDS.length];
}
