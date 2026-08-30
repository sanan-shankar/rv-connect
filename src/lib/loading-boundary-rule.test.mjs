/**
 * One rule: a `loading.tsx` may not have another `loading.tsx` below it.
 *
 * A loading file is the Suspense fallback for its own segment AND every
 * segment underneath it, and the OUTER boundary is the one that paints. So a
 * parent's skeleton silently replaces every child's. On 2026-08-30 seventeen
 * skeletons in this app had never once rendered: `letters/loading.tsx` was
 * what you saw when you pressed "Write a letter" (three fake letter cards,
 * then the writing desk), `catchups/loading.tsx` was what you saw on the
 * create form, and `admin/loading.tsx` stood in for all nine admin screens.
 *
 * The fix, everywhere, is a route group: the index page and its skeleton move
 * into `(index)/`, which the URL never sees, and the fallback stops there.
 *
 * This is invisible in review -- both layouts look correct in a file tree, and
 * moving one page back out of its group breaks it in total silence -- so the
 * rule is a test rather than a paragraph. `e2e/loading-fallbacks.spec.ts` is
 * the behavioural half: it reads the actual streamed fallback for four routes.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { relative } from "node:path";
import { ROOT, walk } from "./test-kit.mjs";

const APP = `${ROOT}/src/app`;

test("no loading.tsx shadows another below it", () => {
  const dirs = walk(APP, { match: (name) => name === "loading.tsx" }).map((f) =>
    relative(ROOT, f).replace(/\/loading\.tsx$/, ""),
  );

  const shadowed = [];
  for (const parent of dirs) {
    for (const child of dirs) {
      if (child !== parent && child.startsWith(`${parent}/`)) {
        shadowed.push(`${parent}/loading.tsx hides ${child}/loading.tsx`);
      }
    }
  }

  assert.deepEqual(
    shadowed,
    [],
    `A parent's skeleton paints instead of its children's, so these never render.\n` +
      `Move the parent's page.tsx + loading.tsx into a (index)/ route group:\n  ` +
      shadowed.join("\n  "),
  );
});

test("every loading.tsx sits beside the page it stands in for", () => {
  // A route group holding only a skeleton would be a fallback for a route that
  // does not exist -- the mistake the fix above is one keystroke away from.
  const orphans = walk(APP, { match: (name) => name === "loading.tsx" })
    .map((f) => relative(ROOT, f))
    .filter((f) => {
      const dir = `${ROOT}/${f.replace(/\/loading\.tsx$/, "")}`;
      return !walk(dir, { match: (name) => name === "page.tsx" }).length;
    });

  assert.deepEqual(orphans, [], "loading.tsx with no page beneath it");
});
