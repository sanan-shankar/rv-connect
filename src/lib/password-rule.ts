/**
 * The password floor (audit M8: "password policy is length-only").
 *
 * Deliberately NOT a strength meter or a composition rule ("one uppercase,
 * one symbol") — those push people toward Password1! and teach nothing.
 * NIST's guidance is the model: length plus a denylist of what attackers
 * actually try first. Three checks, each refusing a password that would fall
 * to the first minutes of an online guessing run (which Phase 4's limiter
 * slows but should never be the only thing standing):
 *
 *  1. the classic worst passwords at 8+ characters (the min length already
 *     excludes the shorter ones), lowercased before comparing so Password123
 *     and PASSWORD123 are the same password;
 *  2. the guesses specific to THIS site — the school's own name is the
 *     "companyname123" of this community;
 *  3. the caller's own email address (the local part), which is the first
 *     personalised guess anyone makes.
 *
 * Pure — no imports — so node runs its tests directly (password-rule.test.mjs).
 */

const COMMON = new Set([
  // The perennial top of every breach corpus, 8+ chars.
  "password", "password1", "password123", "passw0rd", "p@ssw0rd", "p@ssword",
  "12345678", "123456789", "1234567890", "87654321", "11111111", "00000000",
  "qwertyui", "qwerty123", "qwertyuiop", "asdfghjkl", "1q2w3e4r", "1qaz2wsx",
  "iloveyou", "sunshine", "princess", "welcome1", "football", "baseball",
  "superman", "trustno1", "dragon123", "monkey123", "letmein1", "whatever",
  "computer", "internet", "abcd1234", "abc12345", "aaaaaaaa", "88888888",
  // India-common corpus entries.
  "india123", "indya123", "krishna1", "ganesh123", "sairam123",
  // This site's own "companyname123" family.
  "rishivalley", "rishivalley1", "rishivalley123", "rishi123", "valley123",
  "rishivalleyschool", "krishnamurti", "rvschool1", "madanapalle",
]);

/**
 * Null when the password is acceptable; otherwise the sentence to show.
 * Length is checked by the schema before this runs, but re-checked here so
 * the rule stands alone.
 */
export function passwordProblem(password: string, email?: string): string | null {
  if (password.length < 8) return "Password must be at least 8 characters.";

  const flat = password.toLowerCase();
  if (COMMON.has(flat)) {
    return "That password is on every guessing list. Pick something more your own.";
  }

  const local = (email ?? "").split("@")[0]?.toLowerCase() ?? "";
  if (local.length >= 4 && flat.includes(local)) {
    return "Your password can't contain your email address.";
  }

  return null;
}
