import assert from "node:assert/strict";
import test from "node:test";

import { chooseFold, FOLD_LINES } from "./read-more-fold.ts";
import { read, decomment } from "./test-kit.mjs";

/* ------------------------------------------------------------------ *
 *  Where a long post folds behind "Read more".
 *
 *  The rules are the owner's (2026-09-12): seven lines of written
 *  content, not a character count, and a paragraph that ends on line
 *  5, 6 or 7 wins over stopping mid-sentence at 7.
 *
 *  The measuring is the browser's; what is pinned here is the decision
 *  it feeds, expressed the way the DOM hands it over -- the vertical
 *  centre of each line of text, with blank lines showing up as a gap
 *  rather than an entry.
 * ------------------------------------------------------------------ */

const LH = 25.5;

/** Line centres for paragraphs of the given lengths, one blank line between. */
const centres = (...paragraphs) => {
  const out = [];
  let slot = 0;
  paragraphs.forEach((lines, i) => {
    if (i > 0) slot += 1; // the blank line, which has no glyphs to measure
    for (let n = 0; n < lines; n++) out.push(slot++ * LH + LH / 2);
  });
  return out;
};

test("a post of eight lines or fewer is shown whole", () => {
  for (const lines of [1, 7, 8]) {
    assert.equal(chooseFold(centres(lines), LH), null, `${lines} lines folded`);
  }
  // Nine is the first that folds: hiding a single line saves no height, since
  // "Read more" takes a line of its own.
  assert.notEqual(chooseFold(centres(9), LH), null, "nine lines did not fold");
});

test("one long paragraph folds at seven lines, trailing off", () => {
  const fold = chooseFold(centres(30), LH);
  assert.equal(fold.trailsOff, true, "a fold mid-paragraph should trail off");
  assert.equal(fold.clip, Math.round(FOLD_LINES * LH), "the clip is not seven lines deep");
});

test("a paragraph ending on line 5, 6 or 7 takes the fold, and does not trail off", () => {
  for (const ends of [5, 6, 7]) {
    const fold = chooseFold(centres(ends, 20), LH);
    assert.equal(fold.clip, Math.round(ends * LH), `a break after ${ends} lines was not used`);
    assert.equal(fold.trailsOff, false, `a fold at a paragraph's end should not trail off`);
  }
});

test("the latest break wins, so the fold shows as much as it can", () => {
  const fold = chooseFold(centres(3, 3, 20), LH); // paragraphs end on lines 3 and 6
  assert.equal(fold.clip, Math.round(6 * LH + LH), "the fold did not take the line-6 break");
});

test("a break before line 5 is too early to be worth stopping at", () => {
  const fold = chooseFold(centres(3, 20), LH); // ends on line 3, then runs on
  assert.equal(fold.trailsOff, true, "it stopped at the line-3 break instead of running to seven");
  assert.equal(fold.clip, Math.round(FOLD_LINES * LH + LH), "the clip is not seven lines of text deep");
});

/* ---- and what the card does with it ------------------------------- */

test("the card renders the post in ONE piece, so nothing can straddle a cut", () => {
  /* This is audit C-011 retired rather than re-fixed. The card used to render
     the lead and the remainder as two separate `renderRichText` calls, which
     needs both delimiters of a run in one string -- so a bold phrase, a mention
     or an emoji straddling the cut came apart, and `safeTruncateIndex`
     (src/lib/rich-truncate.ts, deleted) existed to cut somewhere safe. The
     fold is a clip now: the whole post is rendered and the paragraph is cut
     short in CSS, so there is no second call to keep in step. */
  const card = decomment(read("src/components/posts/post-card.tsx"));
  assert.match(card, /renderRichText\(content\)/, "the card no longer renders the whole post");
  assert.equal(
    [...card.matchAll(/renderRichText\(/g)].length,
    1,
    "the post body is rendered in more than one piece again"
  );
  assert.doesNotMatch(card, /safeTruncateIndex|leadText|restText/, "the character cut is back");
});

test("the card folds on measured lines, not on a character count", () => {
  const card = decomment(read("src/components/posts/post-card.tsx"));
  assert.match(card, /chooseFold\(lineCentres\(el, lineHeight\), lineHeight\)/, "nothing measures lines");
  assert.match(card, /new ResizeObserver\(measure\)/, "a rewrap at a new width is never re-measured");
  assert.match(card, /document\.fonts\.ready\.then\(measure\)/, "the web font landing is never re-measured");
});
