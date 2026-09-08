/* ------------------------------------------------------------------ *
 *  Where one member's copy of a Catch-up sits: on the list, or filed
 *  away (bug audit B-063; build phase 5).
 *
 *  Pure on purpose, and much smaller than it was. It used to hold a
 *  third shelf -- the thirty-day bin -- and the arithmetic that kept a
 *  member's "3 days left" and the nightly sweep's cutoff the same
 *  number. Deleting became LEAVING (his, N18: "defaults, except
 *  deleting becomes leaving"), so there is no bin, no countdown and no
 *  sweep: leaving takes the membership row now, and what you already
 *  published stays where other people have read it.
 *
 *  No relative value imports: `node:test` cannot resolve an
 *  extensionless `./utils` and tsc refuses `./utils.ts`, so a testable
 *  module here imports nothing but types.
 * ------------------------------------------------------------------ */

/** The two shelves a member's copy can be on. */
export type CatchupShelf = "active" | "archived";

export type CatchupCopyState = {
  archivedAt: Date | string | null;
} | null;

export function catchupShelf(pref: CatchupCopyState): CatchupShelf {
  if (!pref) return "active";
  return pref.archivedAt ? "archived" : "active";
}

/* ------------------------------------------------------------------ *
 *  The list's spare slots (spec section 5).
 *
 *  His, 2026-09-07: "regarding the one catch up page let's just show the
 *  latest editions in a preview like we're doing but on that page! I
 *  think that would work well. let's do it so it maxes at 4. that is if
 *  they have one catch up then max latest 3 editions. if they have 2
 *  catch ups the the latest two editions whichever one they're from. if
 *  they have four catch up, no need to show editions there. we'd have to
 *  show the date and from which catch up it is if there's more than one
 *  catch up."
 *
 *  So the grid holds four things. Catch-up cards come first and the
 *  remainder is filled with the most recent Editions, newest first, from
 *  whichever Catch-ups they belong to.
 * ------------------------------------------------------------------ */

/** Four, and it is his number: "let's do it so it maxes at 4." */
export const LIST_GRID_SLOTS = 4;

/**
 * How many Edition covers fill the grid behind `catchups` Catch-up cards.
 *
 * 1 -> 3, 2 -> 2, 3 -> 1, 4 or more -> 0, and none at all when the member has
 * no Catch-ups: an Edition is only reachable through a membership, so a
 * member with nothing on the shelf has nothing to show under it either, and
 * the subtraction would otherwise offer three slots to fill from an empty
 * set.
 */
export function editionSlots(catchups: number): number {
  if (catchups <= 0) return 0;
  return Math.max(0, LIST_GRID_SLOTS - catchups);
}
