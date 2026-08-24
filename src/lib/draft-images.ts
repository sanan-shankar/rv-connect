/**
 * The image URLs a draft edit lets go of: on the row before, not on the list
 * the author just saved.
 *
 * Its own function, and pure, because the consequence of getting it wrong is
 * asymmetric. Too few and some bytes leak; too many and a photograph still on
 * the letter is deleted out from under it, which no retry can undo (there is
 * no R2 versioning). Reordering the same three photos, saving them unchanged,
 * or dropping one and putting it straight back must all drop NOTHING, and the
 * only way to be sure of that is to be able to test it.
 */
export function droppedImages(previous: string[], next: string[]): string[] {
  const kept = new Set(next);
  return previous.filter((url) => !kept.has(url));
}
