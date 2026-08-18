import assert from "node:assert/strict";
import test from "node:test";

import { batchLine, metaLine } from "./utils.ts";

// The byline under a name. Teachers have no batch year, so the accountType
// branches are the only thing standing between them and a wrong (or blank)
// line. "New in the directory" used to call formatBatch, which cannot see
// accountType, and every teacher there rendered as nothing.

test("a current teacher reads Teacher, not a batch", () => {
  assert.equal(batchLine({ accountType: "teacher", batchYear: null }), "Teacher");
});

test("a former teacher says so", () => {
  assert.equal(batchLine({ accountType: "ex_teacher", batchYear: null }), "Former teacher");
});

test("the role label wins even if a teacher somehow carries a batch year", () => {
  assert.equal(batchLine({ accountType: "teacher", batchYear: 1998 }), "Teacher");
});

test("an alumnus still gets the elided batch, and the full year on request", () => {
  assert.equal(batchLine({ accountType: "alumnus", batchYear: 2023 }), "Batch of '23");
  assert.equal(
    batchLine({ accountType: "alumnus", batchYear: 2023 }, { fullYear: true }),
    "Batch of 2023"
  );
});

// blankWhenUnknown is what lets the compact rail modules drop the "Member"
// filler without going back to formatBatch and losing the teacher labels.
test("blankWhenUnknown drops the Member filler but keeps role labels", () => {
  assert.equal(batchLine({ accountType: "alumnus", batchYear: null }), "Member");
  assert.equal(
    batchLine({ accountType: "alumnus", batchYear: null }, { blankWhenUnknown: true }),
    ""
  );
  assert.equal(
    batchLine({ accountType: "teacher", batchYear: null }, { blankWhenUnknown: true }),
    "Teacher"
  );
});

test("the Anonymous byline stays empty", () => {
  assert.equal(batchLine({ id: "anonymous", accountType: "alumnus", batchYear: 2005 }), "");
});

// metaLine, the byline's other half. A current teacher's batchLine and their
// occupation are both "Teacher", which read as "TEACHER · TEACHER" on the map
// drilldown and the directory card until the line learned to drop a repeat.

test("a segment repeated on the same line appears once", () => {
  assert.equal(metaLine("Teacher", "Teacher"), "Teacher");
  assert.equal(
    metaLine(batchLine({ accountType: "teacher", batchYear: null }), "Teacher", "Rishi Valley"),
    "Teacher \u00b7 Rishi Valley"
  );
});

test("the repeat check ignores case and stray space, and keeps the first spelling", () => {
  assert.equal(metaLine("Teacher", " teacher "), "Teacher");
  assert.equal(metaLine("teacher", "Teacher"), "teacher");
});

test("genuinely different segments all survive, in order", () => {
  assert.equal(
    metaLine("Batch of '78", "Doctor", "Rishi Valley"),
    "Batch of '78 \u00b7 Doctor \u00b7 Rishi Valley"
  );
});

test("empty and whitespace-only segments take their separator with them", () => {
  assert.equal(metaLine("", "Doctor", null, undefined, false), "Doctor");
  assert.equal(metaLine("Doctor", "   "), "Doctor");
  assert.equal(metaLine(null, undefined), "");
});
