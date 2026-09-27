/* ------------------------------------------------------------------ *
 *  The first-run tour's notes in this browser (docs/spec/guide.md 5.3).
 *
 *  The account's own record is User.guideSeenAt, written by markGuideSeen
 *  when the tour ends, and the Feed only starts the tour while that is
 *  null. These two notes cover what the server cannot see:
 *
 *   - TOUR_ENDED, the tour ended here. The (main) layout and a prefetched
 *     Feed can both outlive the server write within one visit, so without
 *     this a soft navigation back to the Feed could start it again.
 *   - TOUR_AT, the chapter reached. The tour is stamped when it ENDS, not
 *     when it starts, so a phone that kills the tab halfway brings the
 *     member back to the page they were on rather than to the beginning.
 *
 *  Both are moment keys in one-shot.ts, the app's one localStorage latch,
 *  per member, so a shared browser never hands one member's tour to
 *  another. The e2e sign-in writes TOUR_ENDED for its own account so the
 *  visual suite photographs the Feed, not the tour (e2e/auth.setup.ts).
 * ------------------------------------------------------------------ */

import { hasFired, markFired, readProgress, writeProgress } from "@/components/mascot/moments/one-shot";

export const TOUR_ENDED = "guideTour";
const TOUR_AT = "guideTourAt";

/** Set the moment the tour ends in this visit, before any storage is touched. */
let endedThisVisit = false;

export function tourEnded(userId: string): boolean {
  return endedThisVisit || hasFired(userId, TOUR_ENDED);
}

/** The chapter to start on: where this member left off, or the first. */
export function tourStartArea(userId: string, chain: string[]): string {
  const at = readProgress(userId, TOUR_AT);
  return at !== null && at >= 0 && at < chain.length ? chain[at] : chain[0];
}

export function noteTourAt(userId: string, index: number): void {
  writeProgress(userId, TOUR_AT, index);
}

export function noteTourEnded(userId: string): void {
  endedThisVisit = true;
  markFired(userId, TOUR_ENDED);
}
