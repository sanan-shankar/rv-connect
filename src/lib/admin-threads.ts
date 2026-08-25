/**
 * Shared, database-free vocabulary for member <-> admin conversations: the
 * kinds a thread can be, what each one is called, and how a thread's title and
 * previews are derived.
 *
 * Deliberately imports NOTHING server-side. The composer and the admin queue
 * are client components, and an earlier version of this file imported the
 * Prisma client, which dragged `pg` into the browser bundle and broke the page
 * with "Module not found: Can't resolve 'dns'" (tsc was perfectly happy with
 * it). Everything that touches the database lives in admin-threads-server.ts.
 */

import { graphemes } from "./utils.ts";

/** What the composer offers as optional chips. Order matters: it is the UI order. */
export const COMPOSER_KINDS = ["bug", "idea", "message"] as const;

export const MAX_MESSAGE_LENGTH = 4000;
const MAX_SUBJECT_LENGTH = 120;

/** How many new threads one member may open per hour, and messages per hour. */
export const MAX_NEW_THREADS_PER_HOUR = 5;
export const MAX_MESSAGES_PER_HOUR = 40;

const KIND_CHIP_LABEL: Record<string, string> = {
  bug: "Bug report",
  idea: "An idea",
  message: "Something else",
  notice: "From the admins",
  report: "Something you reported",
};

/** The short label shown on a thread row and on the composer chips. */
export function kindLabel(kind: string): string {
  return KIND_CHIP_LABEL[kind] ?? KIND_CHIP_LABEL.message;
}

/**
 * The heading a thread wears. An admin-started note keeps the exact wording
 * the owner asked for; everything else falls back to the member's own first
 * line, which is almost always the most useful thing to read.
 */
export function threadTitle(thread: { kind: string; subject: string | null }): string {
  if (thread.kind === "notice") return "Notes from the admins";
  if (thread.subject?.trim()) return thread.subject.trim();
  if (thread.kind === "report") return "Something you reported";
  if (thread.kind === "bug") return "A bug report";
  if (thread.kind === "idea") return "An idea you sent";
  return "A message to the admins";
}

/**
 * Builds a subject from the first message so the member never has to write
 * one. Cuts at the first sentence end when there is one nearby, otherwise at a
 * word boundary, so a row in the list never ends mid-word.
 */
/**
 * At most `n` UTF-16 code units of `text`, cut only where a reader would
 * accept a cut.
 *
 * `String.prototype.slice` indexes CODE UNITS, and every emoji is a two-unit
 * surrogate pair (a ZWJ family is several joined pairs), so a cut at an odd
 * boundary relative to those pairs leaves a LONE surrogate -- which renders as
 * a U+FFFD replacement diamond in a stored subject and in the notification
 * line an admin reads (audit C-059).
 *
 * The budget stays in code units rather than in graphemes on purpose: `n` is
 * how WIDE these strings are allowed to be, and counting graphemes instead
 * would silently double the length of an emoji-heavy subject. So this takes
 * whole graphemes while they fit and stops before the one that would not --
 * the result is never longer than `n` and never ends mid-character.
 */
function cutTo(text: string, n: number): string {
  if (text.length <= n) return text;
  let out = "";
  for (const g of graphemes(text)) {
    if (out.length + g.length > n) break;
    out += g;
  }
  return out;
}

export function deriveSubject(body: string): string {
  const flat = body.replace(/\s+/g, " ").trim();
  if (flat.length <= 64) return cutTo(flat, MAX_SUBJECT_LENGTH);

  /* The sentence search stays on the raw string: it looks for an ASCII `.!?`
     followed by a space, neither of which can fall inside a surrogate pair, so
     the index it returns is always a safe boundary. */
  const sentenceEnd = flat.slice(0, 90).search(/[.!?]\s/);
  if (sentenceEnd > 24) return flat.slice(0, sentenceEnd + 1);

  const cut = cutTo(flat, 64);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > 32 ? cut.slice(0, lastSpace) : cut) + "...";
}

/** A one-line preview for notification copy and the admin queue. */
export function previewOf(body: string, max = 90): string {
  const flat = body.replace(/\s+/g, " ").trim();
  const cut = cutTo(flat, max - 1);
  return cut.length < flat.length ? cut.trimEnd() + "..." : flat;
}
