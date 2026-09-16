import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/* ------------------------------------------------------------------ *
 *  The valley's day is an IST day.
 *
 *  Every member of this site shares one frame: the school's. A letter
 *  written at 00:30 on 15 June was written on the 15th, and it should say
 *  so to everyone -- to the writer in Bangalore, to a reader in London,
 *  and to the Vercel server in Washington that renders the page. Without
 *  a timeZone, toLocaleDateString uses the runtime's zone: UTC on the
 *  server (so anything between 00:00 and 05:30 IST rendered a day early
 *  for everybody, permanently) and the viewer's own on the client (so the
 *  same post carried two different dates depending on who asked). Pinning
 *  IST everywhere is what makes those agree -- and it is the rule
 *  wordle.ts already states in the same words.
 *
 *  Audit B-100 and the fifteen-odd date surfaces clustered under it.
 * ------------------------------------------------------------------ */
export const VALLEY_TIME_ZONE = "Asia/Kolkata"

/** Today's calendar year in the valley. Never cache this: see valleyYear's note. */
export function valleyYear(now: Date = new Date()): number {
  // Read the year out of a formatted IST date rather than doing arithmetic on
  // the UTC offset: one call, no drift, and it stays right if the offset ever
  // changes. "en-CA" gives YYYY-MM-DD, so the year is the first four chars.
  const said = Number(
    now.toLocaleDateString("en-CA", { timeZone: VALLEY_TIME_ZONE }).slice(0, 4)
  )

  /* THE FALLBACK IS NOT DEFENSIVE PADDING. This runs in the BROWSER as well as
     on the server, and it is the ceiling `yearGiven` compares a contributor's
     typed year against. A runtime whose Intl data does not honour "en-CA"
     formats the date some other way -- "30/08/2026", "8/30/2026" -- and then
     the first four characters are not a year and this returns NaN. Every
     comparison against NaN is false, so `yearGiven` rejects EVERY year, and
     `photoDate` files the photograph as undated while the digits sit there on
     screen looking accepted. That is silent data loss on a heritage archive,
     from a locale table.
     `getFullYear()` is the local calendar year: off by a few hours from the
     valley's around New Year, which costs nothing here -- it is a ceiling on
     "not in the future", not a date anything is filed under. */
  return Number.isInteger(said) ? said : now.getFullYear()
}

/** Today's date in the valley as YYYY-MM-DD. */
export function valleyDayKey(now: Date = new Date()): string {
  return now.toLocaleDateString("en-CA", { timeZone: VALLEY_TIME_ZONE })
}

/**
 * The instant a given valley calendar day began, as a real UTC Date.
 *
 * The literal "+05:30" is safe to hard-code here in a way a timezone name
 * usually is not: India has kept one fixed offset with no daylight saving since
 * 1945, and IST is the only zone this function is ever asked about. The
 * alternative (round-tripping through toLocaleString to discover the offset) is
 * slower and more fragile for a constant that has not moved in eighty years.
 */
export function valleyMidnight(dayKey: string): Date {
  return new Date(`${dayKey}T00:00:00+05:30`)
}

/** The instant today began in the valley. */
export function valleyDayStart(now: Date = new Date()): Date {
  return valleyMidnight(valleyDayKey(now))
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
  /* The year is printed only when it is not this one. On a thread of eighteen
     comments the repeated "2026" carried no information at all -- every row
     said it, so no row said anything by saying it -- while the archive really
     does run back decades, so the year cannot simply be dropped. Printed when
     it differs, silent when it does not, which is how a person would write
     the date out loud. */
  const yearOf = new Intl.DateTimeFormat("en-IN", {
    timeZone: VALLEY_TIME_ZONE,
    year: "numeric",
  })
  const otherYear = yearOf.format(date) !== yearOf.format(now)
  /* The options object is spelled out AT the call rather than built above it,
     because valley-day.test.mjs greps this file for a toLocaleDateString whose
     arguments do not literally mention a time zone. Hoisting it into a
     variable is invisible to that guard, which is the whole point of the
     guard: B-100 was fifteen date surfaces silently rendering in the server's
     zone. Keep the literal here. */
  return date.toLocaleDateString("en-IN", {
    timeZone: VALLEY_TIME_ZONE,
    day: "numeric",
    month: "short",
    ...(otherYear ? { year: "numeric" as const } : {}),
  })
}

/**
 * Parse a JSON array column (images, phones, ...) that is trusted to be an
 * array of strings but not trusted to actually BE one: it is free-form JSON
 * text in a Postgres column, not a schema Postgres enforces. `Array.isArray`
 * alone let one non-string element (a stray number, object or null some old
 * write path left behind) through, and every caller here calls `.trim()` or
 * hands the value straight to a component expecting `string[]`, so a single
 * bad element crashed the whole page it appeared on (audit Low 92) rather
 * than just being invisible or dropped where it stood.
 */
export function parseJsonArray(value: string | null | undefined): string[] {
  if (!value) return []
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : []
  } catch {
    return []
  }
}

/**
 * Split `text` into user-perceived characters ("grapheme clusters") rather
 * than UTF-16 code units. Exported so a caller that needs the full list (not
 * just a count or a first item) is never tempted to fall back to `[...text]`,
 * which walks by codepoint and still splits a ZWJ sequence (a family emoji,
 * a flag) into its parts.
 */
/* Built once, not per call.
 *
 * Constructing an Intl object is the expensive part of using one: it resolves
 * a locale and loads ICU data. `getInitials` runs once per avatar and
 * `plainExcerpt` once per card, so a feed of sixty posts was allocating a
 * segmenter a hundred-odd times to read the first letter of a name. The
 * instance is stateless -- `segment()` returns a fresh iterator each time --
 * so one shared instance is safe.
 *
 * `undefined` locale on purpose: grapheme boundaries are a property of Unicode
 * text, not of the reader's language, and pinning a locale here would only
 * make the answer depend on where the server happens to think it is. */
const GRAPHEME_SEGMENTER = new Intl.Segmenter(undefined, { granularity: "grapheme" })

/* `Intl.Segmenter` with `granularity: "grapheme"` keeps a ZWJ family emoji
 * and a flag (a pair of regional-indicator codepoints) each as ONE segment,
 * which `[...text]` (codepoint-wise) does not. Baseline "widely available":
 * Chrome/Edge 87, Safari 17, Firefox 125, and every Node this app runs on --
 * so there is no fallback path to maintain. */
export function graphemes(text: string): string[] {
  return Array.from(GRAPHEME_SEGMENTER.segment(text), (s) => s.segment)
}

/**
 * The first user-perceived character of `text`, or "" for an empty string.
 *
 * `name[0]` reads the first UTF-16 code unit, not the first character. Most
 * text is one code unit per character, but a name that opens with an emoji or
 * an astral-plane script is not, and `[0]` there returns half a surrogate
 * pair, which renders as the replacement-character box (audit Lows 38, 107).
 */
export function firstGrapheme(text: string): string {
  if (!text) return ""
  return graphemes(text)[0] ?? ""
}

/**
 * Cut `text` to at most `maxLen` user-perceived characters, appending "..."
 * only when something was actually removed. Used everywhere a body of text
 * is shown as a teaser (letter titles, post/letter excerpts).
 *
 * `.slice(0, maxLen)` cuts by UTF-16 code unit, so a maxLen that lands inside
 * a multi-unit character (an emoji, a flag, most scripts outside the Basic
 * Multilingual Plane) leaves a lone surrogate half in the output, which
 * renders as the replacement-character box instead of the character or
 * nothing (audit Lows 38, 107). Counting and slicing by grapheme cluster
 * (see `graphemes` above) means the cut always lands between two whole
 * characters, never through one.
 */
export function truncateGraphemes(text: string, maxLen: number): string {
  const units = graphemes(text)
  if (units.length <= maxLen) return text
  return units.slice(0, maxLen).join("").trimEnd() + "..."
}

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "?"
  if (parts.length === 1) return firstGrapheme(parts[0]).toUpperCase()
  return (firstGrapheme(parts[0]) + firstGrapheme(parts[parts.length - 1])).toUpperCase()
}

/**
 * The one ceiling a stored `User.name` may ever be, shared by every schema
 * that writes or re-validates it (audit M45 / Low 109). `profileSchema` (the
 * Settings form) already enforced this number; sign-up did not read it at
 * all, splitting the same budget across two independent 50-character fields
 * (`firstName` + " " + `lastName`) that could together reach 101 -- one past
 * this ceiling, so a member who typed the maximum at both fields could sign
 * up successfully and then find Settings refuses to save their own profile
 * back unchanged. Importing this one constant into both schemas, instead of
 * each hard-coding its own number, is what makes them structurally unable to
 * drift apart again.
 */
export const FULL_NAME_MAX = 100

/**
 * Whether `firstName` and `lastName`, joined the way `registerUser` actually
 * joins them (one space between), fit under `FULL_NAME_MAX`. Sign-up's
 * combined-name check must ask this exact question rather than re-deriving
 * it inline, so it can never disagree with what the join itself produces.
 */
export function fullNameFits(firstName: string, lastName: string): boolean {
  return firstName.trim().length + 1 + lastName.trim().length <= FULL_NAME_MAX
}

/* One batch format in this app, and `batchLine()` below owns it. Two rivals
   lived here and both went rather than stay as dead exports offering a second,
   off-house form: `formatBatchChip` ("ISC 2023", for the sidebar account chip)
   on 2026-08-02, when the owner asked that chip to read "Batch of '23" like
   every other byline; and `formatBatch` ("Batch of '23", but blind to
   accountType, so every teacher read as nothing) in the 2026-08-25 refactor
   audit, by which point its last caller was three weeks gone. */

/**
 * One display-date format for photo/letter attribution ("22 May 2026"), in the
 * valley's day (see VALLEY_TIME_ZONE above).
 */
export function formatDisplayDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("en-GB", {
    timeZone: VALLEY_TIME_ZONE,
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

/**
 * The same date spelled out ("22 May 2026" becomes "22 May 2026" with the
 * month unabbreviated), for the surfaces that announce rather than attribute:
 * an Edition's masthead, the console's "Published ...", the next-edition tease.
 *
 * One locale tag for both, because the valley has one day (VALLEY_TIME_ZONE)
 * and should have one date voice. Six local formatters in three tags -- en-US,
 * en-IN, en-GB -- used to render the same published date four different ways.
 */
export function formatDisplayDateLong(date: Date | string): string {
  return new Date(date).toLocaleDateString("en-GB", {
    timeZone: VALLEY_TIME_ZONE,
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

/**
 * A date with no weekday and no year: "20 August".
 *
 * For a value REPORTED rather than announced. The settings row "Give everyone
 * longer" states the deadline it is offering to move, and there the weekday is
 * the announcement's job, not the value's -- `formatDayAndDate` below is what
 * the state line under the Edition uses to say the same instant, because there
 * the day of the week is the part being judged.
 *
 * Timezone-bound like every other formatter here: the valley has one day, and
 * `valley-day.test.mjs` fails the build for a bare `toLocaleDateString`.
 */
export function formatDayMonth(date: Date | string): string {
  return new Date(date).toLocaleDateString("en-GB", {
    timeZone: VALLEY_TIME_ZONE,
    day: "numeric",
    month: "long",
  })
}

/**
 * A deadline, as anyone actually reads one: "Thursday 20 August".
 *
 * The weekday leads because that is the part a deadline is judged by, and
 * there is no year on it: a Catch-up's deadline is always inside a fortnight,
 * so the year would be one more true and useless fact (his standing objection,
 * R32). A date that has already happened -- a published Edition, a photograph's
 * attribution -- takes formatDisplayDateLong instead, which does carry the
 * year, because a shelf of back numbers spans them.
 */
export function formatDayAndDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("en-GB", {
    timeZone: VALLEY_TIME_ZONE,
    weekday: "long",
    day: "numeric",
    month: "long",
  })
}

/**
 * The same date with the clock time on it: "4 Sept 2026, 23:34 IST".
 *
 * For the surfaces where the day is not the answer -- the contributions
 * ledger, where the owner is matching a row against the same payment in
 * Razorpay's dashboard and two gifts can land in the same minute.
 *
 * The zone is spelled out in the string rather than left to be assumed. Both
 * of the other clock times in this app (the verify-email banner, the mail
 * queue's refill hour) say "IST" out loud for the same reason: an unlabelled
 * 23:34 is read as the reader's own hour, and neither the owner nor an
 * alumnus is reliably in India. The hour is 2-digit where the rest of the
 * date is not, so a column of these lines up at a glance instead of ragging
 * between "8:34" and "23:34". The date half formats exactly as
 * formatDisplayDate does, so no surface spells one day two ways.
 */
export function formatDisplayDateTime(date: Date | string): string {
  return `${new Date(date).toLocaleString("en-GB", {
    timeZone: VALLEY_TIME_ZONE,
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })} IST`
}

/**
 * The single line shown under a person's name everywhere. Alumni get
 * "Batch of '09"; teachers get a role label since they have no batch.
 *
 * Note: this reads batchYear only, never batchType, so a mid-school leaver who
 * has no board credential (batchType null) still reads "Batch of '09" as long
 * as batchYear was computed.
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
 * Single source of truth for sign-up (registerUser), the profile's own
 * per-field save (profile-actions.ts) and the admin editor, so none of
 * them can disagree; none reads the retired gradeJoined field.
 */
export function batchTypeFromLeaving(
  yearLeft: number,
  batchYear: number
): "ISC" | "ICSE" | null {
  // batchYear names the year the person's OWN cohort finished 12th, so it can
  // never fall before the year that same person left the school -- leaving is
  // an event inside that cohort's run, at the earliest in the same year they
  // graduate (batchYear === yearLeft, a 12th-grade leaver). batchYear <
  // yearLeft is not a short stay or an early leaver, it is the two fields
  // swapped at signup, and the arithmetic below does not know that: it reads
  // a negative gap as MORE grade than a 12th-grade leaver has, which is why
  // this used to answer "ISC" -- the most senior credential there is -- for
  // exactly the input that means the two years were typed backwards (audit
  // Low 110). null is the honest answer: no board credential can be derived
  // from a pair of years that cannot both be true.
  if (batchYear < yearLeft) return null
  const gradeAtLeaving = 12 - (batchYear - yearLeft)
  if (gradeAtLeaving >= 12) return "ISC"
  if (gradeAtLeaving >= 10) return "ICSE"
  return null
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
    // Same image rule as plainExcerpt below, and for the same reason: an
    // image is a link with a bang on the front, so this MUST run before the
    // generic link-stripping rule or a letter that opens with a photo reads
    // its markdown as a link, leaving a stray "!" in front of the alt text
    // (audit Low 88 -- the exact bug plainExcerpt already fixed).
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/[*_#>`~]|\[([^\]]*)\]\([^)]*\)/g, "$1")
    .split(/\n/)
    .map((l) => l.trim())
    .find(Boolean)
  if (!firstLine) return "A letter"
  return truncateGraphemes(firstLine, maxLen)
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
  return truncateGraphemes(plain, maxLen)
}

/**
 * How long a body takes to read, in whole minutes, never less than one.
 *
 * 200 words a minute is the conventional prose figure, and the number is only
 * ever shown as "4 min read", so the rounding matters more than the constant:
 * a two-line note reads "1 min", not "0 min". Four surfaces printed this
 * expression inline -- the feed's letter card, the letters index, a letter
 * itself and the feed rail's Letters module -- which is four places to change
 * if the figure ever does.
 */
export function readMinutes(content: string): number {
  const words = content.trim().split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.round(words / 200))
}

/**
 * How many valley calendar days from `now` to `at`. 0 is today, 1 tomorrow.
 *
 * The distinction that matters: "a day away" and "tomorrow" are different
 * claims. A deadline twenty-three hours off is under one 24-hour window, so
 * arithmetic on milliseconds calls it today -- and it is very often tomorrow
 * (audit Low 28). Anything that puts a calendar word on screen has to count
 * calendar days, and it has to count them in the valley, because that is the
 * day the deadline itself is expressed in.
 */
export function valleyDaysBetween(at: Date, now: Date = new Date()): number {
  const from = valleyDayStart(now).getTime()
  const to = valleyDayStart(at).getTime()
  return Math.round((to - from) / 86_400_000)
}
