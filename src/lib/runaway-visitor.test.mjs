import { test } from "node:test";
import assert from "node:assert/strict";
import { foldName, isRunawayVisitor } from "./runaway-visitor.ts";

const her = (firstName, lastName, extra = {}) => isRunawayVisitor({ firstName, lastName, ...extra });

test("every spelling of her name folds to the same two words", () => {
  for (const w of ["Anantha", "Ananta", "ANANTHA", "Annantha", "Anańtha"]) assert.equal(foldName(w), "ananta", w);
  for (const w of ["Jyothi", "Jyoti", "Jyothy", "jyoty"]) assert.equal(foldName(w), "jioti", w);
  assert.equal(foldName("Jothi"), "joti");
});

test("she is recognised however she fills the two boxes", () => {
  assert.ok(her("Anantha", "Jyothi"));
  assert.ok(her("Ananta", "Jyoti"));
  assert.ok(her("Jyothi", "Anantha"), "swapped");
  assert.ok(her("Anantha Jyothi", "Rao"), "both in the first box, another surname");
  assert.ok(her("Rao", "Anantha Jyothi"), "both in the surname box");
  assert.ok(her("Ananthajyothi", ""), "run together");
  assert.ok(her("Jyothi", "Ananta"), "swapped and without the h");
  assert.ok(her("Dr. Anantha", "Jyothy"), "with a title");
  assert.ok(her("  anantha ", "JOTHI"), "case, spaces, the Tamil spelling");
});

test("an initial counts only from someone who said Teacher", () => {
  assert.ok(her("A.", "Jyothi", { teacher: true }));
  assert.ok(her("Jyothi", "A", { teacher: true }));
  assert.ok(!her("A.", "Jyothi"));
  assert.ok(!her("A.", "Jyothi", { teacher: false }));
});

test("her email gives her away even when the name boxes do not", () => {
  assert.ok(her("", "", { email: "anantha.jyothi@gmail.com" }));
  assert.ok(her("", "", { email: "ananthajyothi76@yahoo.co.in" }));
  assert.ok(her("", "", { email: "principal@rishivalley.org" }));
  assert.ok(her("", "", { email: "Principal.RVS@rishivalley.org" }));
  assert.ok(!her("", "", { email: "principal@gmail.com" }));
  assert.ok(!her("", "", { email: "jyothi@rishivalley.org" }));
});

test("people who only share part of her name are let through", () => {
  assert.ok(!her("Jyothi", "Anantharaman"), "Anantharaman is not Anantha");
  assert.ok(!her("Jyothirmayi", "Anantha"), "Jyothirmayi is not Jyothi");
  assert.ok(!her("Anand", "Jyothi"));
  assert.ok(!her("Ananya", "Jyothi"));
  assert.ok(!her("Anantha", "Krishnan"));
  assert.ok(!her("Jyothi", "Reddy", { teacher: true }));
  assert.ok(!her("", ""));
});
