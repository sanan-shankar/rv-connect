import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { buildRows, rowsToPayload } from "./contact-rows.ts";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const read = (p) => readFileSync(resolve(ROOT, p), "utf8");

const base = {
  displayEmail: null,
  showEmail: true,
  email: "member@example.com",
  phones: [],
  instagram: null,
  linkedin: null,
  facebook: null,
  links: [],
};

/* The email row's X used to be a privacy control that did the opposite of what
 * it looked like: removing the row wrote displayEmail = null, which the profile
 * read as "fall back", and it published the member's PRIVATE SIGN-IN ADDRESS to
 * every verified alumnus. Re-opening the editor then re-seeded the row from
 * that same address, so the removal did not even appear to have stuck. */

test("a member who never touched it still shows their sign-in address", () => {
  const rows = buildRows(base);
  const email = rows.find((r) => r.kind === "email");
  assert.equal(email.value, "member@example.com");
  assert.equal(rowsToPayload(rows).showEmail, true);
});

test("a custom display address is shown and kept", () => {
  const rows = buildRows({ ...base, displayEmail: "hello@studio.example" });
  assert.equal(rows.find((r) => r.kind === "email").value, "hello@studio.example");
  const payload = rowsToPayload(rows);
  assert.equal(payload.displayEmail, "hello@studio.example");
  assert.equal(payload.showEmail, true);
});

test("removing the email row asks for no email, and it does not come back", () => {
  const rows = buildRows(base).filter((r) => r.kind !== "email");
  const payload = rowsToPayload(rows);
  assert.equal(payload.showEmail, false);
  assert.equal(payload.displayEmail, null);

  // The round trip: what was saved, re-opened, must still have no email row.
  const reopened = buildRows({ ...base, ...payload });
  assert.equal(
    reopened.find((r) => r.kind === "email"),
    undefined,
    "the removed email row was re-seeded from the account address"
  );
  // And saving again keeps it removed rather than quietly turning it back on.
  assert.equal(rowsToPayload(reopened).showEmail, false);
});

test("removing a CUSTOM address hides the email rather than falling back", () => {
  const rows = buildRows({ ...base, displayEmail: "hello@studio.example" }).filter(
    (r) => r.kind !== "email"
  );
  const payload = rowsToPayload(rows);
  assert.equal(payload.showEmail, false);
  const reopened = buildRows({ ...base, ...payload, displayEmail: null });
  assert.equal(reopened.find((r) => r.kind === "email"), undefined);
});

test("the profile never falls back to the sign-in address when email is off", () => {
  // The fix has to hold at the render site too, not just in the editor: this is
  // the line that actually decided what a viewer saw.
  const page = read("src/app/(main)/profile/[id]/page.tsx");
  assert.ok(
    !/const contactEmail = user\.displayEmail\?\.trim\(\) \|\| user\.email;/.test(page),
    "the profile falls back to the sign-in address again"
  );
  assert.match(page, /user\.showEmail \?/, "the profile no longer consults showEmail");
  // The vCard is the other way the address leaves the page.
  assert.match(page, /maySeeContacts && contactEmail \? `EMAIL:/, "the vCard ignores showEmail");
});
