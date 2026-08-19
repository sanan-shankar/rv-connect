import { prisma } from "@/lib/prisma";

/* ------------------------------------------------------------------ *
 *  What people look for.
 *
 *  The owner asked for "the most common searches" and nothing recorded
 *  them: the header pill submits to /feed?q= and the directory filters
 *  in the browser, so every query anyone had ever typed was discarded.
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
  try {
    const query = input.query.trim().slice(0, MAX_QUERY);
    /* A single character is a keystroke, not a search. */
    if (query.length < 2) return;

    if (input.userId) {
      const recent = await prisma.searchLog.findFirst({
        where: {
          userId: input.userId,
          scope: input.scope,
          query,
          createdAt: { gte: new Date(Date.now() - DEDUPE_MS) },
        },
        select: { id: true },
      });
      if (recent) {
        /* Same search again within the window: keep the row, refresh the
         * result count, which may have changed as they kept typing. */
        if (input.results !== undefined) {
          await prisma.searchLog.update({
            where: { id: recent.id },
            data: { results: input.results },
          });
        }
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
