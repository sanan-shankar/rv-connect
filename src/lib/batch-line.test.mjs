import assert from "node:assert/strict";
import test from "node:test";

import { batchLine } from "./utils.ts";

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
