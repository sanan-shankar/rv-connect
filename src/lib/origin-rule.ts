/**
 * The cross-site origin rule for cookie-authenticated API routes (audit M33).
 *
 * The three upload routes authenticate with the session cookie and, until
 * this, relied ONLY on `SameSite=Lax` to stop a cross-site page from riding
 * that cookie — a single point of failure the audit called out: one cookie
 * policy change, one browser quirk, one future SameSite=None need, and three
 * authenticated write endpoints become callable from any site. Server
 * Actions already get an Origin check from Next itself; the API routes get
 * this one.
 *
 * The rule: a request carrying an Origin header must name the same host the
 * request arrived at. A missing Origin is allowed — every browser sends one
 * on a cross-site POST (which is the attack this exists to stop), so absence
 * means a non-browser caller (a probe, curl, a server), which cannot have a
 * member's cookie riding along ambiently in the first place.
 *
 * Pure — no imports — so node runs its tests directly (origin-rule.test.mjs).
 */
export function originAllowed(
  originHeader: string | null,
  hostHeader: string | null
): boolean {
  if (!originHeader) return true;
  // Some clients send the literal string "null" (sandboxed iframes, file://
  // pages). That is by definition not this site, and exactly the kind of
  // context a cookie must not be spendable from.
  if (originHeader === "null") return false;
  if (!hostHeader) return false;
  let originHost: string;
  try {
    originHost = new URL(originHeader).host;
  } catch {
    return false;
  }
  return originHost === hostHeader;
}
