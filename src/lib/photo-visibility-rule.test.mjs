import assert from "node:assert/strict";
import test from "node:test";

import {
  MAX_CLASS_YEARS,
  PHOTO_NOT_VISIBLE,
  classKey,
  classYearsInclude,
  classYearsOf,
  decidePhotoVisibility,
  isValley,
  photoScopeWhere,
  storedClassYears,
} from "./photo-visibility-rule.ts";

/* ------------------------------------------------------------------ *
 *  The photo visibility rule, written down as attacks.
 *
 *  The Class Collection puts private photographs in the same table as public
 *  ones, which is the trade docs/planning/class-collection/spec.md sec. 3.1
 *  makes deliberately: sharing the table buys the viewer, the loves, the
 *  purge booking, the quota and the upload path, and costs a security
 *  surface on every query. This file is where that cost is paid.
 *
 *  Phrased as attacks rather than behaviours, following
 *  post-visibility-rule.test.mjs and demo.test.mjs -- the other two files
 *  here guarding a security policy. Each case names what somebody would be
 *  able to do again if it regressed.
 * ------------------------------------------------------------------ */

const photo = (over = {}) => ({
  id: "ph1",
  uploaderId: "u-other",
  scope: "valley",
  classYears: null,
  approved: true,
  isHidden: false,
  ...over,
});

/** A member of the class of 2004, verified: the ordinary case. */
const classmate = (over = {}) => ({
  id: "u-me",
  role: "member",
  verifyState: "verified",
  batchYear: 2004,
  ...over,
});

const classPhoto = (over = {}) =>
  photo({ scope: "class", classYears: "2004", ...over });

/* ---------------------------------------------------------------- *
 *  The Valley Collection still works
 * ---------------------------------------------------------------- */

test("a valley photograph is visible to any member", () => {
  assert.equal(decidePhotoVisibility(photo(), classmate()).ok, true);
});

test("a valley photograph is visible to a member with no class at all", () => {
  // Teachers have no batchYear. They must not lose the Valley Collection.
  const teacher = classmate({ batchYear: null, verifyState: "unverified" });
  assert.equal(decidePhotoVisibility(photo(), teacher).ok, true);
});

/* ---------------------------------------------------------------- *
 *  The class boundary
 * ---------------------------------------------------------------- */

test("a classmate sees their own class's photograph", () => {
  assert.equal(decidePhotoVisibility(classPhoto(), classmate()).ok, true);
});

test("ATTACK: another class cannot read a class photograph", () => {
  const outsider = classmate({ batchYear: 2005 });
  const seen = decidePhotoVisibility(classPhoto(), outsider);
  assert.equal(seen.ok, false);
  assert.equal(seen.reason, "other-class");
});

test("ATTACK: a member with no batchYear cannot read any class photograph", () => {
  // classKey(null) is null, and classYearsInclude refuses a null key outright.
  // Without that, a null key could match a malformed empty token.
  const noClass = classmate({ batchYear: null });
  assert.equal(decidePhotoVisibility(classPhoto(), noClass).ok, false);
});

test("ATTACK: an unverified member of the right class is still refused", () => {
  // Spec 2.4's first mitigation: editing batchYear is how somebody reaches
  // another class, so an unverified account gets the Valley Collection only.
  for (const state of ["unverified", "pending", "flagged", null, undefined]) {
    const unverified = classmate({ verifyState: state });
    const seen = decidePhotoVisibility(classPhoto(), unverified);
    assert.equal(seen.ok, false, `verifyState=${String(state)} must be refused`);
    assert.equal(seen.reason, "unverified");
  }
});

test("ATTACK: a stored year cannot be matched by a prefix of it", () => {
  // The bug post-visibility-rule.ts was fixed for: a plain `includes` matched
  // stored "20111" against viewer key "2011" and showed it to the wrong class.
  assert.equal(classYearsInclude("20111", "2011"), false);
  assert.equal(classYearsInclude("2011", "2011"), true);
});

test("ATTACK: an unparseable audience names nobody, it does not name everyone", () => {
  for (const junk of ["nineteen-ninety", "2004;2005", "20 04", "'2004'", "*"]) {
    assert.equal(classYearsOf(junk), null, `${junk} must not parse`);
    assert.equal(
      decidePhotoVisibility(classPhoto({ classYears: junk }), classmate()).ok,
      false,
      `${junk} must not be readable`
    );
  }
});

test("ATTACK: an EMPTY audience on a class photograph names nobody", () => {
  // Unlike a post's empty target list, which means everyone. The scope column
  // already said who this is for, so empty here is a broken row, not a public
  // one -- and a broken row must fail closed.
  for (const empty of [null, "", "   ", ",,"]) {
    assert.equal(
      decidePhotoVisibility(classPhoto({ classYears: empty }), classmate()).ok,
      false,
      `classYears=${JSON.stringify(empty)} must be readable by nobody`
    );
  }
});

test("ATTACK: an unrecognised scope value is not public", () => {
  // isValley reads the literal "valley" and nothing else, so a typo, a value
  // from a later vocabulary, or a column somebody widened all fail CLOSED.
  for (const scope of ["Valley", "VALLEY", "public", "", "vallley", null]) {
    assert.equal(isValley(scope), false, `${String(scope)} must not read as valley`);
    const seen = decidePhotoVisibility(photo({ scope, classYears: null }), classmate());
    assert.equal(seen.ok, false, `scope=${String(scope)} must not be visible`);
  }
});

/* ---------------------------------------------------------------- *
 *  The exemptions, each of which is a decision
 * ---------------------------------------------------------------- */

test("an admin sees every class's photographs", () => {
  // A DECISION (spec sec. 0), consistent with decidePostVisibility. It means
  // the owner can reach any class. If that is ever reconsidered, this is the
  // test to change and the first branch of the rule is the line to move.
  const admin = classmate({ role: "admin", batchYear: 1999 });
  assert.equal(decidePhotoVisibility(classPhoto(), admin).ok, true);
  assert.equal(decidePhotoVisibility(classPhoto({ isHidden: true }), admin).ok, true);
});

test("an uploader reaches their own photograph while it is hidden or unapproved", () => {
  // The only way to respond to moderation is to be able to open the thing.
  const me = classmate();
  const mine = (over) => classPhoto({ uploaderId: me.id, ...over });
  assert.equal(decidePhotoVisibility(mine({ isHidden: true }), me).ok, true);
  assert.equal(decidePhotoVisibility(mine({ approved: false }), me).ok, true);
});

test("a hidden or unapproved photograph is refused to everybody else", () => {
  assert.equal(decidePhotoVisibility(photo({ isHidden: true }), classmate()).ok, false);
  assert.equal(decidePhotoVisibility(photo({ approved: false }), classmate()).ok, false);
  assert.equal(
    decidePhotoVisibility(classPhoto({ isHidden: true }), classmate()).ok,
    false
  );
});

/* ---------------------------------------------------------------- *
 *  The audience list's own reader
 * ---------------------------------------------------------------- */

test("classKey takes a four-digit year and nothing else", () => {
  assert.equal(classKey(2004), "2004");
  assert.equal(classKey(null), null);
  assert.equal(classKey(undefined), null);
  assert.equal(classKey(204), null);
  assert.equal(classKey(20040), null);
  assert.equal(classKey(2004.5), null);
  assert.equal(classKey(NaN), null);
});

test("an audience list is de-duplicated and order-preserving", () => {
  assert.deepEqual(classYearsOf("2004, 2005 ,2004"), ["2004", "2005"]);
  assert.equal(storedClassYears("2004, 2005 ,2004"), "2004,2005");
  assert.equal(storedClassYears(""), null);
  assert.equal(storedClassYears(null), null);
});

test("ATTACK: an audience list cannot be padded past its cap", () => {
  // A server action is a public HTTP endpoint, and this column is LIKE-scanned
  // by every class river query. The same lesson as MAX_BATCH_TARGETS (M43).
  const tooMany = Array.from({ length: MAX_CLASS_YEARS + 1 }, (_, i) => 1990 + i);
  assert.equal(classYearsOf(tooMany.join(",")), null);
  // De-duplication happens BEFORE the cap, so one year repeated cannot fill it.
  assert.deepEqual(classYearsOf(Array(50).fill("2004").join(",")), ["2004"]);
});

test("one refusal message, so no caller becomes an oracle", () => {
  assert.match(PHOTO_NOT_VISIBLE, /not available/);
});

/* ---------------------------------------------------------------- *
 *  The query fragment, which must agree with the rule above
 * ---------------------------------------------------------------- */

test("the valley fragment names its scope and nothing else", () => {
  assert.deepEqual(photoScopeWhere("valley", classmate()), { scope: "valley" });
  // Even a viewer with no class at all still gets the Valley Collection.
  assert.deepEqual(
    photoScopeWhere("valley", classmate({ batchYear: null, verifyState: "unverified" })),
    { scope: "valley" }
  );
});

test("the class fragment pins both the scope and the year", () => {
  assert.deepEqual(photoScopeWhere("class", classmate()), {
    scope: "class",
    classYears: "2004",
  });
});

test("ATTACK: an ineligible viewer gets null, never an unscoped fragment", () => {
  // A `{}` here would merge into the river's where and silently widen it to
  // BOTH halves of the Collection. Null forces the caller to answer empty.
  for (const viewer of [
    classmate({ verifyState: "unverified" }),
    classmate({ verifyState: "pending" }),
    classmate({ verifyState: "flagged" }),
    classmate({ batchYear: null }),
    classmate({ batchYear: 204 }),
    classmate({ role: "admin", batchYear: null }),
  ]) {
    assert.equal(photoScopeWhere("class", viewer), null);
  }
});

test("an admin browsing the class river sees their OWN class, not every class", () => {
  // decidePhotoVisibility exempts admins so moderation can open any photograph
  // by id. The river deliberately does NOT, or an admin's own Class Collection
  // would be every class merged together.
  const admin = classmate({ role: "admin", batchYear: 1999 });
  assert.deepEqual(photoScopeWhere("class", admin), {
    scope: "class",
    classYears: "1999",
  });
});

test("every fragment the builder can return names a scope", () => {
  // The invariant that makes this safe to spread into a river query.
  for (const scope of ["valley", "class"]) {
    for (const viewer of [classmate(), classmate({ verifyState: "pending" })]) {
      const frag = photoScopeWhere(scope, viewer);
      if (frag !== null) assert.ok(frag.scope, "a fragment must name a scope");
    }
  }
});
