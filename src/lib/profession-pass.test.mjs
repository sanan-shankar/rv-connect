import test from "node:test";
import assert from "node:assert/strict";

import {
  readVerdicts,
  planRow,
  undoneByNextSave,
  guardedWriteRows,
  GUARDED_WRITE,
} from "./profession-pass.ts";

/* ------------------------------------------------------------------ *
 *  The rules that guard members' own words, held where a test can reach
 *  them. Since 2026-10-01 the profession pass rewrites jobTitle and
 *  workplace as well as the tags, and before this file nothing but a dry
 *  run stood between a careless verdict and a member's profile.
 * ------------------------------------------------------------------ */

const KNOWN = new Set(["a", "b"]);
const row = (jobTitle, workplace, tags = [], source = null) => ({ jobTitle, workplace, tags, source });

test("a verdict leaves a half alone, empties it, or writes it -- three different things", () => {
  const { verdicts, problems } = readVerdicts(
    [
      { id: "a", tags: ["law"] },
      { id: "b", tags: [], jobTitle: "  Hedge   Fund Analyst ", workplace: null },
    ],
    KNOWN
  );
  assert.deepEqual(problems, []);
  assert.equal("jobTitle" in verdicts[0], false, "absent must stay absent -- it means leave it");
  assert.equal(verdicts[1].jobTitle, "Hedge Fund Analyst");
  assert.equal(verdicts[1].workplace, null);
  /* An empty string is stored as NULL, the way every editor of the column
     stores it, so "" and null cannot mean two different things. */
  assert.equal(readVerdicts([{ id: "a", tags: [], workplace: "  " }], KNOWN).verdicts[0].workplace, null);
});

test("anything the profile could not hold refuses the batch", () => {
  const bad = [
    { id: "a", tags: [], jobTitle: "x".repeat(101) },
    { id: "b", tags: [], workplace: "two\nlines" },
  ];
  assert.equal(readVerdicts(bad, KNOWN).problems.length, 2);
  assert.equal(readVerdicts([{ id: "a", tags: [], jobTitle: 7 }], KNOWN).problems.length, 1);
});

test("the ways an answer lands on the wrong person, or outside the vocabulary, are refused", () => {
  const cases = [
    [{ id: "z", tags: [] }],
    [{ id: "a", tags: [] }, { id: "a", tags: [] }],
    [{ id: "a", tags: ["astronaut"] }],
    [{ id: "a", tags: ["law", "finance", "business", "design", "arts"] }],
    [{ id: "a" }],
    [{ tags: [] }],
  ];
  for (const entries of cases) assert.ok(readVerdicts(entries, KNOWN).problems.length > 0, JSON.stringify(entries));
  assert.equal(readVerdicts({ nope: [] }, KNOWN).problems.length, 1);
  assert.deepEqual(readVerdicts({ people: [{ id: "a", tags: ["law"] }] }, KNOWN).problems, []);
});

test("a row whose words changed since the pick is left alone, tags and all", () => {
  const [v] = readVerdicts([{ id: "a", tags: ["law"], jobTitle: "Lawyer" }], KNOWN).verdicts;
  const plan = planRow(row("Advocate", null), { jobTitle: "lawyer", workplace: null }, v);
  assert.equal(plan.kind, "moved");
});

test("NULL and an empty string are different words to the guard", () => {
  const [v] = readVerdicts([{ id: "a", tags: ["law"] }], KNOWN).verdicts;
  assert.equal(planRow(row("Lawyer", ""), { jobTitle: "Lawyer", workplace: null }, v).kind, "moved");
});

test("the source recorded is the text the row will hold, tidied", () => {
  const [v] = readVerdicts([{ id: "a", tags: ["student"], jobTitle: "Student", workplace: "Krea University" }], KNOWN).verdicts;
  const plan = planRow(row("College", "Krea"), { jobTitle: "College", workplace: "Krea" }, v);
  assert.equal(plan.kind, "change");
  assert.equal(plan.after.source, '["Student","Krea University"]');
  assert.deepEqual(plan.before, row("College", "Krea"));
});

test("a tags-only answer keeps the member's words exactly", () => {
  const [v] = readVerdicts([{ id: "a", tags: ["law"] }], KNOWN).verdicts;
  const plan = planRow(row("Lawyer", null), { jobTitle: "Lawyer", workplace: null }, v);
  assert.equal(plan.kind, "change");
  assert.equal(plan.after.jobTitle, "Lawyer");
  assert.equal(plan.after.workplace, null);
  const again = planRow(plan.after, { jobTitle: "Lawyer", workplace: null }, v);
  assert.equal(again.kind, "same", "an apply run twice writes nothing the second time");
});

test("a tidy the next save would rewrite is flagged, one it keeps is not", () => {
  const before = { jobTitle: "Doctor", workplace: "Self Employed" };
  assert.deepEqual(undoneByNextSave(before, { jobTitle: "Doctor in Private Practice", workplace: null }), []);
  assert.equal(undoneByNextSave({ jobTitle: "ios dev", workplace: null }, { jobTitle: "iOS Developer", workplace: null }).length, 1);
});

test("the write's parameter carries the guard words for every row", () => {
  const rows = JSON.parse(
    guardedWriteRows([{ id: "a", to: row("Student", null, ["student"], "s"), over: row("College", "Krea") }])
  );
  assert.deepEqual(rows, [
    { id: "a", tags: ["student"], source: "s", jobTitle: "Student", workplace: null, overTitle: "College", overPlace: "Krea" },
  ]);
  /* The guard lives in the statement itself. Losing either line would turn
     every write into one that lands over words nobody read. */
  assert.match(GUARDED_WRITE, /"jobTitle" IS NOT DISTINCT FROM r\."overTitle"/);
  assert.match(GUARDED_WRITE, /"workplace" IS NOT DISTINCT FROM r\."overPlace"/);
  assert.match(GUARDED_WRITE, /RETURNING/);
});
