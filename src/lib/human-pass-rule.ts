import crypto from "crypto";

/* The pure half of the human pass (see human-pass.ts for what it is and
 * why it exists): sign, verify, and read-from-header, with no framework
 * imports, so the unit test can attack it directly — the same split as
 * post-visibility-rule.ts, for the same reason. */

const TTL_MS = 5 * 60 * 1000;
export const HUMAN_PASS_COOKIE = "rv_human";
export { TTL_MS as HUMAN_PASS_TTL_MS };

/** `${ts}.${hmac(ts:email)}` — bound to one address, five minutes. */
export function signHumanPass(email: string, ts: number, secret: string): string {
  const sig = crypto
    .createHmac("sha256", secret)
    .update(`human-pass:${ts}:${email.toLowerCase()}`)
    .digest("hex");
  return `${ts}.${sig}`;
}

/** Constant-time check that `value` is a live pass for exactly this email. */
export function humanPassValid(
  value: string | null | undefined,
  email: string,
  now: number,
  secret: string,
): boolean {
  if (!value) return false;
  const dot = value.indexOf(".");
  if (dot <= 0) return false;
  const ts = Number(value.slice(0, dot));
  if (!Number.isFinite(ts)) return false;
  if (now - ts > TTL_MS || ts > now + 60_000) return false;
  const expected = Buffer.from(signHumanPass(email, ts, secret));
  const got = Buffer.from(value);
  return expected.length === got.length && crypto.timingSafeEqual(expected, got);
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
