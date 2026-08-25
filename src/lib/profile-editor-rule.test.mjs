import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

/* ------------------------------------------------------------------ *
 *  The pen: the only live editor of the profile columns.
 *
 *  Which is exactly why its bounds mattered more than the schema's.
 *  `updateProfileField` is what a member's edit actually reaches, and
 *  every bound in it was typed out locally and had drifted from
 *  `profileSchema` -- so the numbers that shipped were the loose ones
 *  and the shared ones were unreachable. What is pinned here is that
 *  no bound is written twice.
 * ------------------------------------------------------------------ */

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const read = (p) => readFileSync(resolve(ROOT, p), "utf8");
const code = (src) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

const ACTIONS = code(read("src/components/profile/profile-actions.ts"));

/* ---- C-047/C-048/C-172: one bound per column -------------------- */

test("no column bound is written out in the pen", () => {
  /* The three that had drifted, by their exact old values: jobTitle/workplace
     at 120 against the schema's 100, admissionNumber at 100000 against 10000,
     and a flat year ceiling of 2100 against yearField's valleyYear()+ahead. */
  for (const [literal, what] of [
    ["120", "the jobTitle/workplace length"],
    ["100000", "the admission-number ceiling"],
    ["2100", "the year ceiling"],
    ["4000", "the About length"],
    ["200", "the Subjects length"],
  ]) {
    assert.doesNotMatch(
      ACTIONS,
      new RegExp(`>\\s*${literal}\\b|YEAR_MAX = ${literal}`),
      `${what} is typed out here again instead of coming from profileSchema`
    );
  }
});

test("every bounded field is checked against the shared schema", () => {
  /* Counted, not detected: a sweep that merely finds no BAD literal also
     passes against a file where the checks have been deleted outright. */
  const calls = [...ACTIONS.matchAll(/outsideSchemaBound\(/g)];
  assert.ok(
    calls.length >= 5,
    `only ${calls.length} fields are bounded by the schema; the rest are unchecked or local again`
  );
  assert.match(
    ACTIONS,
    /profileSchema\.shape as Record<string, ZodTypeAny \| undefined>/,
    "the bound helper no longer reads profileSchema"
  );
});

test("the schema really carries the bounds the pen defers to", () => {
  /* The deferral is only worth anything while the schema is the stricter one.
     If somebody loosens profileSchema, this is where it shows up. */
  const v = code(read("src/lib/validators.ts"));
  const shape = v.slice(v.indexOf("export const profileSchema"));
  assert.match(shape, /workplace: z\.string\(\)\.max\(100\)/, "workplace's shared cap moved");
  assert.match(shape, /jobTitle: z\.string\(\)\.max\(100\)/, "jobTitle's shared cap moved");
  assert.match(shape, /admissionNumber: z\.number\(\)\.int\(\)\.min\(0\)\.max\(10000\)/, "the admission cap moved");
  assert.match(shape, /batchYear: yearField\(\{ ahead: 7/, "the batch year no longer tracks the clock");
});

test("C-172: the name input cannot refuse a name signup accepted", () => {
  const src = read("src/components/profile/letterhead-profile.tsx");
  assert.match(src, /maxLength=\{FULL_NAME_MAX\}/, "the name box has a hand-typed length again");
  assert.doesNotMatch(src, /maxLength=\{80\}/, "the 80-character lockout is back");
});

/* ---- C-174: a crafted argument is refused, not thrown on -------- */

test("C-174: every erased-type argument is checked before it is used", () => {
  /* A "use server" export is a network-callable POST and its parameter types
     are erased, so `raw.trim()` on a number threw a 500 digest where a refusal
     belonged. Each site is named, because they were found one at a time. */
  const sites = [
    ["src/components/profile/profile-actions.ts", /typeof raw !== "string"/, "updateProfileField's value"],
    ["src/components/posts/report-action.ts", /typeof reason !== "string"/, "a report's reason"],
    ["src/components/settings/actions.ts", /typeof passwordRaw === "string"/, "the deletion re-auth password"],
    ["src/app/(main)/directory/actions.ts", /Number\.isFinite\(loaded\)/, "the directory's page offset"],
    ["src/lib/admin-people-query.ts", /Number\.isFinite\(loaded\)/, "the admin list's page offset"],
  ];
  for (const [file, pattern, what] of sites) {
    assert.match(code(read(file)), pattern, `${what} is used without checking what arrived`);
  }
  // Both report paths, not just the first: they are a matched pair.
  const reports = code(read("src/components/posts/report-action.ts"));
  assert.equal(
    [...reports.matchAll(/typeof reason !== "string"/g)].length,
    2,
    "only one of the two report paths guards its reason"
  );
});

/* ---- C-045: autosaves land in the order they were made ---------- */

test("C-045: the save queue is ordered, not merely counted", () => {
  const pen = code(read("src/components/profile/pen.tsx"));
  assert.match(pen, /const queue = useRef<Promise<unknown>>\(Promise\.resolve\(\)\);/, "there is no queue");
  assert.match(pen, /queue\.current\.then\(\(\) => fn\(\)\)/, "runs are not chained onto the queue");
  assert.match(pen, /queue\.current = mine\.catch\(\(\) => \{\}\);/, "a failed save would poison the queue");
});

test("C-045: a failed places save reconverges with the database", () => {
  const src = code(read("src/components/profile/letterhead-profile.tsx"));
  const fn = src.slice(src.indexOf("function commitPlaces"));
  const body = fn.slice(0, fn.indexOf("\n  }"));
  assert.match(body, /router\.refresh\(\);/, "nothing re-reads the list");
  assert.doesNotMatch(
    body,
    /if \(!result\.error\) router\.refresh\(\)/,
    "a refused wipe-and-recreate leaves the screen showing a list nobody has"
  );
});
