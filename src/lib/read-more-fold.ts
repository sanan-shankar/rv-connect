/**
 * Where a long post folds behind "Read more".
 *
 * By LINES as the text actually wraps, not by characters (owner, 2026-09-12:
 * "not by character count but only after 7 lines of written content"). A
 * character count cannot know the width, the font or where a paragraph ends,
 * so it folded a 390px phone and a 1440px desktop at the same word, and it
 * used to split the post into two paragraphs there, breaking the sentence
 * onto a new line (fixed in 81c200a0, and gone for good now that nothing is
 * split: the whole post renders, and the fold is a clip).
 *
 * The DOM half measures; the decision is a pure function, so `node --test`
 * can load this file and pin the rules.
 */

/** Seven lines of text are shown before a post folds. */
export const FOLD_LINES = 7;

/** A paragraph that ends on line 5, 6 or 7 is a better place to stop than the
 *  middle of a sentence on line 7, so the fold moves up to the latest such
 *  break (owner: "if it breaks after 5 lines let's still show it"). */
export const FOLD_EARLIEST_BREAK = 5;

/** Folding away a single line saves nothing, since "Read more" takes a line of
 *  its own, so a post one line over is shown whole. */
export const FOLD_GRACE = 1;

export type Fold = {
  /** Height of the paragraph when folded: the bottom of the last line shown. */
  clip: number;
  lineHeight: number;
  /** The fold falls inside a paragraph, so its last line trails off instead of
   *  ending on a full stop. */
  trailsOff: boolean;
};

/**
 * The centre of each rendered line of text, measured from the element's top,
 * top to bottom. Inline runs (a mention, a bold phrase) add a rect per line of
 * their own, so rects within half a line of each other are one line. A blank
 * line between paragraphs has no glyphs and so no width, which is how a
 * paragraph break shows up here: a gap wider than a line.
 */
export function lineCentres(el: HTMLElement, lineHeight: number): number[] {
  const top = el.getBoundingClientRect().top;
  const range = document.createRange();
  range.selectNodeContents(el);
  const centres: number[] = [];
  for (const r of range.getClientRects()) {
    if (r.width === 0 || r.height === 0) continue;
    const mid = (r.top + r.bottom) / 2 - top;
    if (!centres.some((y) => Math.abs(y - mid) < lineHeight / 2)) centres.push(mid);
  }
  return centres.sort((a, b) => a - b);
}

/** Where to fold text whose lines sit at `centres`, or null when it all shows. */
export function chooseFold(centres: number[], lineHeight: number): Fold | null {
  if (centres.length <= FOLD_LINES + FOLD_GRACE) return null;
  // A paragraph ends after line n when the next line is more than a line away.
  const breakAfter = (n: number) => centres[n] - centres[n - 1] > lineHeight * 1.5;
  let shown = FOLD_LINES;
  for (let n = FOLD_LINES; n >= FOLD_EARLIEST_BREAK; n--) {
    if (breakAfter(n)) {
      shown = n;
      break;
    }
  }
  return {
    clip: Math.round(centres[shown - 1] + lineHeight / 2),
    lineHeight,
    trailsOff: !breakAfter(shown),
  };
}
