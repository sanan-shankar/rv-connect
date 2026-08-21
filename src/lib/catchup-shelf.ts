/* ------------------------------------------------------------------ *
 *  Where one member's copy of a Catch-up sits: on the list, filed away,
 *  or in the bin (bug audit B-063).
 *
 *  Pure on purpose. Every rule here is arithmetic on two nullable dates,
 *  and the whole point of extracting it is that the countdown a member
 *  reads on a "Recently deleted" row and the cutoff the nightly sweep
 *  deletes by are the SAME number, computed once. A row saying "3 days
 *  left" that the sweep has already taken is the bug this shape prevents.
 *
 *  No relative value imports: `node:test` cannot resolve an extensionless
 *  `./utils` and tsc refuses `./utils.ts`, so a testable module here
 *  imports nothing but types.
 * ------------------------------------------------------------------ */

/**
 * How long a deleted copy waits in "Recently deleted" before the nightly
 * retention sweep removes the member's GroupMember row for real.
 *
 * 30 days, the owner's number (2026-08-21) and the same span every consumer
 * product uses for a restorable bin, which is the only reason it needs no
 * explaining on screen. It is deliberately shorter than the account-deletion
 * grace window (60 days): leaving one Catch-up is a smaller decision than
 * leaving the site, and a bin nobody empties is just a second list.
 */
export const RECENTLY_DELETED_DAYS = 30;

const DAY_MS = 86_400_000;

/** The three shelves a member's copy can be on. `deleted` wins over `archived`:
 *  a copy can carry both stamps (archive it, then delete it), and the bin is
 *  the more recent, more consequential state. Restoring it clears only
 *  `deletedAt`, so it lands back in Archived, which is where it came from. */
export type CatchupShelf = "active" | "archived" | "deleted";

export type CatchupCopyState = {
  archivedAt: Date | string | null;
  deletedAt: Date | string | null;
} | null;

export function catchupShelf(pref: CatchupCopyState): CatchupShelf {
  if (!pref) return "active";
  if (pref.deletedAt) return "deleted";
  if (pref.archivedAt) return "archived";
  return "active";
}

/**
 * Whole days left before a deleted copy is swept, as a member reads it.
 *
 * Rounded UP, so the last partial day still reads "1 day left" rather than
 * "0 days left" on a row that is still restorable. Never negative: a row the
 * sweep has not reached yet (a missed night) says 0, not a negative count.
 */
export function restoreDaysLeft(deletedAt: Date | string, now: Date): number {
  const stamped = typeof deletedAt === "string" ? new Date(deletedAt) : deletedAt;
  const due = stamped.getTime() + RECENTLY_DELETED_DAYS * DAY_MS;
  return Math.max(0, Math.ceil((due - now.getTime()) / DAY_MS));
}
