import test from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import { ROOT, read, decomment, walk, SKIP_DIRS } from "../../lib/test-kit.mjs";

/* ------------------------------------------------------------------ *
 *  Nothing imports next/link directly. Every link goes through
 *  `common/link.tsx`, which turns prefetching off.
 *
 *  WHY IT IS A TEST. A raw next/link prefetches as it scrolls into view,
 *  and for any signed-in route that is a server render of the (main)
 *  layout nobody asked for. Measured on production over 2026-09-22..29:
 *  27,841 renders of /profile/[id] against ~546 real profile views, a
 *  third of the project's Active CPU, and the reason the owner had to
 *  leave Vercel's Hobby plan. One new directory card or feed row written
 *  with the default import would quietly start it again, and nothing
 *  else would notice until the next bill.
 * ------------------------------------------------------------------ */

const WRAPPER = join(ROOT, "src/components/common/link.tsx");

const files = walk(join(ROOT, "src"), {
  skip: (name) => SKIP_DIRS.includes(name),
}).filter((f) => /\.(ts|tsx)$/.test(f) && f !== WRAPPER);

test("only common/link imports next/link", () => {
  /* Anti-vacuity: a moved directory would make the sweep pass over nothing. */
  assert.ok(
    files.length > 400,
    `the sweep found only ${files.length} source files; it is no longer reading the tree`,
  );

  const offenders = [];
  let wrapped = 0;
  for (const full of files) {
    const rel = full.slice(ROOT.length + 1);
    const src = decomment(read(rel));
    if (/from\s+["']@\/components\/common\/link["']/.test(src)) wrapped += 1;
    /* Any import or re-export from next/link, whatever its shape. */
    if (/(?:import|export)\s[^;]{0,200}?from\s+["']next\/link["']/.test(src)) {
      offenders.push(rel);
    }
  }

  /* The second guard: if the wrapper moved, the count would collapse and
     the offenders list would stay empty for the wrong reason. */
  assert.ok(
    wrapped >= 100,
    `only ${wrapped} files import the app's Link; the sweep is reading the wrong path`,
  );

  assert.deepEqual(
    offenders,
    [],
    "these import next/link directly; use `import Link from " +
      '"@/components/common/link"`, which does not prefetch, or every copy ' +
      "of the link on screen renders a page on the server:\n  " +
      offenders.join("\n  "),
  );
});
