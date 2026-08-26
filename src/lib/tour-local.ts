/* ------------------------------------------------------------------ *
 *  tour-local.ts — tiny localStorage helpers for the first-run product
 *  walkthrough (Feed -> Directory -> Collection -> Catch-ups), shaped in
 *  the exact pattern of onboarding-local.ts: safe get/set that never
 *  throws in private mode, scoped per user id so switching accounts on
 *  one browser never crosses wires.
 *
 *  V1 decision: localStorage only, no User column. Key `rv:tour:<userId>`, value
 *  "completed" or "dismissed". Losing this flag never loses real data; it
 *  only matters if the dormant automatic offer is explicitly re-enabled.
 *  The owner Admin page's "hoopoe tour" action remains a manual way back in
 *  regardless of this flag (see tour-provider.tsx's `start()`).
 * ------------------------------------------------------------------ */

import { safeGet, safeSet } from "./local-storage";

const STATE_PREFIX = "rv:tour:";

type TourLocalState = "completed" | "dismissed";

/** The stored state for this user, or null if the tour has never been settled. */
function readTourState(userId: string): TourLocalState | null {
  const v = safeGet(STATE_PREFIX + userId);
  return v === "completed" || v === "dismissed" ? v : null;
}

/** completed OR dismissed — either way, an enabled auto-offer should not fire again. */
export function hasSettledTour(userId: string): boolean {
  return readTourState(userId) !== null;
}

export function markTourCompleted(userId: string): void {
  safeSet(STATE_PREFIX + userId, "completed");
}

/** Skip (mid-tour) and "Maybe later" (at the offer) both settle here. */
export function markTourDismissed(userId: string): void {
  safeSet(STATE_PREFIX + userId, "dismissed");
}
