import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { relative, resolve } from "node:path";
import { ROOT, decomment, walk } from "./test-kit.mjs";

/* ------------------------------------------------------------------ *
 *  No control may exist only for a pointer that can hover.
 *
 *  Tailwind 4 puts every `hover:` and `group-hover:` style inside
 *  `@media (hover: hover)`, so `opacity-0 group-hover:opacity-100` on a
 *  button is a button a touch screen never shows: an invisible target where
 *  a tap still lands. On a Catch-up answer that was the only way to take a
 *  wrong photograph off before the Edition went out (bug audit 3, T3-19), and
 *  the owner's estimate is that most members are on a phone.
 *
 *  The fix has two accepted forms, and this sweep reads both as safe: keep
 *  the reveal for hovering pointers only (`[@media(hover:hover)]:opacity-0
 *  [@media(hover:hover)]:group-hover:opacity-100`, the People door's form),
 *  or keep the control off a touch screen altogether (`hidden` with a
 *  `[@media(pointer:fine)]:` display). A reveal that cannot be pressed
 *  (`pointer-events-none`: a caption, a scrim, a tooltip) is decoration, and
 *  hiding decoration from a phone loses nothing a tap could reach.
 * ------------------------------------------------------------------ */

/** Hover-only on purpose, and why. Exact counts: one more is a new offender,
 *  one fewer means the fix landed and the entry must go. */
const KNOWN = {
  "src/components/catchups/index/catchup-card.tsx": {
    count: 1,
    why: "the archive control is drawn only when `!coarse` (a fine pointer), a guard the class list cannot show",
  },
  "src/components/profile/contacts-editor.tsx": {
    count: 1,
    why: "a contact row's remove: T3-19's shape outside Catch-ups (L7's lead, listed 2026-10-30 by T3-19), open until its own fix lands",
  },
};

const UNCONDITIONAL_HIDE = /(?:^|[\s"'`{])opacity-0(?=[\s"'`}]|$)/;
const HOVER_REVEAL = /group-hover(?:\/[\w-]+)?:opacity-100/;
const GUARD = /\(hover:\s*hover\)|pointer:\s*(?:coarse|fine)|any-hover/;
const DECORATIVE = /pointer-events-none/;

/** Every className value in `src`: a quoted string, or a balanced `{...}`
 *  expression (a `cn(...)` call, a template, a ternary). */
function classNames(src) {
  const out = [];
  for (const m of src.matchAll(/className=/g)) {
    let i = m.index + m[0].length;
    const open = src[i];
    if (open === '"' || open === "'") {
      const end = src.indexOf(open, i + 1);
      out.push(src.slice(i, end + 1));
      continue;
    }
    if (open !== "{") continue;
    let depth = 0;
    let quote = null;
    const start = i;
    for (; i < src.length; i++) {
      const c = src[i];
      if (quote) {
        if (c === "\\") i++;
        else if (c === quote) quote = null;
        continue;
      }
      if (c === '"' || c === "'" || c === "`") quote = c;
      else if (c === "{") depth++;
      else if (c === "}" && --depth === 0) break;
    }
    out.push(src.slice(start, i + 1));
  }
  return out;
}

/** The className values in `src` that hide a pressable control until a hover
 *  a touch screen cannot make. */
function hoverOnlyControls(src) {
  return classNames(src).filter(
    (cls) => UNCONDITIONAL_HIDE.test(cls) && HOVER_REVEAL.test(cls) && !GUARD.test(cls) && !DECORATIVE.test(cls)
  );
}

test("no control in src/components appears only on hover", () => {
  const offenders = [];
  let reveals = 0;
  for (const full of walk(resolve(ROOT, "src/components"), { match: /\.tsx$/ })) {
    const src = decomment(readFileSync(full, "utf8"));
    reveals += classNames(src).filter((cls) => HOVER_REVEAL.test(cls)).length;
    const rel = relative(ROOT, full);
    const found = hoverOnlyControls(src);
    const known = KNOWN[rel];
    if (known && found.length === known.count) continue;
    if (known) offenders.push(`${rel}: ${found.length} hover-only control(s), the exemption says ${known.count}`);
    else offenders.push(...found.map((cls) => `${rel}: ${cls.slice(0, 140)}`));
  }
  assert.ok(reveals >= 8, `only ${reveals} hover reveals found; the sweep has stopped seeing className`);
  assert.deepEqual(
    offenders,
    [],
    `a control a phone cannot see (wrap the reveal in [@media(hover:hover)]:, or keep it off a touch screen):\n${offenders.join("\n")}`
  );
});

test("the sweep tells a hidden control from a guarded one and from decoration", () => {
  const flagged = [
    // T3-19 as it shipped.
    `<SpringPress className="absolute right-1.5 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100" />`,
    `<button className={cn("p-1.5 opacity-0", "group-hover/row:opacity-100")} />`,
    "<a className={`ml-auto opacity-0 ${x} group-hover:opacity-100`} />",
  ];
  for (const src of flagged) assert.equal(hoverOnlyControls(src).length, 1, `missed: ${src}`);

  const passed = [
    // The People door's form.
    `<button className="[@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover/row:opacity-100" />`,
    // Kept off a touch screen.
    `<CarouselArrow className={cn("hidden", "opacity-0 group-hover/carousel:opacity-100", "[@media(pointer:fine)]:grid")} />`,
    // A caption: nothing to press.
    `<div className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100" />`,
    // A disabled state, not a reveal.
    `<button className={cn("group-hover:opacity-100", disabled && "!opacity-0")} />`,
    // Visible to begin with.
    `<button className="opacity-60 group-hover:opacity-100" />`,
  ];
  for (const src of passed) assert.equal(hoverOnlyControls(src).length, 0, `flagged: ${src}`);
});

test("an answer's photograph can be taken off on a phone", () => {
  const src = decomment(readFileSync(resolve(ROOT, "src/components/catchups/answer/photo-attachments.tsx"), "utf8"));
  const remove = classNames(src).find((cls) => /right-1\.5 top-1\.5/.test(cls));
  assert.ok(remove, "the remove control's class is not where this test looks");
  assert.match(remove, /\[@media\(hover:hover\)\]:opacity-0/, "the remove control is hidden from a touch screen again (T3-19)");
  assert.doesNotMatch(remove, UNCONDITIONAL_HIDE);
});
