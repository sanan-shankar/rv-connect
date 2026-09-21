/**
 * A loading screen draws the words its page never changes.
 *
 * Since 2026-09-21 the skeletons draw the fixed words of the page they stand
 * in for -- the title through the real PageHeader, a section's label, a
 * stat's label, a form's labels, the line under a thread -- and set a
 * button's or a chip's label invisibly so the placeholder is exactly as wide
 * as the control. Nothing about waiting changes those words, so drawing them
 * means the page arriving moves nothing and the title says where the click
 * went from the first frame.
 *
 * The price is drift: a page can change its words and leave its skeleton
 * saying the old ones, which then flash and swap on every visit, or set a
 * placeholder to the width of a word the button no longer says. Nobody sees a
 * skeleton for more than a moment, so nobody would notice. Hence this: every
 * word a skeleton draws must still be said somewhere outside the skeletons.
 *
 * Digits are dropped before comparing, because a few labels carry a sample
 * figure where the page carries data ("Everyone from 2000" stands for
 * `Everyone from {batchYear}`); what must survive is the fixed part.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { relative } from "node:path";
import { ROOT, decomment, walk } from "./test-kit.mjs";

const SRC = `${ROOT}/src`;
const ALL = walk(SRC);

/* The skeletons: every route's loading.tsx and the shared placeholder files. */
const isSkeleton = (f) =>
  /\/loading\.tsx$/.test(f) || /-skeleton\.tsx$/.test(f) || /\/components\/common\/skeleton\.tsx$/.test(f);
const SKELETONS = ALL.filter(isSkeleton);

/* Where a word counts as still said: the app's own source, less the skeletons
   and the lab (a lab room can quote anything). */
const HAYSTACK = ALL.filter((f) => !isSkeleton(f) && !f.includes("/src/app/lab/"))
  .map((f) => readFileSync(f, "utf8"))
  .join("\n")
  .replace(/\d+/g, "");

/** The words a skeleton draws, as it writes them. */
function drawnWords(src) {
  const code = decomment(src);
  const words = new Set();
  // title="Feed", label="Waiting on you", label="Write a letter"
  for (const m of code.matchAll(/\b(?:title|label)="([^"]+)"/g)) words.add(m[1]);
  // labels={["Members", "New this week"]}
  for (const m of code.matchAll(/\blabels=\{\[([^\]]+)\]\}/g)) {
    for (const s of m[1].matchAll(/"([^"]+)"/g)) words.add(s[1]);
  }
  // Literal JSX text: <p ...>Only you and the admins can read this.</p>,
  // <TextSkeleton>Appearance</TextSkeleton>
  for (const m of code.matchAll(/>\s*([^<>{}]*[A-Za-z][^<>{}]*?)\s*</g)) {
    const text = m[1].trim();
    // `=>` inside an attribute arrow function is not text; a word is.
    if (text && !/[=;]/.test(text)) words.add(text);
  }
  return [...words];
}

test("the sweep found the skeletons and the words they draw", () => {
  const total = SKELETONS.reduce((n, f) => n + drawnWords(readFileSync(f, "utf8")).length, 0);
  assert.ok(
    SKELETONS.length >= 35 && total >= 40,
    `found ${SKELETONS.length} skeleton files drawing ${total} words; there were 40 and 60-odd. ` +
      `The sweep has drifted and the rule below is passing over nothing`
  );
});

test("every word a skeleton draws is still said by the app", () => {
  const stale = [];
  for (const f of SKELETONS) {
    for (const word of drawnWords(readFileSync(f, "utf8"))) {
      const fixed = word.replace(/\d+/g, "").trim();
      if (fixed.length < 3) continue;
      if (!HAYSTACK.includes(fixed)) stale.push(`${relative(ROOT, f)}: "${word}"`);
    }
  }
  assert.deepEqual(
    stale,
    [],
    `These skeletons draw words no page says any more. Change them to what the page says now:\n  ` +
      stale.join("\n  ")
  );
});
