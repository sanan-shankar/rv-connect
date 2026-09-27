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
 *  sibling `rich-text-editing.ts` already lives as its own module and was
 *  reaching back into utils for it. (A second sibling, `rich-truncate.ts`,
 *  went with the character-based "Read more" on 2026-09-12.)
 * ------------------------------------------------------------------ */

/**
 * The composer's wire-format mention: `@[Name](userId)`. The id capture is a
 * strict charset, NOT `[^)]+` -- see the note at its one call site in
 * `renderRichText` for why. Module-level and exported so `mentionedUserIds`
 * below reads the exact same pattern renderRichText links: two regular
 * expressions for one wire format is how they quietly stop agreeing the day
 * either one is tightened.
 */
export const MENTION_PATTERN = /@\[([^\]]+)\]\(([A-Za-z0-9_-]+)\)/g

/**
 * The distinct member ids a body @-mentions, in first-appearance order.
 *
 * Runs on the RAW stored text, not renderRichText's escaped/emphasis-applied
 * output: escaping only touches `& < > " '`, none of which a real profile id
 * ever contains, and emphasis markers land outside the id group too -- so the
 * ids this finds are exactly the ids that would render as links, without
 * paying for a render just to read them back off. `matchAll` clones the
 * regex internally, so this cannot leave `MENTION_PATTERN.lastIndex` dirty
 * for `renderRichText`'s own `.replace()` call, or vice versa.
 */
export function mentionedUserIds(text: string): string[] {
  const ids: string[] = []
  const seen = new Set<string>()
  for (const match of text.matchAll(MENTION_PATTERN)) {
    const id = match[2]
    if (seen.has(id)) continue
    seen.add(id)
    ids.push(id)
  }
  return ids
}

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
export function renderRichText(
  text: string,
  options: {
    /** Print pasted links as real links. OPT-IN, and only a Catch-up answer
     *  opts in (build phase 10): a link that did not become a preview card
     *  "prints as an ordinary link" (spec 3.8), and the feed is not widened
     *  unasked. Handed the finder rather than importing it, so this module
     *  keeps no relative value import (docs/TRAPS.md, "Testing") and the text
     *  it links is exactly the text `link-preview-core.ts` strips. */
    linkRanges?: (text: string) => Array<[number, number]>
  } = {}
): string {
  // 0. Links are lifted out BEFORE anything else touches the text, and put
  // back last as whole anchors. Escaping first would turn a quote after a url
  // into `&#39;`, which is all url characters and would be swallowed into it;
  // emphasis first would drop a `<u>` into the middle of a `/__init__/` path.
  // A NUL cannot be typed into a textarea, and any that arrive are removed, so
  // the placeholder can never be forged by a member.
  const links: string[] = []
  let source = text
  if (options.linkRanges) {
    source = source.replace(/\u0000/g, "")
    let out = ""
    let at = 0
    for (const [start, end] of options.linkRanges(source)) {
      if (start < at) continue
      out += source.slice(at, start) + `\u0000${links.length}\u0000`
      links.push(source.slice(start, end))
      at = end
    }
    source = out + source.slice(at)
  }

  // 1. Escape HTML entities. The single quote is escaped too, not just the
  // double: the mention href below is double-quoted today, but that is the
  // renderer's ONLY defence against attribute injection, and with CSP carrying
  // 'unsafe-inline' there is no second layer -- so leaving `'` raw means a
  // later change to single-quoted attributes would be instant stored XSS.
  let result = escapeHtml(source)

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
    MENTION_PATTERN,
    '<a href="/profile/$2" class="font-semibold text-leaf hover:underline">@$1</a>'
  )

  // 4. Links back in, as whole anchors. The url is escaped on its own, which is
  // what an attribute wants (`&` becomes `&amp;`) and means a quote can never
  // close the href. It must start http(s):// or it is printed as the escaped
  // text it is: the finder is handed in, so this line does not trust it to
  // have matched only web links, and `javascript:` never becomes an href.
  if (links.length) {
    result = result.replace(/\u0000(\d+)\u0000/g, (_match, i: string) => {
      const raw = links[Number(i)] ?? ""
      const safe = escapeHtml(raw)
      if (!/^https?:\/\//i.test(raw)) return safe
      return `<a href="${safe}" target="_blank" rel="noopener noreferrer nofollow" class="${LINK_CLASS}">${safe}</a>`
    })
  }

  return result
}

/** A pasted link left in an answer's text. Underlined, because in a paragraph
 *  colour alone does not say "press me"; leaf, the same green as a mention;
 *  and the three states every clickable thing carries. */
const LINK_CLASS =
  "rounded-sm text-leaf underline decoration-leaf/40 underline-offset-2 transition-colors duration-150 hover:decoration-leaf active:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}
