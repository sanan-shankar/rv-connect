/**
 * Small, dependency-free string utilities for cleaning up user-entered text
 * (names, cities, organizations, phone numbers) before it is stored or
 * displayed. Shared across onboarding, settings, and the directory/places
 * pickers so every call site normalizes the same way.
 */

// Connector words that stay lowercase when they appear mid-phrase (not first
// or last word). Lowercased keys; matched case-insensitively.
const LOWERCASE_CONNECTORS = new Set([
  "of",
  "the",
  "and",
  "van",
  "de",
  "der",
  "den",
  "da",
  "di",
  "du",
  "la",
  "le",
  "el",
  "al",
  "bin",
  "ibn",
  "von",
  "vom",
]);

/**
 * Capitalize a single word, preserving any interior capitals someone typed
 * on purpose (McKinsey, IIT, iPhone). Handles internal punctuation
 * (hyphens, apostrophes) by capitalizing each segment: "o'brien" -> "O'Brien",
 * "jean-luc" -> "Jean-Luc".
 */
function capitalizeWord(word: string): string {
  if (!word) return word;
  // Split on (and keep) hyphens and apostrophes so each segment is capitalized
  // independently, e.g. "jean-luc" -> ["jean", "-", "luc"].
  return word
    .split(/([-'])/)
    .map((segment) => {
      if (segment === "-" || segment === "'") return segment;
      if (!segment) return segment;
      // If the word already has any uppercase letter beyond the first
      // position, treat it as deliberate mixed case and leave it alone
      // (e.g. "McKinsey", "IIT") aside from fixing a lowercase first letter.
      const hasInteriorCaps = /[A-Z]/.test(segment.slice(1));
      if (hasInteriorCaps) {
        return segment.charAt(0).toUpperCase() + segment.slice(1);
      }
      return segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase();
    })
    .join("");
}

/**
 * Smart title-case for user-entered names, cities, and organizations.
 *
 * - Trims and collapses internal whitespace to single spaces.
 * - If the input is ALL-CAPS or all-lowercase, retitles every word fully.
 * - If the input is already mixed-case (someone deliberately typed interior
 *   capitals), only the first letter of each already-lowercase word is
 *   fixed; existing capitalization elsewhere is preserved verbatim.
 * - Small connector words (of, the, and, van, de, ...) stay lowercase when
 *   they are not the first or last word.
 * - Hyphens and apostrophes are treated as word-internal separators, so each
 *   segment gets its own capital: "o'brien" -> "O'Brien",
 *   "jean-luc" -> "Jean-Luc".
 *
 * Examples:
 *   titleCase("mary o'brien")        -> "Mary O'Brien"
 *   titleCase("JEAN-LUC PICARD")     -> "Jean-Luc Picard"
 *   titleCase("university of delhi")-> "University of Delhi"
 *   titleCase("McKinsey & Company")  -> "McKinsey & Company"   (mixed case preserved)
 *   titleCase("iit bombay")         -> "Iit Bombay"            (all-lowercase, no way to know IIT is an acronym)
 *   titleCase("naga Reddy")          -> "Naga Reddy"           (mixed case: only lowercase words get fixed)
 */
export function titleCase(input: string): string {
  const trimmed = input.trim().replace(/\s+/g, " ");
  if (!trimmed) return trimmed;

  const isAllUpper = trimmed === trimmed.toUpperCase() && trimmed !== trimmed.toLowerCase();
  const isAllLower = trimmed === trimmed.toLowerCase();
  const fullyRetitle = isAllUpper || isAllLower;

  const words = trimmed.split(" ");
  return words
    .map((word, i) => {
      const isFirstOrLast = i === 0 || i === words.length - 1;
      const lower = word.toLowerCase();

      if (!fullyRetitle) {
        // Mixed case already: leave deliberately-capitalized words alone,
        // only fix a word that starts lowercase.
        if (/^[a-z]/.test(word)) {
          if (!isFirstOrLast && LOWERCASE_CONNECTORS.has(lower)) return lower;
          return capitalizeWord(word);
        }
        return word;
      }

      // Fully retitling (was ALL-CAPS or all-lowercase).
      if (!isFirstOrLast && LOWERCASE_CONNECTORS.has(lower)) return lower;
      return capitalizeWord(lower);
    })
    .join(" ");
}

/**
 * Return the primary place name from a disambiguated picker label.
 *
 * The gazetteer stores labels such as "London, England, United Kingdom" so
 * people can choose the right result, but compact directory surfaces only
 * need the first, recognisable part: "London".
 */
export function shortPlaceLabel(input: string): string {
  return input.split(",", 1)[0].trim();
}

/**
 * Normalize a phone number to digits with an optional leading "+". No
 * validation of length or country code beyond that; callers that need real
 * validation should layer it on top.
 *
 * Examples:
 *   normalizePhone("+91 98765-43210") -> "+919876543210"
 *   normalizePhone("(080) 4123 5678") -> "08041235678"
 *   normalizePhone("++1-800-CALL")    -> "+1800"
 */
export function normalizePhone(input: string): string {
  const trimmed = input.trim();
  const hasLeadingPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/\D/g, "");
  return hasLeadingPlus ? `+${digits}` : digits;
}
