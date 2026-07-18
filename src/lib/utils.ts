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

/**
 * The single line shown under a person's name everywhere. Alumni get
 * "Batch of '09"; teachers get a role label since they have no batch.
 *
 * Note: this reads batchYear only, never batchType, so a mid-school leaver who
 * has no board credential (batchType null) still reads "Batch of '09" as long
 * as batchYear was computed. See computeBatchFromSchooling below.
 */
export function batchLine(user: {
  accountType?: string | null
  batchType?: string | null
  batchYear?: number | null
}): string {
  if (user.accountType === "teacher") return "Teacher"
  if (user.accountType === "ex_teacher") return "Former teacher"
  if (user.batchYear == null) return "Member"
  return `Batch of '${String(user.batchYear).slice(-2)}`
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
 * Plain-text excerpt of a post/letter body: markdown syntax stripped,
 * whitespace collapsed, truncated to `maxLen` characters. Used by the feed
 * rail's Letters module for its compact teaser.
 */
export function plainExcerpt(content: string, maxLen = 160): string {
  const plain = content
    .replace(/[*_#>`~]|\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim()
  if (plain.length <= maxLen) return plain
  return plain.slice(0, maxLen).trimEnd() + "..."
}

/**
 * Render rich text: sanitize HTML, then apply markdown-style bold/italic/
 * underline/strikethrough and @[Name](userId) mentions.
 */
export function renderRichText(text: string): string {
  // 1. Escape HTML entities
  let result = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")

  // 2. Bold: **text** -> <strong>text</strong> (run before single *)
  result = result.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")

  // 3. Italic: *text* -> <em>text</em>
  result = result.replace(/\*(.+?)\*/g, "<em>$1</em>")

  // 4. Underline: __text__ -> <u>text</u> (double underscore, distinct from * runs)
  result = result.replace(/__(.+?)__/g, "<u>$1</u>")

  // 5. Strikethrough: ~~text~~ -> <del>text</del>
  result = result.replace(/~~(.+?)~~/g, "<del>$1</del>")

  // 6. Mentions: @[Name](userId) -> clickable link
  result = result.replace(
    /@\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="/profile/$2" class="font-semibold text-leaf hover:underline">@$1</a>'
  )

  return result
}
