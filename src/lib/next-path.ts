/**
 * Where to send someone after they sign in or finish signing up.
 *
 * `?next=` exists so a shared link can survive the auth detour: follow a
 * Catch-up invite with no account, and you come back to that same invitation
 * once you have one, instead of being dropped on the feed wondering what
 * happened to the link you clicked.
 *
 * Only a same-site absolute PATH is honoured. Anything else falls back, which
 * is what stops the sign-in page becoming an open redirect:
 *  - must start with "/"       (rejects "https://evil.example")
 *  - but not "//"              (protocol-relative, i.e. another host)
 *  - no backslashes            (browsers normalise "\" to "/", so "/\evil.example" escapes)
 *  - no control characters     (a newline can split a Location header)
 */
export function safeNextPath(
  next: string | null | undefined,
  fallback = "/feed"
): string {
  if (typeof next !== "string" || next.length === 0) return fallback;
  if (!next.startsWith("/") || next.startsWith("//")) return fallback;
  if (next.includes("\\")) return fallback;
  if (/[\u0000-\u001F\u007F]/.test(next)) return fallback;
  return next;
}

/**
 * The client-side read of the same param, from the live URL rather than a
 * hook. `useSearchParams()` would force every page that wants this into a
 * Suspense boundary; these call sites only need the value inside a click
 * handler, long after hydration, where `window.location` is simply correct.
 */
export function nextPathFromLocation(fallback = "/feed"): string {
  if (typeof window === "undefined") return fallback;
  return safeNextPath(new URLSearchParams(window.location.search).get("next"), fallback);
}
