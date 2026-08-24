import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { decodeKeyset, encodeKeyset, keysetWhere } from "./keyset.ts";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const decomment = (src) =>
  src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`\\])\/\/.*$/gm, "$1");

/* Audits C-005 / C-124 / C-162 / C-171. Prisma's `cursor: { id }` names a ROW,
 * and answers nothing at all when that row has left the filtered set -- proved
 * on this stack against the real database: a cursor on a hard-deleted id and a
 * cursor on a row the `where` excludes both returned zero rows, no error. So
 * the feed, the comments and the bell all ended their scroll silently when the
 * post at the page boundary was deleted, hidden, or lost its author to a
 * block. A cursor that carries the sort key instead cannot have that problem,
 * because there is no row for it to be missing. */

const row = (ms, id) => ({ createdAt: new Date(ms), id });

test("a cursor survives the round trip", () => {
  const r = row(1_756_000_000_000, "cmsabc123");
  const back = decodeKeyset(encodeKeyset(r));
  assert.equal(back.createdAt.getTime(), r.createdAt.getTime());
  assert.equal(back.id, r.id);
});

test("an id containing the separator survives", () => {
  // Only the FIRST bar separates, so nothing about an id can break a cursor.
  const back = decodeKeyset(encodeKeyset(row(1, "a|b|c")));
  assert.equal(back.id, "a|b|c");
});

test("anything that is not a cursor reads as no cursor", () => {
  for (const junk of [null, undefined, "", "|", "abc", "abc|x", "|x", "12", "12|", -1, {}, "-5|x", "1.5|x"]) {
    assert.equal(decodeKeyset(junk), null, `${JSON.stringify(junk)} was accepted as a cursor`);
  }
});

test("no cursor means no extra filter", () => {
  assert.deepEqual(keysetWhere(null), {});
  assert.deepEqual(keysetWhere(null, "asc"), {});
});

test("the fragment seeks strictly past the point, in both directions", () => {
  const at = row(1000, "m");
  const newestFirst = keysetWhere(at, "desc");
  assert.deepEqual(newestFirst, {
    OR: [{ createdAt: { lt: at.createdAt } }, { createdAt: at.createdAt, id: { lt: "m" } }],
  });
  const oldestFirst = keysetWhere(at, "asc");
  assert.deepEqual(oldestFirst, {
    OR: [{ createdAt: { gt: at.createdAt } }, { createdAt: at.createdAt, id: { gt: "m" } }],
  });
});

test("the tiebreak is what makes a shared millisecond total", () => {
  /* Postgres stores these columns at timestamp(3) -- the same precision a JS
   * Date carries -- so two rows written in the same millisecond are ordered by
   * id alone. Without the second arm they would repeat or vanish at a page
   * boundary. Evaluated here as the database would evaluate it. */
  const at = row(1000, "m");
  const matches = (r, w) =>
    w.OR.some((arm) =>
      "id" in arm
        ? r.createdAt.getTime() === arm.createdAt.getTime() &&
          (arm.id.lt !== undefined ? r.id < arm.id.lt : r.id > arm.id.gt)
        : arm.createdAt.lt !== undefined
          ? r.createdAt < arm.createdAt.lt
          : r.createdAt > arm.createdAt.gt
    );

  const w = keysetWhere(at, "desc");
  assert.equal(matches(row(1000, "n"), w), false, "the cursor row's neighbour above repeated");
  assert.equal(matches(row(1000, "m"), w), false, "the cursor row itself repeated");
  assert.equal(matches(row(1000, "l"), w), true, "a row tied on the millisecond was skipped");
  assert.equal(matches(row(999, "z"), w), true);
  assert.equal(matches(row(1001, "a"), w), false);
});

/* The property, swept rather than listed: a query ordered by time must not
 * page by naming a row. The two list queries that legitimately still do --
 * the directory and the admin people list -- are ordered for a person to read
 * (name, batch) or carry the audit-M39 offset recovery, and neither leads its
 * orderBy with createdAt. */

test("no time-ordered query pages by naming a row", () => {
  const files = execSync(
    "git grep -l 'cursor: { id' -- src ':!src/generated' ':!*.test.*'",
    { cwd: ROOT, encoding: "utf8" }
  )
    .split("\n")
    .filter(Boolean);

  for (const f of files) {
    const src = decomment(readFileSync(resolve(ROOT, f), "utf8"));
    // Every findMany in the file, roughly: from the call to its closing `});`.
    for (const m of src.matchAll(/findMany\(\{[\s\S]*?\n\s*\}\)/g)) {
      const q = m[0];
      if (!/cursor:\s*\{\s*id/.test(q)) continue;
      assert.ok(
        !/orderBy:\s*\[?\s*\{\s*createdAt/.test(q),
        `${f} pages a time-ordered query by naming a row; use keyset.ts`
      );
    }
  }
});
