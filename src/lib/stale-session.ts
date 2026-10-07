/* A sign-in cookie that no longer signs anyone in, and what to do with it.
 *
 * The proxy only asks whether a session cookie EXISTS (it runs on the edge
 * before every request and cannot read the database). A cookie can outlive
 * its session: a password reset, a block or a deletion request bumps the
 * member's credential epoch and ends every session at once, but nothing
 * deletes the cookie from the browsers that held them. Left alone, that cookie
 * turned the bare domain into a loop with no exit: "/" saw a cookie and sent
 * the visitor to /feed, the (main) layout found no session and sent them to
 * /login, and the "Back" link on /login went to "/" and round again (owner,
 * 2026-10-07, in Safari: "everytime I to to the url on safari (i'm logged out)
 * it doesn't take me to the landing but instead over here").
 *
 * So every "you are signed out" redirect now passes through
 * /api/auth/stale, which deletes a cookie that is confirmed dead and then
 * answers exactly what a visitor with no cookie at all would have got.
 *
 * Import-free on purpose: the rule test imports this file directly, and
 * src/proxy.ts, which is bundled for the edge, imports it too. */

/** The route handler that clears a dead cookie (src/app/api/auth/stale). */
export const STALE_SESSION_PATH = "/api/auth/stale";

/* Auth.js names the cookie with a `__Secure-` prefix over https and without
   one over http (localhost), and splits a token too big for one cookie into
   `.0`, `.1`, ... chunks. A dead session is all of them. */
const SESSION_COOKIE = /^(__Secure-)?authjs\.session-token(\.\d+)?$/;

export function isSessionCookie(name: string): boolean {
  return SESSION_COOKIE.test(name);
}

/**
 * Where someone goes once a dead cookie is gone: the same place they would
 * have gone with no cookie at all. `next` must already be a safe same-site
 * path (safeNextPath), or null when there was no destination.
 *
 * The feed is the one exception, because the feed is what the proxy turns
 * the bare domain into for anyone holding a cookie. By the time a dead
 * session is discovered, "/" has already become "/feed", so a destination of
 * just the feed is read as "they asked for the site", and a signed-out
 * visitor asking for the site gets the landing page. Nothing is lost: the
 * feed is where signing in from the landing page leads anyway. Any other
 * destination is a link somebody followed, and keeps its sign-in detour.
 */
export function signedOutDestination(next: string | null): string {
  if (next === null || next === "/feed") return "/";
  return withNext("/login", next);
}

/** `base`, carrying `next` when there is one. */
export function withNext(base: string, next: string | null | undefined): string {
  return next ? `${base}?next=${encodeURIComponent(next)}` : base;
}
