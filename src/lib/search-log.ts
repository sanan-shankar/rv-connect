import { prisma } from "@/lib/prisma";
import { isSameSearch } from "@/lib/search-continuation";
import { statsWritesEnabled } from "@/lib/stats-exclusion";

/* ------------------------------------------------------------------ *
 *  What people look for.
 *
 *  The owner asked for "the most common searches" and nothing recorded
 *  them: every query anyone had ever typed was discarded.
 *
 *  This used to say the directory "filters in the browser", which was
 *  never true -- its search round-trips to /directory?q= and renders
 *  server-side -- and that sentence is why the one surface whose whole
 *  job is finding people was the one scope with no writer (audit C-097).
 *
 *  The query is stored as typed, which is the whole point -- "what are
 *  people failing to find" cannot be answered by a count -- and it is
 *  covered by the same disclosure as the rest of the presence data.
 * ------------------------------------------------------------------ */

export type SearchScope = "feed" | "directory" | "people" | "places";

/** Longer than any real search and short enough that a pasted essay,
 *  or a URL somebody dropped into the box, cannot bloat the table. */
const MAX_QUERY = 120;

/**
 * How long before the same person searching the same thing counts again.
 *
 * A live-filtering box fires on every keystroke: typing "Bengaluru" would
 * otherwise write nine rows, of which eight are prefixes nobody searched for.
 * Debouncing in the browser helps but cannot be trusted, so the dedupe lives
 * here where it is guaranteed.
 *
 * The window alone never did that job, because the dedupe matched an EXACT
 * query and every keystroke is a different string -- so all nine rows landed
 * anyway, inside the window, exactly as the paragraph above says they must not
 * (bug audit M25). `isSameSearch` is the missing half.
 */
const DEDUPE_MS = 60_000;

/**
 * Record a search. Fire-and-forget, and never throws.
 *
 * Silent for the same reason touchLastSeen is: nobody's search may fail
 * because a statistics row would not write. Loud in development, because a
 * telemetry writer that hides its own breakage is worse than none.
 */
export async function logSearch(input: {
  scope: SearchScope;
  query: string;
  userId?: string | null;
  results?: number;
}): Promise<void> {
  if (!statsWritesEnabled()) return;
  try {
    const query = input.query.trim().slice(0, MAX_QUERY);
    /* A single character is a keystroke, not a search. */
    if (query.length < 2) return;

    if (input.userId) {
      /* The most recent search this person made in this box, whatever it was.
       * Matching on the query here would only ever find an identical string,
       * which is the thing a live box does not produce twice. */
      const recent = await prisma.searchLog.findFirst({
        where: {
          userId: input.userId,
          scope: input.scope,
          createdAt: { gte: new Date(Date.now() - DEDUPE_MS) },
        },
        orderBy: { createdAt: "desc" },
        select: { id: true, query: true },
      });
      if (recent && isSameSearch(recent.query, query)) {
        /* Still the same search: keep the one row and move it on to where the
         * typing has got to. The LATEST text, not the longest -- somebody who
         * types "Bengaluru" then trims back to "Bengal" and stops has searched
         * for "Bengal", and that is what the log should say. */
        await prisma.searchLog.update({
          where: { id: recent.id },
          data: {
            query,
            ...(input.results !== undefined ? { results: input.results } : {}),
          },
        });
        return;
      }
    }

    await prisma.searchLog.create({
      data: {
        scope: input.scope,
        query,
        userId: input.userId ?? null,
        results: input.results ?? null,
      },
    });
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[search-log] failed:", err);
    }
  }
}
