import assert from "node:assert/strict";
import test from "node:test";
import { read, decomment } from "./test-kit.mjs";

/* ------------------------------------------------------------------ *
 *  "Already confirmed" has to be true when we say it.
 *
 *  It was not (bug audit B-021). mintToken burned every outstanding token
 *  of its kind on every mint, and the queue mints at SEND time — so any
 *  resend, including the second row the enqueue fold's own TOCTOU can
 *  create, marked the earlier mail's token used. The member then had two
 *  mails in their inbox, opened the older one, and got a happy bird saying
 *  "This address was confirmed earlier. Nothing left to do." with no
 *  resend button, while their account was still unverified and every
 *  Stage-2 door stayed shut.
 *
 *  Two changes, both pinned here: a used verify token no longer implies
 *  confirmation (the User row is what decides), and confirmation links are
 *  no longer burned on remint at all, because two live links to the same
 *  inbox confirm the same address and are harmless — which removes the
 *  trap at its source. Reset links ARE still burned: there the burn is a
 *  security property, not a convenience.
 * ------------------------------------------------------------------ */

const tokens = decomment(read("src/lib/auth-tokens.ts"));
const actions = decomment(read("src/components/auth/email-actions.ts"));
const client = decomment(read("src/app/(auth)/verify-email/verify-client.tsx"));

test("a used token says who it belonged to, so the claim can be checked", () => {
  assert.ok(
    /reason: "used";\s*userId: string/.test(tokens) || /reason: "used"; userId/.test(tokens),
    "readToken's 'used' result carries no userId, so confirmEmailToken has no " +
      "way to find out whether the address really is confirmed (B-021)"
  );
});

test("confirmEmailToken reads the account before claiming it is confirmed", () => {
  const i = actions.indexOf("export async function confirmEmailToken");
  const body = actions.slice(i, actions.indexOf("\n}\n", i) + 2);
  assert.ok(
    /emailVerified/.test(body),
    "confirmEmailToken still answers 'already' off the token alone, without " +
      "ever looking at User.emailVerified (B-021)"
  );
  assert.ok(
    /superseded/.test(body),
    "there is no outcome for a link a newer one replaced, so an unverified " +
      "member is shown a dead-end success screen"
  );
});

test("a superseded link is not treated as a happy ending", () => {
  assert.ok(/superseded/.test(client), "the verify page has no copy for a superseded link");
  const i = client.indexOf("const GOOD");
  const good = client.slice(i, client.indexOf("\n", client.indexOf(")", i)));
  assert.ok(
    !/superseded/.test(good),
    "'superseded' is in the GOOD set, which hides the resend button — the one " +
      "control the member actually needs"
  );
});

test("confirmation links are no longer burned on remint; reset links still are", () => {
  assert.ok(
    /BURNS_ON_MINT/.test(tokens),
    "mintToken burns every outstanding token of its kind again, which is what " +
      "made a still-valid confirmation link report itself as already used"
  );
  const i = tokens.indexOf("BURNS_ON_MINT");
  const table = tokens.slice(i, tokens.indexOf("}", i));
  assert.ok(/reset:\s*true/.test(table), "reset links stopped being burned on remint");
  assert.ok(/verify:\s*false/.test(table), "verify links are being burned on remint again");
});
