import assert from "node:assert/strict";
import test from "node:test";

import * as normalize from "./normalize.ts";
import { read } from "./test-kit.mjs";

test("shortPlaceLabel shows only the primary place name", () => {
  assert.equal(normalize.shortPlaceLabel?.("Delhi, Delhi"), "Delhi");
  assert.equal(normalize.shortPlaceLabel?.("London, England, United Kingdom"), "London");
  assert.equal(normalize.shortPlaceLabel?.("Northfield, Minnesota, United States"), "Northfield");
});

test("shortPlaceLabel preserves a place that has no qualifier", () => {
  assert.equal(normalize.shortPlaceLabel?.("  New Delhi  "), "New Delhi");
});

/* ------------------------------------------------------------------ *
 *  Pasting the Instagram address bar is a normal thing to do.
 *
 *  The column is meant to hold a bare handle and the editor asks for one,
 *  but a pasted "https://instagram.com/ananya" was prefixed again on the way
 *  out: a dead "https://instagram.com/https://instagram.com/ananya" link and
 *  an "@https://instagram.com/ananya" label, both on the public profile
 *  (bug-report-2 C-040). Every other social field survived this only because
 *  it falls through to socialHref's http() check.
 * ------------------------------------------------------------------ */

test("every way somebody might give their Instagram lands on the same handle", () => {
  for (const typed of [
    "ananya",
    "@ananya",
    "  @ananya  ",
    "instagram.com/ananya",
    "www.instagram.com/ananya",
    "http://instagram.com/ananya",
    "https://instagram.com/ananya",
    "https://www.instagram.com/ananya/",
    "https://instagram.com/ananya?igshid=abc",
  ]) {
    assert.equal(normalize.instagramHandle(typed), "ananya", `"${typed}" did not reduce to the handle`);
  }
});

test("a handle it cannot find is empty, not a link to instagram.com itself", () => {
  // socialHref returns "" for these rather than an href pointing at the whole
  // of Instagram, which is what an empty handle used to produce.
  assert.equal(normalize.instagramHandle(""), "");
  assert.equal(normalize.instagramHandle("  "), "");
  assert.equal(normalize.instagramHandle("https://instagram.com/"), "");
  assert.equal(normalize.instagramHandle("@"), "");
});

test("a handle is not mangled by the stripping", () => {
  // Dots and underscores are legal in a handle and must survive.
  assert.equal(normalize.instagramHandle("ananya.rao_1998"), "ananya.rao_1998");
  // ...and a handle that merely BEGINS with the word is not truncated.
  assert.equal(normalize.instagramHandle("instagramofficial"), "instagramofficial");
});

test("both sides of the Instagram field spend the rule", () => {
  /* The rule is worth nothing where it is not called. Shape-checked over the
     source text rather than by calling the functions, so it pins that the CALL
     is written where it belongs. Read side AND write side: the read fixes the
     rows that already hold a pasted URL, the write stops new ones arriving.
     The end boundaries below are the NEXT declaration in social.ts -- keep them
     in step if that file's order changes, or indexOf returns -1 and the slice
     silently swallows the rest of the file. */
  const social = read("src/lib/social.ts");
  const href = social.slice(social.indexOf("export function socialHref"), social.indexOf("export function socialDisplay"));
  const display = social.slice(social.indexOf("export function socialDisplay"), social.indexOf("export interface UserLink"));
  assert.match(href, /instagramHandle\s*\(/, "socialHref builds the Instagram URL without normalising the handle again");
  assert.match(display, /instagramHandle\s*\(/, "socialDisplay prints the stored value raw again");

  const write = read("src/components/profile/profile-actions.ts");
  const update = write.slice(write.indexOf("export async function updateContactMethods"));
  const stored = update.slice(update.indexOf("prisma.user.update"));
  assert.match(
    stored.slice(stored.indexOf("instagram:"), stored.indexOf("linkedin:")),
    /instagramHandle\s*\(/,
    "updateContactMethods stores whatever was pasted again"
  );
});

/* ------------------------------------------------------------------ *
 *  An acronym typed into an occupation field survives the save.
 *
 *  titleCase's all-caps branch made "GNLU" "Gnlu" on every path that
 *  writes jobTitle or workplace -- including the admin editor, so the
 *  owner could not correct one. occupationCase keeps a lone capitalised
 *  word and hands everything else to titleCase unchanged.
 * ------------------------------------------------------------------ */

test("a one-word acronym in an occupation field is kept as typed", () => {
  for (const typed of ["GNLU", "UBS", "CEO", "O.P.", "IIT-B"]) {
    assert.equal(normalize.occupationCase(typed), typed);
  }
  assert.equal(normalize.occupationCase("  UCSD "), "UCSD");
});

test("everything else in an occupation field is titleCase, unchanged", () => {
  for (const typed of ["software engineer", "IIT BOMBAY", "KIMS Hospitals", "ucsd", "state bank of india"]) {
    assert.equal(normalize.occupationCase(typed), normalize.titleCase(typed));
  }
  /* The branch that made the acronyms disappear is still right for names. */
  assert.equal(normalize.titleCase("GNLU"), "Gnlu");
});
