/* ------------------------------------------------------------------ *
 *  The composer's wire format, rendered.
 *
 *  Its own module rather than the tail of `utils.ts`, for two reasons the
 *  refactor audit gave (shell-primitives-09). The first is weight: utils.ts
 *  is what every client chunk imports for `cn`, and nothing in it is
 *  tree-shaken, so the five regular expressions built below were being
 *  constructed on /privacy and /login, which render no rich text at all.
 *  The second is that this is the security-sensitive one -- it is the only
 *  defence between a member's typing and `dangerouslySetInnerHTML`, and its
 *  two siblings, `rich-text-editing.ts` and `rich-truncate.ts`, already live
 *  as their own modules and were reaching back into utils for it.
 * ------------------------------------------------------------------ */

/**
 * Build the matcher for one inline emphasis delimiter.
 *
 * The rules are deliberately conservative, the way WhatsApp's are, because
 * people write asterisks and underscores by accident far more often than they
 * mean them as formatting. A delimiter pair only counts when ALL of this holds:
 *
 *   1. the opener sits on a word boundary (start of text, or a non-word
 *      character before it), so "2*3*4" and "a**b**c" stay literal;
 *   2. the wrapped run starts AND ends with a non-space character, so
 *      "a * b * c" and a "* milk / * eggs" bullet list stay literal;
 *   3. the run is non-empty and never spans a blank line (checked by the
 *      caller), so two stray asterisks paragraphs apart cannot pair up;
 *   4. the closer is not glued to a word character, so "__init__x" stays literal.
 *
 * An unmatched delimiter simply never matches, so "hello *world" stays literal.
 * No lookbehind is used (older Safari cannot parse it); the boundary character
 * is captured and re-emitted instead.
 */
function emphasisPattern(delimiter: string): RegExp {
  // Only "*" is a regex syntax character here; escaping "_" or "~" under the
  // /u flag is a SyntaxError, so they are used raw.
  const char = delimiter[0]
  const c = char === "*" ? "\\*" : char
  const d = delimiter.split("").map(() => c).join("")
  // A run of the same delimiter character never counts as a boundary or as an
  // edge of the wrapped text: that is what keeps "2**3**4" and "***" literal
  // instead of leaking into the single-character rule and crossing its tags.
  const boundary = `(^|[^\\p{L}\\p{N}_${c}])`
  const edge = `[^\\s${c}]`
  return new RegExp(
    boundary +
      d +
      // the wrapped run: one edge character, or edge ... edge (lazy, capped so
      // a stray pair can never span half a letter)
      `(${edge}|${edge}[\\s\\S]{0,2000}?${edge})` +
      d +
      // the closer may not be glued to a word character or its own delimiter
      `(?![\\p{L}\\p{N}_${c}])`,
    "gu"
  )
}

/** Longest delimiter runs first, so *** beats ** beats * and pairs never split. */
const EMPHASIS_RULES: { pattern: RegExp; open: string; close: string }[] = [
  { pattern: emphasisPattern("***"), open: "<strong><em>", close: "</em></strong>" },
  { pattern: emphasisPattern("**"), open: "<strong>", close: "</strong>" },
  { pattern: emphasisPattern("*"), open: "<em>", close: "</em>" },
  { pattern: emphasisPattern("__"), open: "<u>", close: "</u>" },
  { pattern: emphasisPattern("~~"), open: "<del>", close: "</del>" },
]

/**
 * Render rich text: sanitize HTML, then apply markdown-style bold/italic/
 * underline/strikethrough and @[Name](userId) mentions.
 *
 * This is the single renderer for the composer's wire format: the composer
 * serializes live formatting (native Cmd/Ctrl+B, the phone's own selection
 * bar) to exactly these markers, and hand-typed markdown lands here too.
 */
export function renderRichText(text: string): string {
  // 1. Escape HTML entities. The single quote is escaped too, not just the
  // double: the mention href below is double-quoted today, but that is the
  // renderer's ONLY defence against attribute injection, and with CSP carrying
  // 'unsafe-inline' there is no second layer -- so leaving `'` raw means a
  // later change to single-quoted attributes would be instant stored XSS.
  let result = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")

  // 2. Emphasis: ***both***, **bold**, *italic*, __underline__, ~~struck~~.
  for (const { pattern, open, close } of EMPHASIS_RULES) {
    result = result.replace(pattern, (match, before: string, inner: string) => {
      // A run that crosses a blank line is never emphasis: it is two stray
      // delimiters in separate paragraphs finding each other.
      if (/\n\s*\n/.test(inner)) return match
      return `${before}${open}${inner}${close}`
    })
  }

  // 3. Mentions: @[Name](userId) -> clickable link. The id capture is a strict
  // charset, NOT `[^)]+`: it runs after emphasis (step 2), so `[^)]+` would let
  // `@[N](*x*)` pull the `<em>` tag step 2 just produced straight into the href
  // value. Constraining the id to characters a real profile id actually uses
  // means anything else -- a stray tag, a quote, a space, a slash -- fails to
  // match and is left as the escaped literal text it already is, rather than
  // becoming a malformed link.
  result = result.replace(
    /@\[([^\]]+)\]\(([A-Za-z0-9_-]+)\)/g,
    '<a href="/profile/$2" class="font-semibold text-leaf hover:underline">@$1</a>'
  )

  return result
}
