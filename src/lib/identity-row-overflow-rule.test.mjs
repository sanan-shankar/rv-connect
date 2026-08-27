import assert from "node:assert/strict";
import test from "node:test";
import { ROOT, read, decomment, walk } from "./test-kit.mjs";
import { join, relative } from "node:path";

/* ------------------------------------------------------------------ *
 *  One axis visible, the other hidden, is not a thing CSS will do.
 *
 *  CSS Overflow 3, section 3: if one of overflow-x / overflow-y is
 *  `visible` and the other is anything but `visible` or `clip`, the
 *  visible one COMPUTES TO AUTO. So `truncate` (overflow: hidden, for the
 *  ellipsis) beside `overflow-y-visible` (for the descenders `leading-none`
 *  pushes below the line box) does not give you one clipped axis and one
 *  free one. It gives you a scroll container, one pixel taller than itself.
 *
 *  Measured, not inferred: that pair on the byline's own type
 *  (10.5px/leading-none) reported overflow-y `auto`, scrollHeight 12 against
 *  clientHeight 11, and accepted a scrollTop of 1. Every name and every
 *  batch line in the app was a scrollable box. On the platforms that draw
 *  classic scrollbars instead of overlay ones -- Android, where it was
 *  reported -- that painted a stepper inside the row, next to somebody's
 *  name, which scrolled the text a pixel when tapped: "two of the toggle
 *  things ... it doesn't have any function" (2026-08-27).
 *
 *  `clip` is the exemption in that same sentence of the spec, and it fires
 *  text-overflow just as `hidden` does. So the pair to write is clip/visible,
 *  and this pins it repo-wide rather than in the one component that had it:
 *  the next person reaching for overflow-y-visible will be reaching for it
 *  for the same reason, in some other row.
 * ------------------------------------------------------------------ */

/* Deliberately NOT "flag it only when a hidden class sits on the same line".
   That was the first spelling of this test and it passed against the broken
   file: identity-row's clip arrives from the CALLER, as `truncate` inside
   `nameClassName`, so the line that carries overflow-y-visible carries no
   hint of the hidden axis at all. A shared row component cannot see what it
   will be handed, which makes "is the other axis clipped here?" a question
   the source cannot answer -- and a pin that asks it passes on nothing
   (audit C-188's failure mode, arrived at again from the other direction).

   So the rule is the unconditional one, and it is the honest one: `visible`
   is already the initial value, so writing the class at all means you are
   overriding a clip somebody else applied. Every reason to reach for it is a
   reason to need its partner. */
test("overflow-*-visible is always written with the other axis clipped", () => {
  const offenders = [];
  for (const file of walk(join(ROOT, "src"))) {
    const src = decomment(read(relative(ROOT, file)));
    src.split("\n").forEach((line, i) => {
      const where = `${relative(ROOT, file)}:${i + 1}`;
      if (/\boverflow-y-visible\b/.test(line) && !/\boverflow-x-clip\b/.test(line)) {
        offenders.push(`${where} — overflow-y-visible needs overflow-x-clip beside it, or it computes to auto`);
      }
      if (/\boverflow-x-visible\b/.test(line) && !/\boverflow-y-clip\b/.test(line)) {
        offenders.push(`${where} — overflow-x-visible needs overflow-y-clip beside it, or it computes to auto`);
      }
    });
  }
  assert.deepEqual(offenders, [], `\n${offenders.join("\n")}\n`);
});

test("IdentityRow still keeps both axes honest", () => {
  // The one that had it. Both rows -- the name and the byline -- carry the
  // pair, and dropping either the clip (scrollbar returns) or the visible
  // (descenders clip again, owner 2026-08-22) undoes half a bug each.
  const src = decomment(read("src/components/common/identity-row.tsx"));
  const rows = src.split("\n").filter((l) => /\boverflow-y-visible\b/.test(l));
  assert.equal(rows.length, 2, "expected the name row and the meta row");
  for (const row of rows) {
    assert.match(row, /\boverflow-x-clip\b/, `descender fix without the clip: ${row.trim()}`);
  }
});
