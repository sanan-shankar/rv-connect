import crypto from "crypto";

/**
 * Constant-time string equality, shared by dev-login's secret, the trivia
 * pass and the QA bypass — Phase 4's review found each hand-typing its own
 * copy of this seven-line primitive. The one deliberate holdout is
 * human-pass-rule.ts, which inlines it because -rule files import nothing
 * relative (node runs their tests directly; see the note there). The
 * length check is not a timing leak worth chasing: length is not the
 * secret.
 */
export function timingSafeEqualStrings(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);
}
