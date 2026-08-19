import { prisma } from "@/lib/prisma";

/* ------------------------------------------------------------------ *
 *  "Who is still using this" -- the one question the database could not
 *  answer (src/app/(main)/admin/analytics/page.tsx).
 *
 *  Called from the (main) layout, which renders on EVERY authenticated
 *  page, so the cost of this has to be close to nothing.
 * ------------------------------------------------------------------ */

/* A write every page view would mean a row update on every navigation for
 * every member -- pure write amplification against a pooled connection, to
 * record a fact that only ever gets read at day granularity. Fifteen minutes
 * is far finer than any question anyone will ask of this column ("active this
 * week", "active this month") and turns a busy session into ~4 writes/hour
 * instead of hundreds. */
const STALE_MS = 15 * 60 * 1000;

/**
 * Stamp the member as here, at most once every 15 minutes.
 *
 * Deliberately fire-and-forget and deliberately silent: this is bookkeeping,
 * and a member must never see an error page because a statistics column could
 * not be written. Modelled on advanceDueCatchups in the same layout, which
 * swallows everything for the same reason.
 */
export async function touchLastSeen(userId: string): Promise<void> {
  try {
    const cutoff = new Date(Date.now() - STALE_MS);
    /* updateMany with the cutoff in the WHERE, rather than read-then-write:
     * one round trip, and no race where two concurrent page loads both decide
     * they are the one that should write. Rows already fresh match nothing and
     * cost only the index probe. */
    await prisma.user.updateMany({
      where: {
        id: userId,
        OR: [{ lastSeenAt: null }, { lastSeenAt: { lt: cutoff } }],
      },
      data: { lastSeenAt: new Date() },
    });
  } catch {
    /* Swallowed on purpose. See above. */
  }
}
