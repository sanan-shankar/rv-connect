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
