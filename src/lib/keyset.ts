/* Pagination that does not depend on the row it stopped at.
 *
 * Every "Load more" in this app used Prisma's own `cursor: { id }, skip: 1`.
 * That names a ROW, and Prisma needs that row to still be inside the filtered
 * set: if it is not, the query answers nothing. Proved on this exact stack
 * (Prisma 7 + @prisma/adapter-pg, 2026-08-24) -- a cursor on a hard-deleted id
 * and a cursor on a row the `where` now excludes BOTH return an empty array,
 * with no error to notice:
 *
 *     baseline page: 5 rows
 *     cursor on a row excluded by where -> 0 rows
 *     cursor on a deleted row           -> 0 rows
 *
 * So the last post of a page being deleted by its author, hidden by a
 * moderator, or losing its author to a block between one page and the next
 * ended the scroll: hasMore false, nextCursor null, everything older
 * unreachable until a full reload, and nothing on screen to say so. The feed,
 * the comments and the bell all had it (audits C-005, C-124, C-162, C-171).
 *
 * The fix is to stop naming a row. A cursor here carries the SORT KEY -- the
 * timestamp and the id -- so the next page is a plain `where` comparison
 * against values, and it does not matter whether the row those values came
 * from still exists. No recovery query, no fallback, nothing to get wrong on
 * the page where it matters.
 *
 * (The directory keeps its own audit-M39 offset recovery: it sorts by name and
 * by batch, not by time, so it has no timestamp key to seek on.)
 *
 * The `id` half of the key is not decoration. Two rows can share a millisecond
 * -- Postgres stores these columns at `timestamp(3)`, which is exactly the
 * precision a JS Date carries -- and without the tiebreak such a pair would
 * repeat or vanish at a page boundary. Every caller's `orderBy` must end in
 * `id` in the same direction, which is what makes the comparison below total.
 */

export type KeysetRow = { createdAt: Date; id: string };

/** Newest-first (feed, bell) or oldest-first (a comment thread). */
export type KeysetDirection = "desc" | "asc";

/** The opaque string a client hands back. Milliseconds, a bar, then the id. */
export function encodeKeyset(row: KeysetRow): string {
  return `${row.createdAt.getTime()}|${row.id}`;
}

/**
 * Read a cursor a client sent us.
 *
 * Null for anything that is not one, which is the safe direction: the caller
 * then treats it as "no cursor" and serves the first page. A cursor is only
 * ever a string this module minted, so the only way to get here is a client
 * making one up or a page held across a deploy that changed the format.
 */
export function decodeKeyset(cursor: string | null | undefined): KeysetRow | null {
  if (typeof cursor !== "string") return null;
  const bar = cursor.indexOf("|");
  if (bar < 1 || bar === cursor.length - 1) return null;
  const ms = Number(cursor.slice(0, bar));
  if (!Number.isSafeInteger(ms) || ms < 0) return null;
  return { createdAt: new Date(ms), id: cursor.slice(bar + 1) };
}

/**
 * The `where` fragment for "strictly past this point".
 *
 * AND this with the query's own filter rather than spreading it in: several of
 * these filters already carry a top-level `OR` (the feed's batch scope), and a
 * second one would silently replace the first.
 */
export function keysetWhere(
  after: KeysetRow | null,
  direction: KeysetDirection = "desc"
): { OR: [{ createdAt: object }, { createdAt: Date; id: object }] } | Record<string, never> {
  if (!after) return {};
  const past = direction === "desc" ? "lt" : "gt";
  return {
    OR: [
      { createdAt: { [past]: after.createdAt } },
      { createdAt: after.createdAt, id: { [past]: after.id } },
    ],
  };
}
