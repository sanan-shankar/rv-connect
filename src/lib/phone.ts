/* ------------------------------------------------------------------ *
 *  Phone numbers, as they are shown and as they are typed.
 *
 *  Its own module rather than another 150 lines of `utils.ts`, for the
 *  reason the refactor audit gave (shell-primitives-09): utils.ts is what
 *  every client chunk in the app imports for `cn`, and nothing in it is
 *  tree-shaken -- the 30-entry calling-code Set below was being downloaded
 *  and constructed by /privacy and /login, which have no phone number
 *  anywhere on them. Four files need this; those four import it.
 * ------------------------------------------------------------------ */

const TWO_DIGIT_CALLING_CODES = new Set([
  "20", "27",
  "30", "31", "32", "33", "34", "36", "39",
  "40", "41", "43", "44", "45", "46", "47", "48", "49",
  "51", "52", "53", "54", "55", "56", "57", "58",
  "60", "61", "62", "63", "64", "65", "66",
  "81", "82", "84", "86",
  "90", "91", "92", "93", "94", "95", "98",
])

/** National-number lengths worth believing. Below the floor the leading digits
 *  are the number, not a country code; above the ceiling nothing sane is left. */
const MIN_NATIONAL_DIGITS = 6
const MAX_NATIONAL_DIGITS = 11

/** The longest a bare number can be and still be purely national (India and the
 *  NANP are both 10, which is the common case here). At or under this, there is
 *  no country code in front and nothing to split. */
const MAX_BARE_NATIONAL_DIGITS = 10

/**
 * The ITU arithmetic both phone functions have to agree on: how many leading
 * digits are the country code, and whether what remains is a plausible
 * national number.
 *
 * Null when it is not: too short or too long a remainder means those leading
 * digits were never a country code, and each caller has its own answer for
 * that case -- display shows what was typed, the editor falls back to the
 * default code.
 *
 * The two callers stay separate deliberately (see splitPhoneParts' banner);
 * only this computation is shared, precisely so they cannot come to different
 * conclusions about the same number.
 */
function splitCountryCode(digits: string): { code: string; rest: string } | null {
  const codeLength =
    digits[0] === "1" || digits[0] === "7"
      ? 1
      : TWO_DIGIT_CALLING_CODES.has(digits.slice(0, 2))
        ? 2
        : 3
  const rest = digits.slice(codeLength)
  if (rest.length < MIN_NATIONAL_DIGITS || rest.length > MAX_NATIONAL_DIGITS) return null
  return { code: digits.slice(0, codeLength), rest }
}

/**
 * "+919845033712" and "917598975768" both become "+91 9845033712"-style: the
 * country code separated by a space, with the "+" restored if it was missing.
 *
 * The "+" cannot be required. Numbers here are stored exactly as typed and a
 * real share of them carry the code with no plus in front ("917598975768",
 * "14084019893"), which is precisely the run-together display the owner
 * flagged (2026-08-04). So a bare digit run is split too, but ONLY when it is
 * longer than a national number can be on its own: at 10 digits or fewer it is
 * somebody's plain mobile, and prefixing a country code onto it would be
 * inventing a fact (a bare Indian "9845033712" is not Iran's +98).
 *
 * A value that already contains a space is returned untouched. Whatever the
 * author typed there has the code visually separated already, which is the
 * whole point, and re-spacing it would fight them.
 */
export function formatPhoneDisplay(raw: string): string {
  const trimmed = raw.trim()
  // Already separated by the author: leave it exactly as written.
  if (/\s/.test(trimmed)) return trimmed

  const hadPlus = trimmed.startsWith("+")
  const digits = hadPlus ? trimmed.slice(1) : trimmed
  if (!/^\d+$/.test(digits)) return trimmed
  // With no "+" to declare one, a short run is the national number itself.
  if (!hadPlus && digits.length <= MAX_BARE_NATIONAL_DIGITS) return trimmed

  // If what is left is not a plausible national number, this was not a country
  // code after all. Show what was typed rather than a dangling "+91 ".
  const split = splitCountryCode(digits)
  if (!split) return trimmed
  return `+${split.code} ${split.rest}`
}

/** The one default this file assumes: most of this school's alumni carry it
 *  already (it is the placeholder every phone field on the site has shown
 *  since before this existed), and it is a default a field can still
 *  override, not a lock on who can enter a number. */
const DEFAULT_PHONE_CODE = "+91"

/**
 * Splits a phone value into its country-code and local-number parts, for an
 * editor that wants them as two separate fields rather than one string a
 * single clearing keystroke can wipe both halves of (owner, 2026-08-22:
 * "even now if profile when I delete my phone number I have to enter both
 * in the same box"). Kept independent of formatPhoneDisplay above rather
 * than sharing its body, so this never risks that function's existing,
 * already-relied-on output for a case this split did not anticipate. The one
 * thing they DO share is splitCountryCode, because the ITU arithmetic is a
 * pure computation both must reach the same answer on: if it ever drifted,
 * the display and the editor would split the same number two ways.
 *
 * A value with no recognisable code (too short, not a plausible national
 * number once split, or not digits at all -- a pasted landline with an
 * extension, say) is not guessed at: the whole thing goes in `rest` and
 * `code` falls back to the default, so the field shows what was actually
 * typed rather than a wrong split dressed up as a right one.
 */
export function splitPhoneParts(raw: string): { code: string; rest: string } {
  const trimmed = raw.trim()
  if (!trimmed) return { code: DEFAULT_PHONE_CODE, rest: "" }

  // Already separated, by us or by whoever typed it: trust the first space,
  // the same trust formatPhoneDisplay places in it.
  if (/\s/.test(trimmed)) {
    const i = trimmed.indexOf(" ")
    const head = trimmed.slice(0, i)
    const tail = trimmed.slice(i + 1).trim()
    if (/^\+?\d+$/.test(head)) {
      return { code: head.startsWith("+") ? head : `+${head}`, rest: tail }
    }
    return { code: DEFAULT_PHONE_CODE, rest: trimmed }
  }

  const hadPlus = trimmed.startsWith("+")
  const digits = hadPlus ? trimmed.slice(1) : trimmed
  if (!/^\d+$/.test(digits)) return { code: DEFAULT_PHONE_CODE, rest: trimmed }
  if (!hadPlus && digits.length <= MAX_BARE_NATIONAL_DIGITS) {
    return { code: DEFAULT_PHONE_CODE, rest: digits }
  }

  const split = splitCountryCode(digits)
  if (!split) return { code: DEFAULT_PHONE_CODE, rest: digits }
  return { code: `+${split.code}`, rest: split.rest }
}

/** The inverse of splitPhoneParts, for what the editor saves: the same
 *  one-space convention formatPhoneDisplay reads on the way back in, so a
 *  value this writes round-trips through it unchanged. An empty number
 *  saves as an empty row regardless of the code -- a country code with no
 *  digits after it is not a phone number, whatever field it is sitting in. */
export function joinPhoneParts(code: string, rest: string): string {
  const r = rest.trim()
  if (!r) return ""
  const c = code.trim()
  return c ? `${c} ${r}` : r
}
