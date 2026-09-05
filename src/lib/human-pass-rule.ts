import crypto from "crypto";

/* The pure half of the human pass (see human-pass.ts for what it is and
 * why it exists): sign, verify, and read-from-header, with no framework
 * imports, so the unit test can attack it directly — the same split as
 * post-visibility-rule.ts, for the same reason. */

const TTL_MS = 5 * 60 * 1000;
export const HUMAN_PASS_COOKIE = "rv_human";
export { TTL_MS as HUMAN_PASS_TTL_MS };

/* ------------------------------------------------------------------ *
 *  The stamped-cookie scheme, which two gates use.
 *
 *  `${ts}.${hmac(label:ts:subject)}`: a timestamp anyone can read, and a
 *  signature over that timestamp bound to ONE subject, so a token minted
 *  for one browser or one address is worth nothing anywhere else.
 *
 *  The trivia gate wrote its own copy of this, with its own parse, its own
 *  clock-skew rule and its own compare, and said so in a comment -- "the
 *  same clock-skew paranoia human-pass-rule.ts applies". A rule kept true
 *  by a comment is the drift this file's own split exists to end. The two
 *  differ in exactly three things and those are the parameters: the label,
 *  the subject bound, and the TTL.
 * ------------------------------------------------------------------ */

/** Mint a stamp. `subject` is whatever the token must be useless without. */
export function signStamp(label: string, subject: string, ts: number, secret: string): string {
  const sig = crypto
    .createHmac("sha256", secret)
    .update(`${label}:${ts}:${subject}`)
    .digest("hex");
  return `${ts}.${sig}`;
}

/** Constant-time check that `value` is a live stamp for exactly this subject. */
export function stampValid(
  value: string | null | undefined,
  label: string,
  subject: string,
  now: number,
  ttlMs: number,
  secret: string,
): boolean {
  if (!value) return false;
  const dot = value.indexOf(".");
  if (dot <= 0) return false;
  const ts = Number(value.slice(0, dot));
  if (!Number.isFinite(ts)) return false;
  // A stamp this server minted is never ahead of its own clock by more than
  // a minute.
  if (now - ts > ttlMs || ts > now + 60_000) return false;
  /* The WHOLE value against a whole freshly minted one, not just the
     signature segment. The trivia gate used to split on "." and compare the
     middle piece, which accepted `<ts>.<validsig>.anything`; nobody could
     forge that without the secret, so it was untidiness rather than a hole,
     but there is no reason for one gate to be looser than the other.

     Inline rather than the shared timing-safe helper ON PURPOSE: a -rule
     file imports nothing relative, because node runs the .test.mjs against
     this file directly and extensionless relative imports don't resolve
     there (same contract as post-visibility-rule.ts). */
  const expected = Buffer.from(signStamp(label, subject, ts, secret));
  const got = Buffer.from(value);
  return expected.length === got.length && crypto.timingSafeEqual(expected, got);
}

/** `${ts}.${hmac(ts:email)}` — bound to one address, five minutes. */
export function signHumanPass(email: string, ts: number, secret: string): string {
  return signStamp("human-pass", email.toLowerCase(), ts, secret);
}

/** Constant-time check that `value` is a live pass for exactly this email. */
export function humanPassValid(
  value: string | null | undefined,
  email: string,
  now: number,
  secret: string,
): boolean {
  return stampValid(value, "human-pass", email.toLowerCase(), now, TTL_MS, secret);
}

/** authorize() runs from a raw Request, outside next/headers' request
 *  scope, so it reads the cookie straight off the header. Minimal parse:
 *  we are looking for one known name, not building a cookie library. */
export function humanPassFromCookieHeader(header: string | null): string | null {
  if (!header) return null;
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq < 0) continue;
    if (part.slice(0, eq).trim() === HUMAN_PASS_COOKIE) {
      return decodeURIComponent(part.slice(eq + 1).trim());
    }
  }
  return null;
}
