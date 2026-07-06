/* ------------------------------------------------------------------ *
 *  onboarding-local.ts — tiny localStorage helpers for the post-signup
 *  onboarding wizard. Everything here is a durability fallback, never a
 *  security boundary: the real "have they finished?" signal is server
 *  data (User.admissionNumber), per the onboarding route's own guard.
 *  This file covers the two things that data alone cannot:
 *
 *   1. "Seen" — a user who bailed out of the wizard before admissionNumber
 *      got saved (e.g. via "Finish later" on the Welcome or Register step)
 *      would otherwise replay the Welcome step (and its hoopoe moment)
 *      every time they land back on /onboarding. Once they have seen the
 *      wizard at all, later visits skip straight to the first incomplete
 *      step instead of greeting them again.
 *   2. "Houses pending" — until the owner's pending migration lands the
 *      `houses` column (see prisma/pending-migration.sql section 1), a
 *      houses submission is parked here instead of the database. The
 *      "finish setup" nudge on /feed reads this to know a save is still
 *      owed once the column exists.
 *
 *  Scoped per user id, same convention as mascot/moments/one-shot.ts, so
 *  switching accounts on one browser never crosses wires.
 * ------------------------------------------------------------------ */

const SEEN_PREFIX = "rv:onboarding:seen:";
const HOUSES_PENDING_PREFIX = "rv:onboarding:housesPending:";
import type { HouseYearEntry } from "@/lib/houses";

function safeGet(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null; // private mode / quota — never let onboarding throw over this
  }
}

function safeSet(key: string, value: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // storage disabled — worst case a step replays once; never crash the page
  }
}

function safeRemove(key: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

export function hasSeenOnboarding(userId: string): boolean {
  return safeGet(SEEN_PREFIX + userId) === "1";
}

export function markOnboardingSeen(userId: string): void {
  safeSet(SEEN_PREFIX + userId, "1");
}

/** Park a houses submission client-side until the `houses` column exists. */
export function writePendingHouses(userId: string, rows: HouseYearEntry[]): void {
  safeSet(HOUSES_PENDING_PREFIX + userId, JSON.stringify(rows));
}

export function readPendingHouses(userId: string): HouseYearEntry[] | null {
  const raw = safeGet(HOUSES_PENDING_PREFIX + userId);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/** Once the real column has taken the write, drop the local parking spot. */
export function clearPendingHouses(userId: string): void {
  safeRemove(HOUSES_PENDING_PREFIX + userId);
}

export function hasPendingHouses(userId: string): boolean {
  return readPendingHouses(userId) !== null;
}
