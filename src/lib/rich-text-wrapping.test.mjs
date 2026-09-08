import test from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import { ROOT, read, walk, SKIP_DIRS } from "./test-kit.mjs";

/* ------------------------------------------------------------------ *
 *  A container that prints what a member typed cannot push the page
 *  sideways.
 *
 *  WHY IT IS A TEST. The owner has reported the same symptom four times
 *  (brief 11, 19, 25, 33), always on his phone, always as the green bar
 *  running out before the right edge with "this extra half a centimetre
 *  of white space" cutting through everything. It is not the bar. Three
 *  answers in the live "in the loop" Edition 1 are pasted Spotify links,
 *  and `https://open.spotify.com/track/3IuSgREoO5y88HdIcE2Xee?` is 54
 *  characters with NO break opportunity in it -- 369px of unbreakable
 *  text in a 316px column. Measured at 390x844 with touch emulation
 *  before the fix: the document laid out 414px wide in a 390px window,
 *  so the sticky green bar (390px, and `position: sticky` does not
 *  follow a sideways pan) left 24px of background showing.
 *
 *  Nothing between the paragraph and `<html>` clipped it: all fourteen
 *  ancestors are `overflow-x: visible`, and the only thing holding the
 *  page still was `html { overflow-x: clip }` in globals.css -- which
 *  Chrome honours and iOS Safari does not, which is why it was "a phone
 *  bug" that would not reproduce in a narrowed desktop window.
 *
 *  So the rule is not "add break-words everywhere". It is that the
 *  handful of elements that render MEMBER TYPING through
 *  `renderRichText` each carry a break rule, because that is the only
 *  text on any page whose width nobody chose.
 *
 *  `break-words` (overflow-wrap: break-word) breaks a long word only
 *  when it would otherwise overflow, so ordinary prose wraps exactly as
 *  it did. `[overflow-wrap:anywhere]` counts too -- comments-section.tsx
 *  had already reached for it on its own.
 * ------------------------------------------------------------------ */

/** Either spelling of "let a word that does not fit break". */
const BREAKS = /\bbreak-words\b|overflow-wrap:\s*(break-word|anywhere)/;

/* How far back from the call to read. The break rule does not always sit on
   the element receiving the html: comments-section.tsx puts it on the <p>
   and hands the html to a <span> inside, which is correct, because
   overflow-wrap is inherited. So this reads the enclosing few lines rather
   than one attribute, and its known limit is stated rather than pretended
   away -- a NEW render site added within 600 characters of a fixed one
   would pass on its neighbour's class. That is a smaller hole than the bug
   this pins, and the five sites have not moved in a year. */
const LOOKBEHIND = 600;

const files = walk(join(ROOT, "src"), {
  skip: (name) => SKIP_DIRS.includes(name),
}).filter((f) => /\.tsx$/.test(f));

test("every element that prints a member's typing can break a long word", () => {
  /* Anti-vacuity: a moved directory or a changed matcher would make the
     assertion below pass over nothing at all. */
  assert.ok(
    files.length > 200,
    `the sweep found only ${files.length} .tsx files; it is no longer reading the tree`,
  );

  const offenders = [];
  let checked = 0;

  for (const full of files) {
    const rel = full.slice(ROOT.length + 1);
    /* The lab draws its own copies of these surfaces and is not shipped to
       the public demo; the rule is about pages seventy members open. */
    if (rel.startsWith("src/app/lab/")) continue;
    const src = read(rel);

    /* Only the sites that HAND the rendered html to the DOM. A file that
       merely imports the function, or names it in a comment, renders
       nothing. */
    const calls = [...src.matchAll(/__html:\s*renderRichText\(/g)];
    for (const call of calls) {
      checked += 1;
      const governing = src.slice(Math.max(0, call.index - LOOKBEHIND), call.index);
      if (!BREAKS.test(governing)) {
        const line = src.slice(0, call.index).split("\n").length;
        offenders.push(`${rel}:${line}`);
      }
    }
  }

  /* The second guard, and the one that would actually bite: if
     `renderRichText` were renamed or the call shape changed, the loop
     would find nothing and say so by being silent. */
  assert.ok(
    checked >= 5,
    `only ${checked} render sites found; the sweep is matching the wrong call shape`,
  );

  assert.deepEqual(
    offenders,
    [],
    "these print what a member typed with no way to break a word that does " +
      "not fit. One pasted Spotify link is 369px of unbreakable text; in a " +
      "316px column it lays the whole document out wider than the phone, and " +
      "the sticky green bar stops short of the right edge. Add `break-words` " +
      "beside `whitespace-pre-wrap`:\n  " + offenders.join("\n  "),
  );
});
