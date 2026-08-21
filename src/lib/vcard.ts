/* ------------------------------------------------------------------ *
 *  vCard, spelled the way the spec spells it.
 *
 *  The profile's "save this contact" download was assembled by joining
 *  lines with "\n" and dropping values in raw (audit Low 97). Two things
 *  are wrong with that, and one of them fires every single time:
 *
 *   - COMMAS AND SEMICOLONS ARE STRUCTURE in a vCard value, not text. The
 *     NOTE line is built as "Batch of 2011, Rishi Valley community; Houses:
 *     Aravalli 2014-15, Nilgiri 2015-16" -- which a parser reads as several
 *     fields, not one sentence. A name with a comma in it ("Rao, Anand")
 *     breaks FN the same way, and a city can carry either.
 *   - RFC 2426 and RFC 6350 both specify CRLF line endings. Most readers
 *     forgive LF; Outlook historically does not.
 *
 *  Pure, no imports, so `node --test` can load it.
 * ------------------------------------------------------------------ */

/**
 * Escape one TEXT value.
 *
 * Backslash first, or the escapes this adds would themselves be escaped. A
 * literal newline inside a value is written as the two characters `\n`, which
 * is how the spec represents one (an actual line break would end the property).
 */
export function vcardValue(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/\r\n|\r|\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

/**
 * Join the property lines into a card.
 *
 * CRLF, and a trailing one: the spec's grammar ends every content line,
 * including the last. Null and empty entries are dropped so callers can build
 * the list with conditionals inline.
 *
 * Deliberately does NOT fold long lines at 75 octets. Folding has to count
 * bytes rather than characters to be correct with names and place names
 * outside ASCII, every reader in use accepts unfolded lines, and a subtly
 * wrong fold is worse than none.
 */
export function vcardLines(lines: (string | null | undefined | false)[]): string {
  return lines.filter((l): l is string => Boolean(l)).join("\r\n") + "\r\n";
}
