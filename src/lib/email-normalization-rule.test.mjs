import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { normalizeEmail, emailField } from "./email-address.ts";

/* ------------------------------------------------------------------ *
 *  One canonical form of an email address, everywhere.
 *
 *  Before 2026-08-21 there were three (bug audit B-020). Signup stored the
 *  address exactly as typed. Login looked the RAW string up in a
 *  case-sensitive unique column while normalizing only its rate-limit key.
 *  The reset flow lowercased. The consequences, in order of how much they
 *  hurt: a member whose stored address has a capital in it can NEVER get a
 *  password reset (one of the 52 live members was in exactly that state);
 *  signing in with different capitalisation is wrongly refused; and one
 *  mailbox can register twice.
 * ------------------------------------------------------------------ */

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const read = (p) => readFileSync(resolve(ROOT, p), "utf8");
const decomment = (src) =>
  src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`\\])\/\/.*$/gm, "$1");

const field = emailField();

test("the canonical form is trimmed and lowercased", () => {
  assert.equal(normalizeEmail("  FoO@X.com "), "foo@x.com");
  assert.equal(normalizeEmail("already@lower.com"), "already@lower.com");
  assert.equal(normalizeEmail(""), "");
  assert.equal(normalizeEmail(null), "");
  assert.equal(normalizeEmail(undefined), "");
});

test("the schema yields the canonical form, not what was typed", () => {
  const parsed = field.safeParse("  Mishkakatyayan@GMail.com ");
  assert.ok(parsed.success, parsed.error?.issues?.[0]?.message);
  assert.equal(parsed.data, "mishkakatyayan@gmail.com");
});

test("cleaning happens before validating, so a pasted space is not a refusal", () => {
  assert.equal(field.safeParse(" a@b.co ").success, true);
});

test("it still refuses something that is not an address", () => {
  assert.equal(field.safeParse("not-an-email").success, false);
  assert.equal(field.safeParse("  ").success, false);
});

test("it caps the address, as every other email field already does", () => {
  assert.equal(field.safeParse(`${"a".repeat(250)}@example.com`).success, false);
});

test("signup builds its email field from the shared one", () => {
  const validators = decomment(read("src/lib/validators.ts"));
  assert.ok(
    /emailField\(/.test(validators),
    "signupSchema declares its own email rule again, which is how the three " +
      "different canonical forms happened (B-020)"
  );
});

test("no sign-in path looks a member up by the address as typed", () => {
  const auth = decomment(read("src/lib/auth.ts"));
  assert.ok(
    !/findUnique\(\{\s*where:\s*\{\s*email,?\s*\}/.test(auth),
    "authorize() looks up the raw submitted email again: an account stored " +
      "with a capital letter can no longer sign in with lowercase (B-020)"
  );
  assert.ok(/acctKey/.test(auth), "auth.ts no longer computes a normalized key");

  const devLogin = decomment(read("src/app/api/dev-login/route.ts"));
  assert.ok(
    /normalizeEmail/.test(devLogin),
    "the dev-login route looks members up by an unnormalized address"
  );

  const signup = decomment(read("src/components/auth/actions.ts"));
  assert.ok(
    !/where:\s*\{\s*email:\s*email\s*\}/.test(signup),
    "registerUser dedupes on an unnormalized address"
  );
});
