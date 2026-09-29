import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

import { normalizeEmail, emailField } from "./email-address.ts";
import { ROOT, read, decomment } from "./test-kit.mjs";

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

test("every lookup by email goes through the canonical form", () => {
  /* A POSITIVE pin, because the negative ones below are spelling-bound (audit
     C-197). They refuse `where: { email }` and `where: { email: email }` -- two
     anticipated spellings -- so the B-020 bug could return the moment somebody
     renamed the variable, written `where: { email: submitted }`, with this
     suite green. And its paired positive assertion only checks that the token
     `acctKey` appears SOMEWHERE in auth.ts, which it does for rate limiting
     even if the lookup regresses.

     So instead: find EVERY `where: { ... email: X ... }` in src, trace X back
     to where it was made, and require the canonical form to be in that
     history. What "canonical" means lives in one place (email-address.ts), and
     this asserts every reader of the unique column reaches it. */
  const CANONICAL = /normalizeEmail\(|\.toLowerCase\(\)/;
  const VALIDATORS = readFileSync(resolve(ROOT, "src/lib/validators.ts"), "utf8");

  /* Addresses that came OUT of the User row rather than off a form. Nothing
     can normalise these further, and normalising them would be wrong -- the
     stored value IS the canonical one. Listed rather than detected, with the
     reason, so each is a reviewed decision instead of a silent pass. */
  const FROM_THE_DATABASE = {
    "src/lib/auth-tokens.ts": [
      // claimToken's `sentToEmail`. Its docblock requires the caller to pass
      // the address readToken read off the User row -- never a submitted one
      // -- because the claim's job is to repeat the peek's staleness check
      // against exactly what the peek saw. Moved here from email-actions.ts
      // on 2026-08-26 when the two inline claims became this one helper.
      "sentToEmail",
    ],
    "src/lib/roster.ts": ["user.email.toLowerCase()"],
    // The fence on "use another email": the address the row held when it was
    // read a moment before, so a second tab or a confirmation in between is
    // not overwritten. Read off the row, never submitted.
    "src/components/auth/change-email-actions.ts": ["me.email"],
  };

  const walk = (dir, acc = []) => {
    for (const entry of readdirSync(dir)) {
      if (entry === "generated" || entry === "node_modules" || entry === "lab") continue;
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) walk(full, acc);
      else if (/\.tsx?$/.test(entry)) acc.push(full);
    }
    return acc;
  };

  /** The balanced `{ ... }` immediately after a `where:`. */
  const whereBlock = (src, at) => {
    const i = src.indexOf("{", at);
    if (i < 0) return "";
    let depth = 0;
    for (let j = i; j < src.length; j++) {
      if (src[j] === "{") depth++;
      else if (src[j] === "}") {
        depth--;
        if (depth === 0) return src.slice(i, j + 1);
      }
    }
    return src.slice(i);
  };

  const offenders = [];
  let sites = 0;
  for (const file of walk(resolve(ROOT, "src"))) {
    const src = decomment(readFileSync(file, "utf8"));
    for (const m of src.matchAll(/where:\s*(?=\{)/g)) {
      const block = whereBlock(src, m.index);
      const key = block.match(/\bemail:\s*([^,\n}]+)/);
      if (!key) continue;
      sites++;
      const expr = key[1].trim();
      const where = `${relative(ROOT, file)}: where: { email: ${expr} }`;

      // Normalised right there in the lookup.
      if (CANONICAL.test(expr)) continue;
      // A Prisma filter object rather than an equality; case-insensitive is
      // its own canonical form.
      if (expr.startsWith("{") && /mode:\s*["\']insensitive/.test(block)) continue;
      /* A value parsed by a Zod schema, which normalises inside the parse --
         but only if THAT schema's email field is the shared one. Resolved by
         name through validators.ts rather than by grepping this file for the
         word "emailField", which would wave through a `parsed.data.email` from
         any schema that happened to sit beside one that uses it. */
      if (/^\w+\.data\.email$/.test(expr)) {
        const schema = src.match(/const\s+\w+\s*=\s*(?:await\s+)?(\w+)\.safe(?:Parse|ParseAsync)\(/)?.[1];
        const decl = schema && VALIDATORS.match(new RegExp(`export const ${schema}\\s*=[\\s\\S]*?\\n\\w`));
        if (decl && /email:\s*emailField\(/.test(decl[0])) continue;
      }
      // Read back OUT of the database rather than submitted: already canonical
      // by storage, and there is nothing to normalise it from.
      if (FROM_THE_DATABASE[relative(ROOT, file)]?.includes(expr)) continue;
      // Otherwise it is a local; find where it was made and look there.
      const ident = expr.match(/^[A-Za-z_$][\w$]*$/)?.[0];
      const decl = ident && src.match(new RegExp(`(?:const|let|var)\\s+${ident}\\s*=([^;]+);`));
      if (decl && CANONICAL.test(decl[1])) continue;

      offenders.push(where);
    }
  }

  assert.ok(sites >= 5, `only found ${sites} email lookups; this sweep has stopped matching`);
  assert.deepEqual(
    offenders,
    [],
    "a member is looked up by an address that never reached the canonical form " +
      "(B-020: an account stored with a capital letter can then never sign in " +
      "or get a reset):\n" + offenders.join("\n")
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
