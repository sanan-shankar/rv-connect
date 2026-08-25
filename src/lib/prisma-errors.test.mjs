import assert from "node:assert/strict";
import test from "node:test";
import {
  isForeignKeyViolation,
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
  }
});
