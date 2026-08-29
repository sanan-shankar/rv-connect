import assert from "node:assert/strict";
import test from "node:test";
import { read, decomment } from "../../lib/test-kit.mjs";

/* ------------------------------------------------------------------ *
 *  The one focus recipe for plain boxed fields (DESIGN-SYSTEM.md
 *  "Focus states", 2026-08-29). The original two-line spec ("One focus
 *  ring... remove the doubled outline") was executed on Input alone
 *  and ignored by Textarea, Select and Button for a month -- tab
 *  through one form and the indicator changed shape between fields,
 *  which is exactly what the owner re-reported. Thinking that does not
 *  travel needs a test, not a better paragraph.
 * ------------------------------------------------------------------ */

const RECIPE = [
  "focus-visible:border-ring",
  "focus-visible:ring-[3px]",
  "focus-visible:ring-ring/50",
  // forced-colors fallback: box-shadow dies in Windows High Contrast,
  // this transparent outline gets recoloured to a system colour there
  "focus-visible:outline-solid",
  "focus-visible:outline-transparent",
];

for (const file of [
  "src/components/ui/input.tsx",
  "src/components/ui/textarea.tsx",
  "src/components/ui/select.tsx",
]) {
  test(`${file} wears the field focus recipe`, () => {
    const src = decomment(read(file));
    for (const cls of RECIPE) {
      assert.ok(src.includes(cls), `${file} lost ${cls}`);
    }
    assert.ok(
      !src.includes("focus-visible:outline-offset"),
      `${file} has an offset outline again -- fields glow snug, only CONTROLS offset`
    );
  });
}

test("buttons have one ring colour, no per-variant zoo", () => {
  const src = decomment(read("src/components/ui/button.tsx"));
  assert.ok(src.includes("focus-visible:outline-ring"), "base leaf ring missing");
  for (const banned of ["focus-visible:outline-canopy", "focus-visible:outline-destructive"]) {
    assert.ok(!src.includes(banned), `per-variant ring colour is back: ${banned}`);
  }
  // The 2026-08-14 invisible-ring bug: outline-none zeroes the style var in
  // Tailwind v4, and only an explicit solid restores it.
  assert.ok(src.includes("focus-visible:outline-solid"), "outline-solid dropped; keyboard focus is invisible");
});
