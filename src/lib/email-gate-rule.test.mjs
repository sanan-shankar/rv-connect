import assert from "node:assert/strict";
import test from "node:test";
import { relative, resolve } from "node:path";
import { ROOT, read, decomment, walk } from "./test-kit.mjs";

/* ------------------------------------------------------------------ *
 *  Who reads which half of the confirmed-email question.
 *
 *  Since launch day (2026-09-29) there are two: `emailConfirmed`, the FACT
 *  that the link was tapped, and `emailGateOpen`, the PERMISSION, which is
 *  also true while a confirmation waits behind the daily email limit with
 *  none sent yet (`confirmationStillWaiting`). A permission check that reads
 *  the fact locks a waiting member out of what the owner said they may do;
 *  the roster reading the permission lets a stranger claim a real alumnus's
 *  name with an address they do not own (write-path review, same day).
 *  Both mistakes typecheck, so they are pinned here.
 * ------------------------------------------------------------------ */

/** The only files that may read the FACT, each for a reason. */
const FACT_READERS = new Map([
  // Whether to show the banner at all: it stays up while they wait.
  ["src/app/(main)/layout.tsx", "banner"],
  // "Your email is already confirmed", the resend button's early return.
  ["src/components/auth/email-actions.ts", "already confirmed"],
  // Whether the link page offers a resend.
  ["src/app/(auth)/verify-email/page.tsx", "resend offer"],
  // Where the session is built, and the type that declares it.
  ["src/lib/auth.ts", "defines it"],
  ["src/types/next-auth.d.ts", "declares it"],
]);

test("nothing but the fact readers reads emailConfirmed", () => {
  const offenders = walk(resolve(ROOT, "src"), { match: /\.(ts|tsx)$/ })
    .map((f) => relative(ROOT, f))
    .filter((f) => !f.includes(".test."))
    .filter((f) => /\bemailConfirmed\b/.test(decomment(read(f))))
    .filter((f) => !FACT_READERS.has(f));
  assert.deepEqual(
    offenders,
    [],
    "these read the literal fact; a permission must read session.user.emailGateOpen " +
      "so a member waiting on the daily email limit is not locked out"
  );
});

test("the gated-action check reads the permission", () => {
  const gate = decomment(read("src/lib/email-verification.ts"));
  assert.match(gate, /session\.user\.emailGateOpen/, "requireVerifiedEmail stopped reading the gate");
});

test("the roster auto-match reads the fact, never the gate", () => {
  const roster = decomment(read("src/lib/roster.ts"));
  assert.match(roster, /if \(!user\.emailVerified\) return false;/, "the roster no longer requires a tapped link");
  assert.doesNotMatch(
    roster,
    /emailGateOpen/,
    "the roster reads the email GATE: a waiting account could claim a real alumnus's name"
  );
});

test("the session sets both, and the demo persona has both", () => {
  const auth = decomment(read("src/lib/auth.ts"));
  assert.match(auth, /session\.user\.emailGateOpen = await emailGateOpenFor\(/);
  assert.match(auth, /emailConfirmed: true,\s*emailGateOpen: true,/, "the demo persona lost a field");
});
