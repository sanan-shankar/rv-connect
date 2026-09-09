import { test } from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import { read } from "../../../lib/test-kit.mjs";

/* ------------------------------------------------------------------ *
 *  The Edition reader's geometry, in two places, kept in step.
 *
 *  WHY IT IS A TEST. The reader chooses its layout in CSS rather than in
 *  JavaScript, so the server's one render is correct at every width (see
 *  the docblock in reader.tsx). The price is that the same number is
 *  written twice: once as a constant the scroll maths reads, and once as a
 *  Tailwind class, which HAS to be a literal because Tailwind reads the
 *  file as text and a template string produces a class with no rule behind
 *  it. Nothing but this stops the two drifting, and a drift is silent: the
 *  page looks right and a picked question lands 40px under the strip.
 *
 *  AND THE ORDERING RULE, which is the one that actually bit. Tailwind
 *  emits `md:` AFTER an arbitrary `min-[1180px]:`, so at 1440 both match
 *  and the NARROW laptop's value wins. Measured on 2026-09-09 with
 *  `h-16 md:h-[88px] min-[1180px]:h-0`: the computed height at 1440 was
 *  88px and the page title sat 88px below the shell's own 40px gutter.
 *  Every three-way rule in that file has to bound its middle range.
 * ------------------------------------------------------------------ */

const READER = read(join("src", "components", "catchups", "edition", "reader.tsx"));
const NAVIGATOR = read(join("src", "components", "catchups", "edition", "navigator.tsx"));
const SIDEBAR = read(join("src", "components", "layout", "sidebar.tsx"));

/** Read `const NAME = 123;` out of the source. */
function constant(src, name) {
  const m = src.match(new RegExp(`const ${name} = (\\d+)`));
  assert.ok(m, `${name} is gone from the reader; this test is checking nothing`);
  return Number(m[1]);
}

test("the file still holds the constants this test is about", () => {
  /* Anti-vacuity. Every assertion below reads one of these; if a rename made
     them unfindable the regexes would quietly match nothing. */
  assert.ok(READER.length > 5000, "reader.tsx is not being read");
  assert.ok(NAVIGATOR.length > 3000, "navigator.tsx is not being read");
});

test("the phone bar is 56px in the reader and 56px in the app shell", () => {
  /* `BAR` is where the strip sticks and where a picked question lands. It is
     the app's own mobile header, `h-14` on the `md:hidden` <header> in
     sidebar.tsx. If that bar ever changes height the strip hides under it. */
  assert.equal(constant(NAVIGATOR, "BAR"), 56);
  assert.match(
    SIDEBAR,
    /data-app-bar[\s\S]{0,200}?className="sticky top-0 z-40 flex h-14 /,
    "the app bar is no longer `h-14` (56px); navigator.tsx's BAR must follow it",
  );
  assert.match(
    READER,
    /"sticky top-14 /,
    "the strip no longer sticks at top-14 (56px), which is BAR",
  );
});

test("the strip's laptop offset is written once as 16 and once as top-4", () => {
  assert.equal(constant(READER, "STRIP_TOP_LAPTOP"), 16);
  assert.match(READER, /md:top-4\b/, "md:top-4 is 16px, which is STRIP_TOP_LAPTOP");
});

test("the rail is pinned at 40 in the maths and top-10 in the class", () => {
  assert.equal(constant(READER, "RAIL_TOP"), 40);
  assert.match(READER, /min-\[1180px\]:sticky[\s\S]{0,60}?top-10|top-10[\s\S]{0,60}?min-\[1180px\]:sticky/);
});

test("the rail's width and gutter match the grid that draws them", () => {
  assert.equal(constant(READER, "RAIL"), 280);
  assert.equal(constant(READER, "RAIL_GAP"), 48);
  assert.match(READER, /min-\[1180px\]:grid-cols-\[minmax\(0,1fr\)_280px\]/);
  assert.match(READER, /min-\[1180px\]:gap-x-\[48px\]/);
});

test("the breakpoint the maths computes is the one the classes are written at", () => {
  /* 520 + 48 + 280 + 328 = 1176, raised to rail-grid.ts's own 1180. Every
     `min-[...]` in the file must be that same number, or the JavaScript and
     the CSS disagree about which layout is on screen. */
  const computed = Math.max(
    constant(READER, "READING_MIN") +
      constant(READER, "RAIL_GAP") +
      constant(READER, "RAIL") +
      constant(READER, "SHELL_CHROME"),
    constant(READER, "RAIL_GRID_FLOOR"),
  );
  assert.equal(computed, 1180);
  const widths = new Set([...READER.matchAll(/min-\[(\d+)px\]:/g)].map((m) => Number(m[1])));
  assert.deepEqual([...widths], [computed], `classes use ${[...widths]}, the maths says ${computed}`);
});

test("a rule that has both an md: and a min-[1180px]: value bounds the md one", () => {
  /* The ordering trap, stated as a rule. Tailwind puts `md:` after the
     arbitrary `min-[1180px]:`, so an UNBOUNDED `md:` value also applies above
     1180 and wins. Any property written at both widths must spell its middle
     range `md:max-[1179px]:`. */
  const classLists = [...READER.matchAll(/className="([^"]+)"/g)].map((m) => m[1]);
  const offenders = [];
  for (const list of classLists) {
    if (!/min-\[1180px\]:/.test(list)) continue;
    for (const cls of list.split(/\s+/)) {
      if (!cls.startsWith("md:")) continue;
      if (cls.startsWith("md:max-[")) continue;
      // The property each variant sets, e.g. `h`, `pt`, `top`, `rounded`.
      const prop = cls.slice(3).split("-")[0];
      const clash = list
        .split(/\s+/)
        .some((other) => other.startsWith("min-[1180px]:") && other.slice(13).split("-")[0] === prop);
      if (clash) offenders.push(cls);
    }
  }
  assert.deepEqual(
    offenders,
    [],
    "these set a property at md: and again at min-[1180px]:, and Tailwind emits " +
      "the md: rule LAST, so the narrow-laptop value wins on a wide one. Bound " +
      "the middle range with `md:max-[1179px]:`:\n  " + offenders.join("\n  "),
  );
});

test("the two clamps are the ones he chose, and they are the right way round", () => {
  /* Owner question 20, 2026-09-08: "a. make this clamp to three lines and the
     other one that was previously clamped to three lines, clamp to two lines."
     The strip is on screen the whole time you read, so it is the small one;
     the list is a thing you deliberately pull down, so it can afford more.
     This closes F41, where a 300-character question was a 211px row against
     its neighbours' 41. */
  assert.equal(constant(NAVIGATOR, "STRIP_CLAMP_LINES"), 2);
  assert.equal(constant(NAVIGATOR, "ROW_CLAMP_LINES"), 3);
});

test("the row's clamp is on an inner span, not on the padded button", () => {
  /* `overflow: hidden` clips at the PADDING box, so the same rule written one
     level up bleeds a band of the fourth line into the row beneath (F41). */
  const row = NAVIGATOR.slice(NAVIGATOR.indexOf("const text = ("));
  assert.match(
    row.slice(0, 400),
    /<span[\s\S]{0,300}WebkitLineClamp: ROW_CLAMP_LINES/,
    "the list row's clamp has moved off its inner span",
  );
});

/** The file with its comments taken out, so a rule about the CODE is not
 *  answered by the prose that explains it. The first draft of the scale check
 *  below failed on its own docblock. */
const READER_CODE = READER.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

test("nothing in the reader is scaled, and no ancestor clips the strip", () => {
  /* Two traps this surface has sprung on three sessions. A sticky element
     inside a `transform: scale(s)` drifts by (1 - s) of the scroll (F34) --
     1,487px over 20,000 at 0.92, which is the drifting navigator he opened
     2026-09-07 with. And an ancestor with `overflow: hidden` becomes the
     scrollport and kills every sticky inside it (F31, F33); `overflow-x: clip`
     does not.

     `group-hover:scale-[1.02]` on a photograph is allowed and is the design
     system's one exception: the picture scales inside a frame that does not
     itself move. It is not an ancestor of anything sticky. */
  const scales = [...READER_CODE.matchAll(/[\w-]*scale-\[[^\]]+\]/g)].map((m) => m[0]);
  assert.deepEqual(
    scales.filter((s) => !s.startsWith("group-hover:")),
    [],
    "something in the reader is scaled; a sticky element inside it will drift",
  );

  const sticky = READER_CODE.indexOf('"sticky top-14');
  assert.ok(sticky > 0, "the strip's sticky wrapper is gone");
  const above = READER_CODE.slice(Math.max(0, sticky - 1500), sticky);
  assert.doesNotMatch(
    above,
    /\boverflow-hidden\b/,
    "an ancestor of the strip clips its overflow, which kills position: sticky",
  );
});
