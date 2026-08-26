import assert from "node:assert/strict";
import test from "node:test";
import { read } from "./test-kit.mjs";

/* ------------------------------------------------------------------ *
 *  The directory: five ways a count and its list disagreed.
 *
 *  Every finding here has the same shape -- a number on screen produced
 *  by one query and a list produced by another, with a rule in one and
 *  not the other. So what is pinned is that the two halves share their
 *  rule, not that either half returns a particular row.
 *
 *  Read from source rather than imported: `where.ts` resolves `@/lib/...`,
 *  and the unit gate runs `node <file>.test.mjs` with no resolver.
 * ------------------------------------------------------------------ */

const code = (src) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

const WHERE = code(read("src/app/(main)/directory/where.ts"));
const PAGE = code(read("src/app/(main)/directory/page.tsx"));
const MAP = code(read("src/components/directory/alumni-map.tsx"));
const CLIENT = read("src/components/directory/directory-client.tsx");
const SCHEMA = read("prisma/schema.prisma").replace(/^\s*\/\/.*$/gm, "");

/* ---- C-093: accountType is decided once ------------------------- */

test("C-093: nothing assigns where.accountType twice", () => {
  /* The faculty tile set it and the type filter overwrote it, so
     year=faculty + type=alumni silently resolved to alumni while both filter
     tokens stayed on screen. Counted, not detected: one assignment is the
     fold, two is the clobber coming back. */
  const assignments = [...WHERE.matchAll(/where\.accountType\s*=/g)];
  assert.equal(
    assignments.length,
    1,
    `where.accountType is assigned ${assignments.length} times; the later one wins silently`
  );
  assert.match(WHERE, /accountTypes\.reduce\(/, "the assignments are not folded into an intersection");
});

test("C-093: the fold's inputs all come from the shared pair", () => {
  const pushes = [...WHERE.matchAll(/accountTypes\.push\(([^)]+)\)/g)].map((m) => m[1].trim());
  assert.ok(pushes.length >= 3, `only ${pushes.length} accountType inputs; the fold has drifted`);
  for (const p of pushes) {
    assert.match(
      p,
      /^(FACULTY_TYPES|NON_FACULTY_TYPES|\["alumnus"\])$/,
      `an accountType input is written out by hand as ${p} instead of using the named pair`
    );
  }
});

/* ---- C-095: a batch filter and a batch count agree -------------- */

test("C-095: the batchYear branch excludes faculty, like the tile count does", () => {
  const branch = WHERE.slice(WHERE.indexOf("const batchYear:"), WHERE.indexOf("if (filters.city)"));
  assert.match(branch, /where\.batchYear = batchYear;/, "the batchYear branch moved");
  assert.match(
    branch,
    /accountTypes\.push\(NON_FACULTY_TYPES\)/,
    "a batch filter still admits teachers, so the tile's count and the tile's list disagree"
  );
  // And the count it has to agree with really does exclude them.
  assert.match(
    PAGE,
    /groupBy\(\{[\s\S]{0,400}?accountType: \{ notIn: \["teacher", "ex_teacher"\] \}/,
    "the batch tile count no longer excludes faculty; the pair has to move together"
  );
});

/* ---- C-099: the page and the where read the year the same way --- */

test("C-099: the page does not parse the year a second time", () => {
  assert.match(PAGE, /parseDirectoryYears\(filters\)/, "the page derives its own year values");
  assert.doesNotMatch(
    PAGE,
    /Number\(params\.year(From|To)?\)/,
    "a bare Number() reading of a year param is back, and it accepts what the where rejects"
  );
  assert.match(WHERE, /export function parseDirectoryYears\(/, "the shared parser is gone");
  // The shared parser is the only place the raw strings are read.
  /* Sliced to the next top-level `export`, not brace-matched: this signature
     carries an object RETURN TYPE, so "the first `}` on its own line" closes
     the annotation and every check below then reads an empty body and passes.
     The same trap cost a round in auth-flow-rule.test.mjs. */
  const fn = WHERE.slice(WHERE.indexOf("export function parseDirectoryYears("));
  const nextExport = fn.indexOf("\nexport ", 10);
  const body = nextExport === -1 ? fn : fn.slice(0, nextExport);
  assert.ok(body.split("\n").length > 5, `the parser scraped to ${body.split("\n").length} lines`);
  // Longest alternative first: `year` matches the prefix of `yearFrom`, so the
  // naive order reports all three reads as "year" and the check passes blind.
  const reads = [...body.matchAll(/filters\.(yearFrom|yearTo|year)\b/g)].map((m) => m[1]);
  assert.deepEqual(
    [...new Set(reads)].sort(),
    ["year", "yearFrom", "yearTo"],
    "the shared parser does not cover all three year inputs"
  );
});

/* ---- C-092: every batch-desc sort puts nulls last --------------- */

test("C-092: no batchYear desc sort is left ordering NULLs first", () => {
  /* Postgres puts NULLs FIRST on a DESC column, so a plain
     `{ batchYear: "desc" }` leads with everyone who has no batch year at all.
     Swept across the directory's three files rather than pinned to the one
     query that was wrong, because that is how this one got missed: the M38
     fix landed on directoryOrderBy and its sibling never got it. */
  let seen = 0;
  for (const [name, src] of [["where.ts", WHERE], ["page.tsx", PAGE]]) {
    for (const m of src.matchAll(/batchYear:\s*(\{[^}]*\}|"desc")/g)) {
      const spec = m[1];
      if (!/desc/.test(spec)) continue;
      seen++;
      assert.match(
        spec,
        /nulls: "last"/,
        `${name}: a batchYear desc sort (${spec}) does not declare nulls:"last"`
      );
    }
  }
  assert.ok(seen >= 3, `only found ${seen} batchYear desc sorts; the sweep has gone blind`);
});

/* ---- C-097: the surface for finding people records what is asked - */

test("C-097: a directory search is logged, with its result count", () => {
  assert.match(
    PAGE,
    /logSearch\(\{[\s\S]{0,40}?scope: "directory"/,
    "the one surface whose job is finding somebody records nothing"
  );
  assert.match(PAGE, /after\(\(\) => logSearch/, "logged outside after(), which races the response");
  assert.match(PAGE, /results: resultCount/, "logged without the count, so a failed search looks like a hit");
  // And the comment that said this surface filters in the browser is gone.
  assert.doesNotMatch(
    read("src/lib/search-log.ts"),
    /the directory filters\s*\n?\s*\*?\s*in the browser/,
    "the false premise that kept this scope unwritten is back"
  );
});

test("C-097: every declared SearchScope has a writer", () => {
  /* DERIVED from the union, not a list: the directory scope existed in the
     type and in the analytics grouping for months with nothing writing it. */
  const log = read("src/lib/search-log.ts");
  const union = log.match(/export type SearchScope =([^;]+);/);
  assert.ok(union, "the SearchScope union moved");
  const scopes = [...union[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);
  assert.ok(scopes.length >= 4, `only ${scopes.length} scopes; the union has shrunk unexpectedly`);
  const writers = [
    "src/app/(main)/feed/page.tsx",
    "src/app/(main)/directory/page.tsx",
    "src/app/api/users/search/route.ts",
    "src/app/api/places/search/route.ts",
  ]
    .map((f) => code(read(f)))
    .join("\n");
  for (const scope of scopes) {
    assert.match(
      writers,
      new RegExp(`logSearch\\(\\{[\\s\\S]{0,120}?scope: "${scope}"`),
      `SearchScope "${scope}" is declared and grouped in the analytics, but nothing writes it`
    );
  }
});

/* ---- C-098: a pin's escape link reaches everyone it counted ----- */

test("C-098: the drilldown links by the whole grid cell", () => {
  assert.match(MAP, /cities: string\[\]/, "a pin no longer carries the cities in its cell");
  assert.match(
    MAP,
    /pin\.cities\.map\(\(c\) => `city=\$\{encodeURIComponent\(c\)\}`\)/,
    "the escape link names one city while the count aggregates several"
  );
  assert.doesNotMatch(
    MAP,
    /city=\$\{encodeURIComponent\(pin\.city\)\}/,
    "the single-city link is back"
  );
  // buildPins has to actually fill it.
  assert.match(PAGE, /cities: \[city\]/, "a new pin does not seed its city list");
  assert.match(
    PAGE,
    /existing\.cities\.includes\(city\)/,
    "a second city landing in the same cell is not recorded"
  );
});

test("C-098: a drilldown with no destination offers no link", () => {
  assert.doesNotMatch(
    MAP,
    /drill\.href \?\? "\/directory"/,
    'the unmapped bucket falls back to /directory, which lists none of its people'
  );
  assert.match(MAP, /!namesLocked && drill\?\.href &&/, "the link no longer requires a real destination");
});

/* ---- and the multi-city filter the link depends on -------------- */

test("C-098: buildDirectoryWhere accepts the several cities the link sends", () => {
  assert.match(WHERE, /city\?: string \| string\[\];/, "the filter type still takes one city");
  const branch = WHERE.slice(WHERE.indexOf("if (filters.city)"), WHERE.indexOf("if (filters.profession)"));
  assert.match(branch, /Array\.isArray\(filters\.city\)/, "the city branch cannot read a list");
  assert.match(branch, /flatMap/, "the variants of each city are not folded together");
  assert.match(branch, /new Set\(/, "the targets are not de-duplicated across cities");
});

/* ---- the Profession facet: hidden now, owed later --------------- */

test("the Profession facet stays hidden until a profession tag exists", () => {
  /* Owner, 2026-08-26: profession filtering IS wanted long term. The plan is
     to run every workplace + jobTitle pair through an LLM at ~150 members,
     derive the buckets, and write each member a backend tag
     (docs/planning/FEATURES.md section 2).

     Until that column exists the facet is hidden, because the control filtered
     `User.workplace` by exact equality against an 18-value list that the
     deleted onboarding Industry select used to write. Measured on the live
     database that day: 0 of 63 members matched, while 28 had a workplace --
     the column now holds a free-text ORGANISATION and the role lives in
     jobTitle, so no single column is filterable.

     This test is the reminder. The day a profession column lands in the
     schema, it FAILS and tells you to put the control back. */
  const tagShipped = /profession/i.test(SCHEMA);
  const facetRendered = /label="Profession"/.test(CLIENT);

  if (tagShipped) {
    assert.ok(
      facetRendered,
      "A profession field now exists in schema.prisma, so the tag has shipped -- " +
        "put the Profession facet back in renderPrimaryFacets (directory-client.tsx), " +
        "restore its arm in activeFacetCount, and point where.ts at the TAG rather than " +
        "at `where.workplace = <exact value>`, which was never reusable for it."
    );
  } else {
    assert.ok(
      !facetRendered,
      "The Profession facet is being rendered again, but nothing writes a profession: " +
        "it filters workplace by exact equality and matches nobody. Either ship the tag " +
        "column first, or leave the control hidden. See docs/planning/FEATURES.md section 2."
    );
  }
});

test("the profession filter arm survives for bookmarked links", () => {
  /* Two reasons this stays even with the control hidden. A member with an old
     ?profession= bookmark must still get a coherent (empty) page with a chip
     they can clear, rather than a silently ignored parameter. And C-098's test
     above slices WHERE using `indexOf("if (filters.profession)")` as its END
     boundary -- delete this arm and that slice runs to end-of-file and stops
     testing what it claims to. If the arm is ever removed, repoint that
     boundary in the same commit. */
  assert.match(WHERE, /if \(filters\.profession\)/, "the profession arm is gone; C-098's slice boundary above now points at nothing");
});
