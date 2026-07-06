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

const PREFIX = "rv:moment:";

function storageKey(userId: string, moment: string): string {
  return `${PREFIX}${moment}:${userId}`;
}

function read(userId: string, moment: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(storageKey(userId, moment));
  } catch {
    return null; // private mode / quota — never let a delight throw
  }
}

function write(userId: string, moment: string, value: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKey(userId, moment), value);
  } catch {
    // storage disabled — worst case the moment can repeat once; never crash the page for it
  }
}

/** True once `markFired` has been called for this user + moment. */
export function hasFired(userId: string, moment: string): boolean {
  return read(userId, moment) === "fired";
}

/** Permanently latch a one-shot moment so it can never fire again for this user. */
export function markFired(userId: string, moment: string): void {
  write(userId, moment, "fired");
}

/** Read a stored progress number (a baseline count, or a 0/1 flag), or null if unset. */
export function readProgress(userId: string, moment: string): number | null {
  const raw = read(userId, moment);
  if (raw === null) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export function writeProgress(userId: string, moment: string, value: number): void {
  write(userId, moment, String(value));
}
