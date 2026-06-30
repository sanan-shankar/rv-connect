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
