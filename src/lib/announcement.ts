/* ------------------------------------------------------------------ *
 *  The announcement window over the Feed: who it is for, and how it
 *  counts the members (docs/spec/announcement.md).
 *
 *  Plain data and arithmetic, so the Feed page (server) and the window
 *  (client) read the same answers.
 * ------------------------------------------------------------------ */

/** Which announcement this is. Part of the browser's note that it ended
 *  (announcement-open.ts), so a later announcement is not silenced by an old
 *  note. */
export const ANNOUNCEMENT_ID = "2026-10-birds";

/**
 * The announcement's date, in the valley's time. A member is due while
 * `User.announcementSeenAt` is older than this (or null), so a later
 * announcement only has to move this date to run again for everyone.
 *
 * Everyone is due, members who join after it too. The owner, 2026-10-30:
 * "new joiners get the guide. the next time they open the website fresh they
 * get this". The Feed only offers it once the guide is done, and the window
 * itself holds over to the next visit when the guide was finished in this one
 * (heldForTheGuide below).
 */
export const ANNOUNCEMENT_AT = new Date("2026-10-30T00:00:00+05:30");

export function announcementDue(user: { announcementSeenAt: Date | null }): boolean {
  return user.announcementSeenAt === null || user.announcementSeenAt < ANNOUNCEMENT_AT;
}

/** A tab left open longer than this is not one sitting. */
export const VISIT_MS = 12 * 60 * 60 * 1000;

/**
 * Whether the window waits because the guide's tour ended in this sitting.
 * `endedAt` is when the tour ended in this tab, read off the same browser's
 * clock as `now` (guide-tour.ts writes it), so a phone whose clock is wrong
 * cannot fool it the way comparing against the server's guideSeenAt could.
 * A new tab, or a cold start of the installed app, has no reading: that is
 * the next time the member opens the site.
 */
export function heldForTheGuide(endedAt: number | null, now: number): boolean {
  return endedAt !== null && now - endedAt < VISIT_MS;
}

/**
 * The headcount as the owner said it, "we have nearly 600 members", kept true
 * as the number moves: "Nearly 600" from 575 to 599, "600" at exactly 600,
 * then "More than 600" until it nears the next hundred ("More than 650" past
 * 650). Below a hundred, the number itself, which only the demo ever has.
 */
export function headcountPhrase(n: number): string {
  if (n < 100) return String(n);
  const next = Math.ceil(n / 100) * 100;
  if (next > n && next - n <= 25) return `Nearly ${next}`;
  const floor = Math.floor(n / 50) * 50;
  return floor < n ? `More than ${floor}` : String(n);
}
