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

const FALLBACK_WORDS = ["crane", "slate", "perch", "robin", "stork"] as const;

function istDateKey(date: Date = new Date()): string {
  // en-CA renders YYYY-MM-DD, which is exactly the NYT URL format.
  return date.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}

/** FNV-1a over the date key, for the offline fallback pick. */
function hash(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export async function getWordleAnswer(): Promise<string> {
  const key = istDateKey();
  try {
    const res = await fetch(`https://www.nytimes.com/svc/wordle/v2/${key}.json`, {
      // One-hour cache: the answer only changes once a day, but a short
      // window keeps a bad cached failure from sticking all day.
      next: { revalidate: 3600 },
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
  return FALLBACK_WORDS[hash(key) % FALLBACK_WORDS.length];
}
