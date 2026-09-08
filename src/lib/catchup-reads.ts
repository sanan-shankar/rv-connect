import { prisma } from "@/lib/prisma";

/* ------------------------------------------------------------------ *
 *  Who has read which Edition (build phase 5, spec 3.9).
 *
 *  One row per person per Edition, written the first time they open the
 *  reader on a published one. Its whole job is to let an Edition nobody
 *  has opened look different from one they have, on the list and on the
 *  home's covers, WITHOUT anything counting anything: he has said twice
 *  that a number nobody asked for is noise (R32, "you're trying so hard
 *  to include useless information"), so this is a yes or a no and never
 *  "read by 9 of 23".
 *
 *  It deliberately does not ride on `ContentView`, which already writes
 *  a (viewerId, "edition", targetId) row from the same page. That table
 *  is the admin analytics counter: it is under standing pressure to
 *  stay bounded, its `targetId` is not a foreign key, and it counts an
 *  UNPUBLISHED Edition too. A member's unread mark should not be one
 *  retention decision away from flipping.
 * ------------------------------------------------------------------ */

/**
 * Mark one Edition read by one member. Fire-and-forget; never throws.
 *
 * Called from `after()` on the reader, so it is off the render's path and a
 * bad minute in the database costs a mark rather than a page. Idempotent by
 * the primary key: `readAt` keeps the FIRST reading, because "when did you
 * first see this" is the only question the mark can answer and re-opening an
 * Edition a year later should not make it look new again.
 *
 * The demo writes these like anything else: every visitor arrives as the same
 * persona there, so the marks are that persona's, and the nightly reset takes
 * them with the Editions they point at.
 */
export async function markEditionRead(userId: string, editionId: string): Promise<void> {
  try {
    await prisma.catchupEditionRead.upsert({
      where: { userId_editionId: { userId, editionId } },
      create: { userId, editionId },
      update: {},
    });
  } catch (err) {
    // Logged in development, and only there. A guard that hides its own
    // breakage is worse than no guard (CLAUDE.md, the touchLastSeen lesson);
    // in production a missing mark must never reach a member as an error.
    if (process.env.NODE_ENV !== "production") {
      console.error("[catchup-reads] failed:", err);
    }
  }
}

/**
 * Which of these Editions has this member already opened.
 *
 * One query for a whole page, and the answer is a SET rather than a count on
 * each row: the list needs to know whether there is something new behind a
 * cover, never how many people have been there ("you're trying so hard to
 * include useless information", R32). Build phase 6 is its first reader; the
 * mark itself has been written since phase 5.
 *
 * An empty input short-circuits rather than issuing `IN ()`.
 */
export async function readEditionIds(
  userId: string,
  editionIds: string[]
): Promise<Set<string>> {
  if (editionIds.length === 0) return new Set();
  const rows = await prisma.catchupEditionRead.findMany({
    where: { userId, editionId: { in: editionIds } },
    select: { editionId: true },
  });
  return new Set(rows.map((r) => r.editionId));
}
