import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import * as normalize from "./normalize.ts";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const read = (p) => readFileSync(resolve(ROOT, p), "utf8");

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
  /* The rule is worth nothing where it is not called. Shape-checked because
     social.ts imports lucide-react, which the unit gate's plain `node` cannot
     load. Read side AND write side: the read fixes the rows that already hold
     a pasted URL, the write stops new ones arriving. */
  const social = read("src/lib/social.ts");
  const href = social.slice(social.indexOf("export function socialHref"), social.indexOf("export function socialIcon"));
  const display = social.slice(social.indexOf("export function socialDisplay"), social.indexOf("export function socialHost"));
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
