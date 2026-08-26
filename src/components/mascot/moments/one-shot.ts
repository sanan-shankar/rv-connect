/* ------------------------------------------------------------------ *
 *  one-shot.ts — tiny localStorage helpers for celebration moments that
 *  must fire at most once, and only on a real transition (never
 *  retroactively for progress a member made before a given moment
 *  shipped). Scoped per user id + moment key, so switching accounts on
 *  the same browser never leaks one person's celebrations onto
 *  another's session, and a signed-out visitor never touches storage.
 *
 *  Two small state machines share this file:
 *   - hasFired/markFired: a plain one-shot latch ("has this ever played").
 *   - readProgress/writeProgress: a stored number (a baseline count or a
 *     0/1 "seen incomplete" flag) a detector compares today's value
 *     against to decide whether a real transition just happened.
 *  A given moment key uses exactly one of the two styles throughout (see
 *  celebration-detector.tsx), so they never collide on the same key.
 * ------------------------------------------------------------------ */

import { safeGet, safeSet } from "@/lib/local-storage";

const PREFIX = "rv:moment:";

function storageKey(userId: string, moment: string): string {
  return `${PREFIX}${moment}:${userId}`;
}

/** True once `markFired` has been called for this user + moment. */
export function hasFired(userId: string, moment: string): boolean {
  return safeGet(storageKey(userId, moment)) === "fired";
}

/** Permanently latch a one-shot moment so it can never fire again for this user. */
export function markFired(userId: string, moment: string): void {
  safeSet(storageKey(userId, moment), "fired");
}

/** Read a stored progress number (a baseline count, or a 0/1 flag), or null if unset. */
export function readProgress(userId: string, moment: string): number | null {
  const raw = safeGet(storageKey(userId, moment));
  if (raw === null) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export function writeProgress(userId: string, moment: string, value: number): void {
  safeSet(storageKey(userId, moment), String(value));
}
