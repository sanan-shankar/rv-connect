/**
 * localStorage that cannot throw.
 *
 * Four modules kept their own SSR-guarded, try/caught pair of accessors: the
 * onboarding wizard's "seen" flag, the tour's settled state, the mascot's
 * one-shot moments and the letter composer's draft. All four wrote the same
 * eleven lines and the same reasoning in their comments, which is the sign
 * that the reasoning belongs in one place.
 *
 * Two things go wrong here and neither is worth an error page.
 *
 * The first is the server: `window` does not exist during SSR, and every one
 * of these is read from a component that renders on both sides.
 *
 * The second is the browser refusing. Safari in private browsing, a storage
 * quota that is full, a profile with site data blocked — `getItem` and
 * `setItem` throw a real exception in each case, and they throw at whatever
 * moment the member happened to be in. What is stored here is never a security
 * boundary and never the source of truth (the server holds that); losing it
 * costs a repeated welcome step, a tour offered twice, a draft that was on
 * screen anyway. So the failure is swallowed on purpose, and each caller's own
 * banner says what it costs when it is.
 */

export function safeGet(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function safeSet(key: string, value: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Nothing to do and nobody to tell: see the banner.
  }
}

export function safeRemove(key: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // As above.
  }
}
