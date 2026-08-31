/**
 * Add the next page to a list without letting a row appear twice.
 *
 * Offset pagination has no memory: page 2 is "skip 24, take 24" against
 * whatever the table holds NOW. Approve a photograph while somebody is
 * browsing and every row shifts down one, so the last tile of page 1 comes
 * back as the first row of page 2. React then renders two nodes with the same
 * key -- a console error, a doubled tile, and a viewer whose next/previous
 * walks over the same photograph twice (audit C-071).
 *
 * Keeping the copy already on screen, rather than the newly arrived one, is
 * deliberate: it is the node React has mounted, and any state attached to it
 * (a heart mid-animation, an open viewer) belongs to it.
 */
export function appendUnseen<T extends { id: string }>(shown: T[], arriving: T[]): T[] {
  const seen = new Set(shown.map((row) => row.id));
  return [...shown, ...arriving.filter((row) => !seen.has(row.id))];
}

/** The mirror, for the one list walked upward instead of down: the
 *  Collection's year rail, climbing back toward newer photographs after a
 *  seek. Same guarantee, reversed -- a row that arrives again keeps the copy
 *  already mounted, and the new page is threaded onto the FRONT. */
export function prependUnseen<T extends { id: string }>(arriving: T[], shown: T[]): T[] {
  const seen = new Set(shown.map((row) => row.id));
  return [...arriving.filter((row) => !seen.has(row.id)), ...shown];
}
