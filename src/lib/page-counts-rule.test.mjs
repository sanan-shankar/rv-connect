import assert from "node:assert/strict";
import test from "node:test";
import { resolve } from "node:path";
import { ROOT, read, decomment, walk, SKIP_DIRS } from "./test-kit.mjs";

/* ------------------------------------------------------------------ *
 *  A count on a page counts the page.
 *
 *  A relation count in a Prisma select (`_count: { select: { likes: true } }`)
 *  compiles to a GROUP BY over the WHOLE child table, joined back on the key:
 *  Postgres never pushes the page's ids into it. So every feed page counted
 *  every comment and like in the database, every Edition every heart, every
 *  Collection page every love (bug audit 3, T1-17, L5-03, T2b-13; captured
 *  from the generated client and EXPLAINed). src/lib/page-counts.ts asks the
 *  same questions with the page's ids in the WHERE.
 *
 *  The sweep below holds the property, not the six sites that were fixed: a
 *  relation count anywhere in src/ fails unless it is listed here with the
 *  reason it is not a page's count. The lab is skipped: it is the dev wing,
 *  and one room quotes the old letters query in a string.
 * ------------------------------------------------------------------ */

const ALLOWED = {
  "src/app/catchups/join/[token]/page.tsx":
    "one group's head count on the invitation page, read once per invite opened",
  "src/app/(main)/messages/(index)/page.tsx":
    "the message count on a member's own threads, over a table of a few dozen rows",
  "src/lib/batch-catchups.ts":
    "a batch group's head count against the floor: one group at signup, and the nightly tick's pass over every group still without a Catch-up, which needs them all",
  "src/app/(main)/admin/catchups/(index)/page.tsx": "an admin page; whole-table admin reads are T7a-14's row",
  "src/app/(main)/admin/catchups/[catchupId]/page.tsx": "an admin page; whole-table admin reads are T7a-14's row",
};

const RELATION_COUNT = /_count:\s*\{\s*select\s*:/;

const files = walk(resolve(ROOT, "src"), {
  skip: (name, full) => SKIP_DIRS.includes(name) || full === resolve(ROOT, "src/app/lab"),
  match: (name) => /\.tsx?$/.test(name),
}).map((full) => full.slice(ROOT.length + 1));

test("the sweep still reads the tree it guards", () => {
  assert.ok(files.length > 300, `only ${files.length} source files found; the walk has drifted`);
});

test("no page counts a whole table to show a number for its own rows", () => {
  const offenders = files.filter((f) => !ALLOWED[f] && RELATION_COUNT.test(decomment(read(f))));
  assert.deepEqual(
    offenders,
    [],
    "a relation `_count` aggregates its whole child table on every call; count the page's rows " +
      "with src/lib/page-counts.ts instead, or list the file in ALLOWED with the reason:\n  " +
      offenders.join("\n  ")
  );
});

test("every allowed file still holds the count it is excused for", () => {
  for (const f of Object.keys(ALLOWED)) {
    assert.ok(files.includes(f), `${f} is excused but no longer exists`);
    assert.match(decomment(read(f)), RELATION_COUNT, `${f} is excused but no longer counts a relation`);
  }
});

test("every count in page-counts.ts is restricted to the ids it was given", () => {
  const src = decomment(read("src/lib/page-counts.ts"));
  const counts = [...src.matchAll(/\.groupBy\(\{([\s\S]*?)\n\s*\}\)/g)].map((m) => m[1]);
  assert.ok(counts.length >= 6, `only ${counts.length} grouped counts found in page-counts.ts`);
  for (const body of counts) {
    assert.match(body, /\{\s*in:\s*\w+\s*\}/, `a count in page-counts.ts is not keyed on an id list:\n${body}`);
  }
});
