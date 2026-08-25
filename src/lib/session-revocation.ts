/* ------------------------------------------------------------------ *
 *  Is this token still a session? (audits M4, M5, M6, H4)
 *
 *  A JWT that verifies cryptographically is not the same thing as a live
 *  session. This repo's tokens last SESSION_MAX_AGE (ninety days, below), so
 *  without a per-read check against the row, blocking somebody, deleting their
 *  account or resetting their password would leave them browsing for a
 *  quarter of a year.
 *
 *  Three ways a valid token is no longer a session:
 *
 *    row gone    the account was deleted (M6).
 *    blocked     the block landed after this token was minted (H4).
 *    stale epoch the password was reset or changed since it was minted (M4);
 *                every such write bumps User.credentialVersion.
 *
 *  This lived inline in the NextAuth session callback, where nothing could
 *  reach it: no test in the repo mentioned credentialVersion, so flipping the
 *  `!==`, dropping the isBlocked clause or removing a column from the select
 *  all passed `npm run check` while every revoked session stayed live
 *  (bug-report-2 C-187). It is a pure function here so the rule can be
 *  attacked in a unit test, and so the test can check that the query feeding
 *  it still fetches what it reads.
 * ------------------------------------------------------------------ */

/**
 * How long a signed-in session lasts, in seconds.
 *
 * NINETY DAYS, and ABSOLUTE rather than rolling (owner, 2026-08-25; the
 * finding that surfaced it is audit C-032). The cookie's expiry is fixed at
 * sign-in and never advances, however often somebody visits, because the
 * refresh NextAuth documents rides on Set-Cookie headers that this app's
 * request path discards — see the long comment at the `session` config in
 * auth.ts. So this number is exactly "how long until every member signs in
 * again", not "how long an idle member has left".
 *
 * Lives in this pure module because TWO places mint a session cookie: the real
 * one in auth.ts, and /api/dev-login for local tooling. That second one used
 * to carry its own hand-typed 30 days with a comment claiming it matched a
 * maxAge auth.ts never actually set.
 *
 * Raising it is a trade, not a free win: it is also the longest a cookie left
 * on a borrowed laptop stays useful. What it does NOT weaken is revocation —
 * the rule below runs on every session read, so a block, a password reset or
 * a deletion request still ends every live session at once, whatever this says.
 */
export const SESSION_MAX_AGE = 90 * 24 * 60 * 60;

/** Exactly what the rule below reads off the User row. */
export type RevocationRow = {
  isBlocked: boolean;
  credentialVersion: number | null;
};

/**
 * True when the bearer of this token must be signed out.
 *
 * Fails CLOSED on every unknown: a missing row is a revocation, and a token
 * whose epoch cannot be compared is treated as epoch 0 — which is the value
 * every pre-existing row was backfilled with, so tokens minted before the
 * claim existed stay valid rather than signing the whole membership out.
 */
export function sessionRevoked(
  row: RevocationRow | null | undefined,
  tokenCredentialVersion: number | null | undefined
): boolean {
  if (!row) return true;
  if (row.isBlocked) return true;
  return (row.credentialVersion ?? 0) !== (tokenCredentialVersion ?? 0);
}
