import assert from "node:assert/strict";
import test from "node:test";
import { relative } from "node:path";

import { ROOT, read, decomment, walk } from "./test-kit.mjs";

/* ------------------------------------------------------------------ *
 *  Development and the owner's own use stay out of the analytics.
 *
 *  Owner, 2026-09-15: the OS and platform charts were "wrong and
 *  imbalanced because of my machine". Local dev and every QA script sign
 *  in against the production database, so they wrote visits like anyone
 *  else. src/lib/stats-exclusion.ts fixes that in two layers; these pin
 *  both, because the next chart added to the room is exactly where an
 *  unfiltered query would quietly bring the skew back.
 *
 *  Source-reading, like admin-rule.test.mjs: the queries run against a
 *  live database and cannot be called from the unit gate.
 * ------------------------------------------------------------------ */

const ACTIVITY = /prisma\.(visit|searchLog|contentView)\.|"(Visit|SearchLog|ContentView)"/g;
const HELPER = decomment(read("src/lib/stats-exclusion.ts"));
const ANALYTICS = decomment(read("src/lib/admin-analytics.ts"));

test("activity is recorded only by the production deployment", () => {
  assert.match(HELPER, /process\.env\.VERCEL_ENV === "production"/);
  for (const file of ["src/lib/last-seen.ts", "src/lib/search-log.ts", "src/lib/content-view.ts"]) {
    assert.match(
      decomment(read(file)),
      /statsWritesEnabled\(\)/,
      `${file} writes activity without asking statsWritesEnabled(), so localhost counts again`
    );
  }
});

test("every activity read in the analytics room leaves the excluded accounts out", () => {
  const sites = [...ANALYTICS.matchAll(ACTIVITY)];
  /* Counted, so a regex that silently matches nothing cannot pass. */
  assert.ok(sites.length >= 29, `expected at least 29 activity reads, found ${sites.length}`);

  for (const m of sites) {
    const rest = ANALYTICS.slice(m.index + m[0].length);
    /* A Prisma call runs to the next call or the end of its Promise.all; a raw
       statement to its first GROUP BY, ORDER BY, LIMIT or closing backtick. */
    const end = m[1] ? rest.search(/prisma\.|\]\);/) : rest.search(/GROUP BY|ORDER BY|LIMIT|`/);
    const statement = rest.slice(0, end < 0 ? undefined : end);
    const line = ANALYTICS.slice(0, m.index).split("\n").length;
    assert.match(
      statement,
      /counted\.(visit|search|user\()/,
      `admin-analytics.ts (decommented) line ${line}: ${m[0]} is read without statsFilter(), ` +
        "so the owner's own machine counts again"
    );
  }
});

test("no file outside the known ones reads the activity tables", () => {
  /* A new room or loader elsewhere would bypass the check above entirely. */
  const known = new Set([
    "src/lib/admin-analytics.ts",
    "src/lib/stats-exclusion.ts",
    "src/lib/last-seen.ts",
    "src/lib/search-log.ts",
    "src/lib/content-view.ts",
    "src/lib/retention.ts",
  ]);
  const strays = walk(`${ROOT}/src`)
    .map((f) => relative(ROOT, f))
    .filter((f) => !known.has(f) && new RegExp(ACTIVITY.source).test(decomment(read(f))));
  assert.deepEqual(strays, [], "read activity through statsFilter() and add the file to this list");
});
