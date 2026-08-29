/* ------------------------------------------------------------------ *
 *  Paging the Collection's river, without offsets.
 *
 *  Pure, and in its own file for two reasons. `collection/actions.ts` is
 *  a "use server" module, where every export has to be an async Server
 *  Action, so nothing in here could have been exported from there to be
 *  tested -- and this is the one piece of the river where an off-by-one
 *  silently loses a photograph rather than looking wrong.
 * ------------------------------------------------------------------ */

export type RiverOrder = "newest" | "oldest" | "taken" | "loved";

/* ------------------------------------------------------------------ *
 *  The cursor.
 *
 *  Offset pagination made the database count past every row it discarded:
 *  at page 400 of a twenty-thousand photograph archive that is 9,600 rows
 *  scanned to return 24, and it grows with the depth. A keyset cursor is
 *  flat at any depth, and it also fixes a correctness bug the old code
 *  documented rather than solved -- each offset page re-runs the whole sort
 *  and slices it, so a sort leaving rows tied can hand back rows an earlier
 *  page already showed and skip others entirely (audit B-122).
 *
 *  It is an OPAQUE STRING on the wire. The client's only contract is to
 *  hand back what it was given, so the encoding can change without a client
 *  change -- and "most loved" can keep using an offset (its sort key is a
 *  related-row count, which cannot be cursored without denormalising the
 *  love count onto the row) without the client knowing that two mechanisms
 *  exist.
 * ------------------------------------------------------------------ */

const CURSOR_SEP = "~";

/** As deep as an offset page may go. "Most loved" is the one order that cannot
 *  be cursored (its sort key is a count of related rows), and nobody browses
 *  past ten thousand of anything by love; past that the cursor is refused and
 *  the reader gets the first page rather than a query nobody is waiting for. */
const OFFSET_CEILING = 10_000;

export function encodeCursor(order: RiverOrder, last: { id: string; createdAt: Date; takenKey: number }, nextOffset: number): string {
  if (order === "loved") return `off${CURSOR_SEP}${nextOffset}`;
  if (order === "taken") return `${last.takenKey}${CURSOR_SEP}${last.id}`;
  return `${last.createdAt.toISOString()}${CURSOR_SEP}${last.id}`;
}

export type DecodedCursor =
  | { offset: number }
  | { takenKey: number; id: string }
  | { createdAt: Date; id: string };

/** Whatever the client sent back, read defensively: a cursor is input. */
export function decodeCursor(order: RiverOrder, raw: string | null | undefined): DecodedCursor | null {
  if (!raw) return null;
  const at = raw.indexOf(CURSOR_SEP);
  if (at < 0) return null;
  const key = raw.slice(0, at);
  const id = raw.slice(at + 1);

  if (order === "loved") {
    if (key !== "off") return null;
    const n = Number(id);
    /* Bounded, not merely non-negative. A cursor arrives from a client call,
       so it is input, and `skip: 1e12` is a request to the database to count
       past a trillion rows -- the exact cost this whole mechanism exists to
       avoid, arriving through the one order that still uses an offset. */
    if (!Number.isFinite(n) || n < 0 || n > OFFSET_CEILING) return null;
    return { offset: Math.floor(n) };
  }
  if (!id) return null;
  if (order === "taken") {
    const n = Number(key);
    return Number.isFinite(n) ? { takenKey: Math.floor(n), id } : null;
  }
  const when = new Date(key);
  return Number.isNaN(when.getTime()) ? null : { createdAt: when, id };
}

/** The `where` clause that means "everything after the cursor, in this
 *  order". Two branches per direction, which is the whole of keyset
 *  pagination: strictly past the sort key, or level with it and strictly
 *  past the tiebreak. */
export function afterCursor(order: RiverOrder, cursor: DecodedCursor | null) {
  if (!cursor || "offset" in cursor) return {};
  if ("takenKey" in cursor) {
    return {
      OR: [
        { takenKey: { lt: cursor.takenKey } },
        { takenKey: cursor.takenKey, id: { lt: cursor.id } },
      ],
    };
  }
  const ascending = order === "oldest";
  return ascending
    ? {
        OR: [
          { createdAt: { gt: cursor.createdAt } },
          { createdAt: cursor.createdAt, id: { gt: cursor.id } },
        ],
      }
    : {
        OR: [
          { createdAt: { lt: cursor.createdAt } },
          { createdAt: cursor.createdAt, id: { lt: cursor.id } },
        ],
      };
}

/** The mirror of `afterCursor`, for the one place the river is walked
 *  upward instead of down: the decade rail's seek, once real rows are
 *  loaded above the seek point and the reader keeps scrolling toward
 *  "newer". Only meaningful for "taken" order -- the rail is hidden in
 *  every other order, so nothing else ever calls this. */
export function beforeCursor(cursor: DecodedCursor | null) {
  if (!cursor || !("takenKey" in cursor)) return {};
  return {
    OR: [
      { takenKey: { gt: cursor.takenKey } },
      { takenKey: cursor.takenKey, id: { gt: cursor.id } },
    ],
  };
}

/** `orderByFor("taken")`, reversed. A page walked upward is fetched
 *  ascending -- nearest the boundary first, so `take N` returns the N rows
 *  adjacent to what is already on screen rather than the N oldest rows in
 *  the whole river -- and the caller reverses the result before showing
 *  it, because the reader always sees newest-first. */
export function orderByForTakenAscending() {
  return [{ takenKey: "asc" as const }, { id: "asc" as const }];
}

/** The `where` fragment for jumping straight to a decade: not resuming
 *  from a row the reader has already seen, so unlike `afterCursor` this is
 *  not a two-branch OR against a real tiebreak -- it is the plain half of
 *  one, strictly below the boundary. `null` means no boundary applies (the
 *  newest real decade) and the fragment is omitted entirely, same as no
 *  cursor at all.
 *
 *  There is no `seekNewer` beside it. The obvious mirror -- `takenKey: {
 *  gte: boundary }`, for the first step back up out of a seek -- turns out
 *  never to be needed: `loadPhotos` hands back a cursor built from the
 *  seeked page's own top ROW, a real one, so every climb back up pages from
 *  `beforeCursor` like any other, and a synthetic boundary for that
 *  direction never gets bootstrapped at all. */
export function seekOlder(boundary: number | null) {
  return boundary === null ? {} : { takenKey: { lt: boundary } };
}

export function orderByFor(order: RiverOrder) {
  switch (order) {
    case "oldest":
      return [{ createdAt: "asc" as const }, { id: "asc" as const }];
    case "taken":
      /* Newest decade first, and undated last with no NULLS clause anywhere:
         `takenKey` is 0 when nobody said when, which is a real answer here
         rather than a missing one. */
      return [{ takenKey: "desc" as const }, { id: "desc" as const }];
    case "loved":
      return [
        { loves: { _count: "desc" as const } },
        { createdAt: "desc" as const },
        { id: "desc" as const },
      ];
    default:
      return [{ createdAt: "desc" as const }, { id: "desc" as const }];
  }
}
