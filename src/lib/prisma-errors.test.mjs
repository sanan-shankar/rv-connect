import assert from "node:assert/strict";
import test from "node:test";
import {
  isForeignKeyViolation,
  isMissingTable,
  isUniqueViolation,
} from "./prisma-errors.ts";

test("each predicate matches its own code and nothing else", () => {
  assert.ok(isUniqueViolation({ code: "P2002" }));
  assert.ok(!isUniqueViolation({ code: "P2025" }));
  assert.ok(isForeignKeyViolation({ code: "P2003" }));
  assert.ok(!isForeignKeyViolation({ code: "P2002" }));
});

test("anything that is not a Prisma error is not one of these races", () => {
  // A thrown string, a null, a plain Error, or an object whose `code` is a
  // number must never be mistaken for a settled race and swallowed.
  for (const notAnError of [null, undefined, "P2002", 2002, new Error("P2002"), {}, { code: 2002 }]) {
    assert.ok(!isUniqueViolation(notAnError), String(notAnError));
    assert.ok(!isForeignKeyViolation(notAnError), String(notAnError));
    assert.ok(!isMissingTable(notAnError, /Catchup/), String(notAnError));
  }
});

test("a missing table is recognised by code, or by a message about OUR table", () => {
  // Both codes, because Prisma raises P2021 and the pg adapter surfaces the
  // Postgres one for a raw query.
  assert.ok(isMissingTable({ code: "P2021" }, /Catchup/));
  assert.ok(isMissingTable({ code: "42P01" }, /LabRoomState/));

  // The message fallback, which exists because neither code always arrives.
  assert.ok(isMissingTable(new Error('relation "CatchupEdition" does not exist'), /Catchup/));
  assert.ok(isMissingTable({ message: "LabRoomState does not exist" }, /LabRoomState/));
});

test("the message fallback cannot swallow somebody else's failure", () => {
  /* This is the reason the pattern is a parameter rather than a constant. A
     table-missing error for a table we did not ask about, or any other error
     that happens to say "does not exist", must reach the caller -- otherwise a
     real outage renders as a tidy empty page and nobody is told. */
  const other = new Error('relation "SomeoneElse" does not exist');
  assert.ok(!isMissingTable(other, /Catchup/));
  assert.ok(!isMissingTable(other, /LabRoomState/));
  assert.ok(!isMissingTable(new Error("Catchup something else went wrong"), /Catchup/));
  assert.ok(!isMissingTable({ code: "P2002", message: "Catchup" }, /Catchup/));
});
