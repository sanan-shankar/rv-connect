import assert from "node:assert/strict";
import test from "node:test";

import { passwordProblem } from "./password-rule.ts";

/* The password floor (audit M8), phrased as the guesses it refuses. */

test("the classic worst passwords are refused, in any casing", () => {
  for (const p of ["password", "Password1", "12345678", "QWERTY123", "iloveyou", "P@ssw0rd"]) {
    assert.ok(passwordProblem(p), `${p} was accepted`);
  }
});

test("the site's own name is refused — the companyname123 family", () => {
  for (const p of ["rishivalley", "RishiValley123", "valley123", "Krishnamurti"]) {
    assert.ok(passwordProblem(p), `${p} was accepted`);
  }
});

test("your own email address is not a password", () => {
  assert.ok(passwordProblem("anitasharma99", "anitasharma@gmail.com"));
  assert.ok(passwordProblem("xxAnitaSharmaxx", "AnitaSharma@gmail.com"));
});

test("a short email local part does not poison ordinary passwords", () => {
  // "raj" appears inside many honest words; only 4+ character locals match.
  assert.equal(passwordProblem("maharajah-blue-42", "raj@gmail.com"), null);
});

test("too short is still too short", () => {
  assert.ok(passwordProblem("hunter2"));
});

test("an ordinary decent password passes", () => {
  assert.equal(passwordProblem("banyan tree at six", "someone@gmail.com"), null);
  assert.equal(passwordProblem("Correct-Horse-Battery", undefined), null);
});
