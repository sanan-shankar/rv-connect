/* ------------------------------------------------------------------ *
 *  onboarding-local.ts — tiny localStorage helper for the post-signup
 *  onboarding wizard. This is a durability fallback, never a security
 *  boundary: the real "have they finished?" signal is server data
 *  (User.admissionNumber), per the onboarding route's own guard.
 *
 *  "Seen" — a user who bailed out of the wizard before admissionNumber
 *  got saved (e.g. via "Finish later" on the Welcome or Register step)
 *  would otherwise replay the Welcome step (and its hoopoe moment)
 *  every time they land back on /onboarding. Once they have seen the
 *  wizard at all, later visits skip straight to the first incomplete
 *  step instead of greeting them again.
 *
 *  Scoped per user id, same convention as mascot/moments/one-shot.ts, so
 *  switching accounts on one browser never crosses wires.
 * ------------------------------------------------------------------ */

import { safeGet, safeSet } from "./local-storage";

const SEEN_PREFIX = "rv:onboarding:seen:";

export function hasSeenOnboarding(userId: string): boolean {
  return safeGet(SEEN_PREFIX + userId) === "1";
}

export function markOnboardingSeen(userId: string): void {
  safeSet(SEEN_PREFIX + userId, "1");
}
