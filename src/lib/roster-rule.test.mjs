import assert from "node:assert/strict";
import test from "node:test";

import {
  normalizeRosterName,
  stripRosterInitials,
  rosterNameMatches,
  rosterYearMatches,
} from "./roster-rule.ts";

/* ------------------------------------------------------------------ *
 *  The roster matching rule, written down as attacks and as the real
 *  sheet's mess. A false NEGATIVE annoys one alum for a day (the owner
 *  verifies them by hand); a false POSITIVE hands a stranger Stage 2 --
 *  every write, every phone number -- so the cases below leaning
 *  strict are leaning the right way.
 * ------------------------------------------------------------------ */

test("normalize folds case, dots, hyphens and stray spaces", () => {
  assert.equal(normalizeRosterName("  SRIRAM   Krishnan. "), "sriram krishnan");
  assert.equal(normalizeRosterName("Ananya-Devi Iyer"), "ananya devi iyer");
});

test("normalize folds diacritics the sheet may carry", () => {
  assert.equal(normalizeRosterName("Núria D'Souza"), "nuria d souza");
});

test("initials after the comma are stripped, sheet-style", () => {
  assert.equal(stripRosterInitials("Chellam Kuppuraj, T."), "Chellam Kuppuraj");
  assert.equal(stripRosterInitials("Lakshmi Narayanan, B.S."), "Lakshmi Narayanan");
  assert.equal(stripRosterInitials("No Comma Here"), "No Comma Here");
});

test("exact normalized names match", () => {
  assert.ok(rosterNameMatches("Chellam Kuppuraj", "chellam kuppuraj"));
});

test("a middle name on one side only still matches", () => {
  assert.ok(rosterNameMatches("Ananya Devi Iyer", "ananya iyer"));
  assert.ok(rosterNameMatches("Ananya Iyer", "ananya devi iyer"));
});

test("first name alone can NEVER match (impersonation floor)", () => {
  assert.ok(!rosterNameMatches("Ananya", "ananya iyer"));
  assert.ok(!rosterNameMatches("Ananya Iyer", "ananya"));
});

test("a shared first name with a different surname does not match", () => {
  assert.ok(!rosterNameMatches("Ananya Sharma", "ananya iyer"));
});

test("an initial as surname cannot carry a match", () => {
  // If the import ever forgets to strip ", T." the stray token must fail
  // closed rather than letting "Something T" match everyone with initial T.
  assert.ok(!rosterNameMatches("Chellam T", "chellam kuppuraj t"));
});

test("empty and whitespace names match nothing", () => {
  assert.ok(!rosterNameMatches("", "ananya iyer"));
  assert.ok(!rosterNameMatches("   ", "ananya iyer"));
  assert.ok(!rosterNameMatches("Ananya Iyer", ""));
});

test("a row with no year can never carry a name-only match", () => {
  assert.ok(!rosterYearMatches(null, { batchYear: 1999, yearLeft: 1997 }));
});

test("the sheet's year may be the batch year OR the leaving year", () => {
  assert.ok(rosterYearMatches(1999, { batchYear: 1999, yearLeft: 1997 }));
  assert.ok(rosterYearMatches(1997, { batchYear: 1999, yearLeft: 1997 }));
  assert.ok(!rosterYearMatches(1998, { batchYear: 1999, yearLeft: 1997 }));
});

test("a member with no years on file matches no year", () => {
  assert.ok(!rosterYearMatches(1999, { batchYear: null, yearLeft: null }));
});
