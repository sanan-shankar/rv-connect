import assert from "node:assert/strict";
import test from "node:test";

import {
  ADMIN_WITHHELD,
  normalizeRosterName,
  stripRosterInitials,
  rosterMayAct,
  rosterNameMatches,
  rosterOutcome,
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

/* ------------------------------------------------------------------ *
 *  What a match may DO (bug audit 3: O-08, T7a-06; owner, 2026-10-29).
 *  The directory shows every confirmed account each member's name and
 *  batch year, so those two facts prove only that someone read them.
 * ------------------------------------------------------------------ */

const undecided = { mailboxProven: true, verifyState: "unverified", verifyMethod: null };
const EMAIL = { email: true, name: false };
const NAME = { email: false, name: true };

test("an email on the list is the one automatic verification", () => {
  assert.equal(rosterOutcome(undecided, EMAIL), "verify");
  assert.equal(rosterOutcome({ ...undecided, verifyState: "pending" }, EMAIL), "verify");
  // A name that also fits changes nothing: the email already decided it.
  assert.equal(rosterOutcome(undecided, { email: true, name: true }), "verify");
});

test("a name and batch year alone never verify; they queue for the admin (O-08)", () => {
  assert.equal(rosterOutcome(undecided, NAME), "queue");
});

test("a name match on an account already in the queue does nothing, so the admins hear once", () => {
  assert.equal(rosterOutcome({ ...undecided, verifyState: "pending" }, NAME), "none");
});

test("a name another account already fits still only queues: never a refusal (owner: names repeat)", () => {
  /* The audit's fix direction refused a second claimant; the owner overruled
     it on 2026-10-29. The rule takes no "already claimed" input at all, and
     the admin page shows the first account as information. */
  assert.equal(rosterOutcome.length, 2, "rosterOutcome grew an input; is it refusing claimants?");
  assert.equal(rosterOutcome(undecided, NAME), "queue");
});

test("an unconfirmed address gets nothing from the list, by email or by name", () => {
  const waiting = { ...undecided, mailboxProven: false };
  assert.equal(rosterOutcome(waiting, EMAIL), "none");
  assert.equal(rosterOutcome(waiting, NAME), "none");
});

test("an admin's removal sticks: the list never acts on a withheld row (T7a-06)", () => {
  const withheld = { ...undecided, verifyMethod: ADMIN_WITHHELD };
  assert.equal(rosterMayAct(withheld), false);
  assert.equal(rosterOutcome(withheld, EMAIL), "none");
  assert.equal(rosterOutcome(withheld, NAME), "none");
});

test("a decided row is left alone: verified, flagged, any method, or a method nobody read", () => {
  for (const verifyMethod of ["office_list", "admin_manual", "community"]) {
    assert.equal(rosterOutcome({ ...undecided, verifyState: "verified", verifyMethod }, EMAIL), "none");
  }
  assert.equal(rosterOutcome({ ...undecided, verifyState: "flagged" }, EMAIL), "none");
  // A caller that forgot to select verifyMethod must fail closed, not open.
  assert.equal(rosterOutcome({ ...undecided, verifyMethod: undefined }, EMAIL), "none");
});

test("no match, no outcome", () => {
  assert.equal(rosterOutcome(undecided, { email: false, name: false }), "none");
});
