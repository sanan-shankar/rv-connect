import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatTimeAgo(date: Date): string {
  const now = new Date()
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (seconds < 60) return "just now"
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  const weeks = Math.floor(days / 7)
  if (weeks < 4) return `${weeks}w ago`
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

export function parseJsonArray(value: string | null | undefined): string[] {
  if (!value) return []
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 0) return "?"
  if (parts.length === 1) return parts[0][0].toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

// Vivid, evenly-walked palette (see docs/spec/color.md). Each passes AA against
// white initials/glyphs; adjacent people in a list read as clearly different.
const AVATAR_COLORS = [
  "#2E9E54", "#3F7CA6", "#1F9C8E", "#E14B3C", "#C2622F",
  "#C79318", "#8A5BB0", "#5566C4", "#C7508A", "#4F7E5C",
]

export function pickAvatarColor(): string {
  return AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)]
}

export function formatBatch(
  batchType: string | null,
  batchYear: number | null
): string {
  if (batchYear == null) return ""
  return `Batch of '${String(batchYear).slice(-2)}`
}

/* `formatBatchChip` lived here until 2026-08-02. It was the one place in the app
   that rendered the credential form "ISC 2023", and it existed to serve exactly
   one call site, the sidebar account chip. The owner asked for that chip to read
   "Batch of '23" like every other byline in the app, so the call site moved to
   `batchLine()` below and the function went with it rather than staying as a
   dead export offering a second, off-house batch format. */

/* ------------------------------------------------------------------ *
 *  Phone display.
 *
 *  Numbers are stored exactly as typed, which means most arrive with the
 *  country code welded onto the national number ("+919845033712") and read
 *  as one undifferentiated run of digits. The owner wants the code to stand
 *  apart wherever a number is shown (2026-08-04: "plus 91 and then a space
 *  and then the rest of the number ... true with all other phone
 *  extensions"), so this is a DISPLAY-only split. Nothing here touches what
 *  is stored, and `tel:` hrefs keep using the raw value.
 *
 *  Splitting on the country code is exact rather than guesswork because ITU
 *  calling codes are prefix-free and their length follows the zone of the
 *  first digit or two:
 *    1 digit  zone 1 (NANP) and zone 7.
 *    2 digits the listed zone-2-through-9 assignments below.
 *    3 digits everything else.
 *  So no 230-row table is needed, and no dependency.
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

  const codeLength =
    digits[0] === "1" || digits[0] === "7"
      ? 1
      : TWO_DIGIT_CALLING_CODES.has(digits.slice(0, 2))
        ? 2
        : 3
  const rest = digits.slice(codeLength)
  // If what is left is not a plausible national number, this was not a country
  // code after all. Show what was typed rather than a dangling "+91 ".
  if (rest.length < MIN_NATIONAL_DIGITS || rest.length > MAX_NATIONAL_DIGITS) return trimmed
  return `+${digits.slice(0, codeLength)} ${rest}`
}

/** One display-date format for photo/letter attribution ("22 May 2026"). */
export function formatDisplayDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

/**
 * The single line shown under a person's name everywhere. Alumni get
 * "Batch of '09"; teachers get a role label since they have no batch.
 *
 * Note: this reads batchYear only, never batchType, so a mid-school leaver who
 * has no board credential (batchType null) still reads "Batch of '09" as long
 * as batchYear was computed. See computeBatchFromSchooling below.
 *
 * The site's Anonymous profile (id "anonymous", the byline for curated/archive
 * content) gets "" rather than the "Member" fallback: a manufactured word under
 * "Anonymous" says nothing, and the owner's separator rule (2026-07-30) wants
 * such bylines to be just the date, no filler, no dot. Pair every use of this
 * with `metaLine`/`<MetaDots>` so an empty return also drops its separator.
 */
export function batchLine(
  user: {
    id?: string
    accountType?: string | null
    batchType?: string | null
    batchYear?: number | null
  },
  /**
   * Spell the year in full ("Batch of 2023") instead of the elided form
   * ("Batch of '23"). Used by the sidebar's own account chip (owner,
   * 2026-08-02), where the line is about YOU and there is room for it. Bylines
   * in the feed, the directory and comments keep the elided form: they sit in a
   * dot-separated meta row where two extra digits per row is noise.
   */
  opts?: {
    fullYear?: boolean
    /**
     * Return "" instead of the "Member" fallback when there is no batch year.
     * For the compact rail modules, where a manufactured word under a name is
     * filler rather than information; paired with `metaLine` the blank takes
     * its separator with it. Teachers still get their role label, which is the
     * point: the rail used to call `formatBatch` to get this blank and that
     * helper cannot see accountType, so every teacher there read as nothing.
     */
    blankWhenUnknown?: boolean
  }
): string {
  if (user.id === "anonymous") return ""
  if (user.accountType === "teacher") return "Teacher"
  if (user.accountType === "ex_teacher") return "Former teacher"
  if (user.batchYear == null) return opts?.blankWhenUnknown ? "" : "Member"
  if (opts?.fullYear) return `Batch of ${user.batchYear}`
  return `Batch of '${String(user.batchYear).slice(-2)}`
}

/**
 * The one separator rule (owner, 2026-07-30): a middle dot appears only
 * BETWEEN elements, never leading, trailing, or beside an empty segment.
 * Pass every candidate; empty ones vanish and take their dot with them.
 * The repo had converged on this shape independently three times (masthead,
 * image-viewer, alumni-map) before it was extracted here.
 *
 * A segment that repeats one already on the line vanishes the same way (owner,
 * 2026-08-18, on seeing "TEACHER · TEACHER" in the map drilldown). A current
 * teacher's `batchLine` is "Teacher" and their occupation is, reasonably,
 * "Teacher" — two independently correct values that no call site should have
 * to know can collide, and the same trap waits wherever a role label meets a
 * free-typed field. The comparison ignores case and surrounding space so
 * "teacher" typed by hand collapses too; the FIRST spelling is the one kept,
 * because the leading segment is the one the layout was ordered around.
 */
export function metaLine(
  ...parts: Array<string | null | undefined | false>
): string {
  const seen = new Set<string>()
  const kept: string[] = []
  for (const part of parts) {
    if (!part) continue
    const key = part.trim().toLowerCase()
    if (!key || seen.has(key)) continue
    seen.add(key)
    kept.push(part)
  }
  return kept.join(" · ")
}

/**
 * The board credential (ISC/ICSE), derived from the two facts collected
 * directly (the year they left and their batch, i.e. the year their class
 * finished 12th). The grade in their final year is 12 minus the gap between
 * the batch year and the year they left, so a 12th-grade leaver reads ISC, a
 * 10th/11th leaver ICSE, and an earlier leaver has no board credential.
 *
 * Single source of truth for both sign-up (registerUser) and settings
 * (updateUserProfile) so the two can never disagree; neither reads the
 * retired gradeJoined field.
 */
export function batchTypeFromLeaving(
  yearLeft: number,
  batchYear: number
): "ISC" | "ICSE" | null {
  const gradeAtLeaving = 12 - (batchYear - yearLeft)
  if (gradeAtLeaving >= 12) return "ISC"
  if (gradeAtLeaving >= 10) return "ICSE"
  return null
}

export type BatchComputation =
  | {
      ok: true
      /** the grade the person was in during their final academic year */
      gradeAtLeaving: number
      /** the year that grade cohort finishes 12th (their "Batch of") */
      batchYear: number
      /** derived board credential; null for a leaver who never sat a board */
      batchType: "ICSE" | "ISC" | null
    }
  | { ok: false; error: string }

/**
 * Work out which batch someone belongs to from three plain facts: the year they
 * joined, the year they left, and the grade they joined in. This is the single
 * source of truth for placing an alumnus, used by both the live sign-up preview
 * (client) and registration (server), so the two can never disagree.
 *
 * Model: a joining year is the START of an academic year, a leaving year is the
 * END of one, and the grade climbs by one each academic year. So the number of
 * academic years attended is (yearLeft - yearJoined), and the grade in the final
 * year is gradeJoined + (yearLeft - yearJoined) - 1. The batch is the year that
 * final cohort would finish 12th: yearLeft + (12 - gradeAtLeaving).
 *
 * Worked examples:
 *   joined 2014 in grade 4, left 2021 -> grade 10 at leaving -> Batch of 2023
 *   joined 2019 in grade 11, left 2021 -> grade 12 at leaving -> Batch of 2021
 *   a 12th-grade leaver -> gradeAtLeaving 12 -> batchYear == yearLeft
 */
export function computeBatchFromSchooling(
  yearJoined: number,
  yearLeft: number,
  gradeJoined: number
): BatchComputation {
  const thisYear = new Date().getFullYear()

  if (
    !Number.isInteger(yearJoined) ||
    !Number.isInteger(yearLeft) ||
    !Number.isInteger(gradeJoined)
  ) {
    return { ok: false, error: "Please enter whole numbers for the years and grade." }
  }
  if (gradeJoined < 1 || gradeJoined > 12) {
    return { ok: false, error: "The grade you joined in should be between 1 and 12." }
  }
  if (yearJoined < 1926 || yearJoined > thisYear) {
    return { ok: false, error: `The year you joined should be between 1926 and ${thisYear}.` }
  }
  if (yearLeft < 1926 || yearLeft > thisYear + 1) {
    return { ok: false, error: `The year you left should be between 1926 and ${thisYear + 1}.` }
  }
  if (yearLeft < yearJoined) {
    return { ok: false, error: "The year you left cannot be before the year you joined." }
  }

  const gradeAtLeaving = gradeJoined + (yearLeft - yearJoined) - 1

  if (gradeAtLeaving < gradeJoined) {
    return {
      ok: false,
      error: "That is too short a stay to place you. Check the years you entered.",
    }
  }
  if (gradeAtLeaving > 12) {
    return {
      ok: false,
      error: "Those years add up to past 12th grade. Check your joining grade and years.",
    }
  }

  const batchYear = yearLeft + (12 - gradeAtLeaving)
  const batchType: "ICSE" | "ISC" | null =
    gradeAtLeaving >= 12 ? "ISC" : gradeAtLeaving >= 10 ? "ICSE" : null

  return { ok: true, gradeAtLeaving, batchYear, batchType }
}

/**
 * The display title for a letter. Untitled letters fall back to their first
 * non-empty line (markdown stripped, truncated) rather than a literal
 * "Untitled letter" placeholder. Shared by the letters index, the letter
 * reading page, and the feed letter-card so all three read identically.
 */
export function letterTitle(
  title: string | null | undefined,
  content: string,
  maxLen = 90
): string {
  if (title && title.trim()) return title.trim()
  const firstLine = content
    .replace(/[*_#>`~]|\[([^\]]*)\]\([^)]*\)/g, "$1")
    .split(/\n/)
    .map((l) => l.trim())
    .find(Boolean)
  if (!firstLine) return "A letter"
  return firstLine.length > maxLen ? firstLine.slice(0, maxLen).trimEnd() + "..." : firstLine
}

/**
 * Paise to a rupee figure people read.
 *
 * Razorpay counts in paise and `Contribution.amount` stores what Razorpay
 * says, so every display of a contribution is a division. Doing it inline
 * meant the admin Overview and the admin ledger each carried their own copy
 * of the same expression, and they had already drifted on the currency mark.
 * Indian grouping (lakh, crore) comes from the locale, not from us.
 */
export function formatPaise(paise: number): string {
  return `\u20B9${Math.round(paise / 100).toLocaleString("en-IN")}`
}

/**
 * Plain-text excerpt of a post/letter body: markdown syntax stripped,
 * whitespace collapsed, truncated to `maxLen` characters. Used by the feed
 * rail's Letters module for its compact teaser.
 */
export function plainExcerpt(content: string, maxLen = 160): string {
  const plain = content
    // Images go entirely, alt text included. They used to fall through to the
    // link rule below and leave a stray "!" in front of the alt ("!banyan"),
    // which read as a typo wherever a teaser quoted a post that opened with a
    // photo. Must run BEFORE the link rule, since an image is a link with a
    // bang on the front.
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/[*_#>`~]|\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim()
  if (plain.length <= maxLen) return plain
  return plain.slice(0, maxLen).trimEnd() + "..."
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
export function renderRichText(text: string): string {
  // 1. Escape HTML entities
  let result = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")

  // 2. Emphasis: ***both***, **bold**, *italic*, __underline__, ~~struck~~.
  for (const { pattern, open, close } of EMPHASIS_RULES) {
    result = result.replace(pattern, (match, before: string, inner: string) => {
      // A run that crosses a blank line is never emphasis: it is two stray
      // delimiters in separate paragraphs finding each other.
      if (/\n\s*\n/.test(inner)) return match
      return `${before}${open}${inner}${close}`
    })
  }

  // 3. Mentions: @[Name](userId) -> clickable link
  result = result.replace(
    /@\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="/profile/$2" class="font-semibold text-leaf hover:underline">@$1</a>'
  )

  return result
}
