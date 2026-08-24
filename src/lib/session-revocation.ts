/* ------------------------------------------------------------------ *
 *  Is this token still a session? (audits M4, M5, M6, H4)
 *
 *  A JWT that verifies cryptographically is not the same thing as a live
 *  session. This repo's tokens last 30 days, so without a per-read check
 *  against the row, blocking somebody, deleting their account or resetting
 *  their password would leave them browsing for up to a month.
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
