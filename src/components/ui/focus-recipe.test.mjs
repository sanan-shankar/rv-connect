import assert from "node:assert/strict";
import test from "node:test";
import { execSync } from "node:child_process";
import { ROOT, read, decomment } from "../../lib/test-kit.mjs";

/* ------------------------------------------------------------------ *
 *  ONE focus edge for every text field with a box (field-focus.ts,
 *  DESIGN-SYSTEM.md "Focus states").
 *
 *  The first version of this test pinned the three ui/ primitives and
 *  called the job done, while the composer, the comment box, the
 *  support amount and eight other hand-rolled fields each kept their
 *  own answer -- eleven in all. The owner picked two boxes at random
 *  and they differed (2026-08-29: "I picked two and they were
 *  inconsistent"). So this test now walks EVERY file that renders a
 *  text field and demands the shared constant, with a short, reasoned
 *  allowlist for fields that have no box to light.
 * ------------------------------------------------------------------ */

/* Column A of /lab/focus, the owner's pick (2026-08-29): a click tints the
   border, a Tab gets the 2px inset edge, and the split rides on
   html[data-modality] set by <FocusModality> in the root layout. */
test("field-focus.ts: tint on click, one snug 2px edge on Tab, never a halo or an offset", () => {
  const src = decomment(read("src/components/ui/field-focus.ts"));
  assert.ok(src.includes("focus-visible:border-ring"), "the click tint is gone");
  // The browser's own ring (outline: auto, blue on a Mac) must be off INSIDE
  // the constant: the support amount field leaked it when only callers were
  // expected to carry outline-none.
  for (const name of ["FIELD_FOCUS =", "FIELD_FOCUS_SHELL =", "FIELD_FOCUS_WITHIN ="]) {
    const i = src.indexOf(name);
    assert.ok(i >= 0 && src.slice(i, i + 80).includes("outline-none"), `${name} does not start with outline-none`);
  }
  // Every keyboard-only token must be LITERAL in the source: Tailwind reads
  // class names out of files as text, so a `${prefix}:ring-1` compiles to no
  // CSS at all (which is exactly how the first draft shipped an invisible
  // keyboard edge while every probe said the class was present).
  const KB = "[html[data-modality=keyboard]_&]";
  assert.ok(!src.includes("${"), "field-focus.ts builds class names by interpolation; Tailwind cannot see them");
  for (const cls of ["focus-visible:ring-1", "focus-visible:ring-inset", "focus-visible:ring-ring", "focus-visible:outline-transparent"]) {
    assert.ok(src.includes(`${KB}:${cls}`), `keyboard edge lost ${KB}:${cls}`);
  }
  const layout = decomment(read("src/app/layout.tsx"));
  assert.ok(layout.includes("<FocusModality />"), "the modality tracker is not mounted in the root layout");
  assert.ok(!/ring-ring\/\d/.test(src), "a half-alpha halo is back -- that is 'the thin ring and the thick ring'");
  assert.ok(!src.includes("outline-offset"), "an offset is back -- that is 'separated from the text box'");
});

/* Fields with NO box of their own: nothing to light, the caret and the
   container are the state. Each entry names why. Adding to this list is a
   design decision, not a shortcut. */
const BORDERLESS = new Map([
  ["src/components/profile/pen.tsx", "profile pen: a gradient underline, border-0"],
  ["src/components/common/rich-text-area.tsx", "unstyled primitive: the box and its focus edge come from the caller's className"],
  ["src/components/common/filters/facet-search-select.tsx", "search line inside a popover header"],
  ["src/components/collection/photo-questions.tsx", "year digits inside a grouped bare row"],
  ["src/components/collection/contribute-room.tsx", "hidden file input (the year digits moved to photo-questions.tsx)"],
  ["src/components/profile/letterhead-profile.tsx", "no text input rendered; the match is a comment"],
  ["src/components/profile/flag-person-dialog.tsx", "radio inputs only"],
  ["src/components/auth/signup-form.tsx", "checkbox only; its text fields are FloatField"],
  ["src/components/common/attach-image-dialog.tsx", "hidden file input"],
]);

test("every text field with a box wears FIELD_FOCUS (or is on the reasoned borderless list)", () => {
  const files = execSync(
    "git grep -lE '<input|<textarea|contentEditable' -- 'src/components/*.tsx' ':!src/app/lab'",
    { cwd: ROOT, encoding: "utf8" }
  )
    .split("\n")
    .filter(Boolean)
    .filter((f) => !f.startsWith("src/app/lab"));
  assert.ok(files.length >= 15, `suspiciously few field files (${files.length})`);

  const offenders = files.filter((f) => {
    if (BORDERLESS.has(f)) return false;
    const src = decomment(read(f));
    return !/from "@\/components\/ui\/field-focus"/.test(src);
  });
  assert.deepEqual(
    offenders,
    [],
    "text field(s) not wearing the shared focus edge. Import FIELD_FOCUS (or FIELD_FOCUS_WITHIN " +
      "for a wrapper) from ui/field-focus, or add the file to BORDERLESS with a reason."
  );

  // The opposite drift: nobody hand-writes a competing field ring any more.
  const hand = files.filter((f) => {
    const src = decomment(read(f));
    return /ring-leaf\/\d|ring-ring\/\d|outline-leaf|inset 0 0 0 2px color-mix/.test(src);
  });
  assert.deepEqual(hand, [], "hand-rolled field ring(s) found alongside the shared one");
});

test("buttons have one ring colour, no per-variant zoo", () => {
  const src = decomment(read("src/components/ui/button.tsx"));
  assert.ok(src.includes("focus-visible:outline-ring"), "base leaf ring missing");
  for (const banned of ["focus-visible:outline-canopy", "focus-visible:outline-destructive"]) {
    assert.ok(!src.includes(banned), `per-variant ring colour is back: ${banned}`);
  }
  assert.ok(src.includes("focus-visible:outline-solid"), "outline-solid dropped; keyboard focus is invisible");
});

test("the base layer paints outlines at full alpha", () => {
  const css = read("src/app/globals.css");
  assert.ok(!/@apply[^;]*outline-ring\/\d/.test(css), "shadcn's outline-ring/50 is back: 1.78:1 against the page");
});
