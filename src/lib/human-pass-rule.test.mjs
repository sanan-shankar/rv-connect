import assert from "node:assert/strict";
import test from "node:test";

import {
  signHumanPass,
  humanPassValid,
  humanPassFromCookieHeader,
  HUMAN_PASS_COOKIE,
} from "./human-pass-rule.ts";

/* ------------------------------------------------------------------ *
 *  The human pass, written down as attacks (audit H22, Phase 4).
 *
 *  The pass lets a fresh signup or completed reset cross authorize()'s
 *  bot check without a second Turnstile token. Each case below names
 *  what an attacker could do again if it regressed: mint a pass for one
 *  address and use it on another, keep one alive forever, or forge one
 *  without the secret.
 * ------------------------------------------------------------------ */

const SECRET = "test-secret-never-shipped";
const NOW = 1_755_600_000_000;

test("a freshly minted pass verifies for its own address", () => {
  const pass = signHumanPass("amy@example.com", NOW, SECRET);
  assert.equal(humanPassValid(pass, "amy@example.com", NOW + 1000, SECRET), true);
});

test("email binding is case-insensitive, matching how addresses are typed", () => {
  const pass = signHumanPass("Amy@Example.com", NOW, SECRET);
  assert.equal(humanPassValid(pass, "amy@example.com", NOW + 1000, SECRET), true);
});

test("a pass minted for one address is refused for another", () => {
  // The bypass-turned-weapon: sign up with a throwaway, replay the pass
  // cookie while stuffing credentials at somebody else's account.
  const pass = signHumanPass("attacker@example.com", NOW, SECRET);
  assert.equal(humanPassValid(pass, "victim@example.com", NOW + 1000, SECRET), false);
});

test("a pass dies at five minutes", () => {
  const pass = signHumanPass("amy@example.com", NOW, SECRET);
  assert.equal(humanPassValid(pass, "amy@example.com", NOW + 5 * 60 * 1000 + 1, SECRET), false);
});

test("a pass dated in the future is refused, not saved for later", () => {
  const pass = signHumanPass("amy@example.com", NOW + 10 * 60 * 1000, SECRET);
  assert.equal(humanPassValid(pass, "amy@example.com", NOW, SECRET), false);
});

test("re-signing the timestamp with the wrong secret does not verify", () => {
  const forged = signHumanPass("amy@example.com", NOW, "guessed-secret");
  assert.equal(humanPassValid(forged, "amy@example.com", NOW + 1000, SECRET), false);
});

test("tampering with the timestamp after signing does not verify", () => {
  const pass = signHumanPass("amy@example.com", NOW, SECRET);
  const [, sig] = pass.split(".");
  assert.equal(humanPassValid(`${NOW + 60_000}.${sig}`, "amy@example.com", NOW + 1000, SECRET), false);
});

test("garbage shapes are refused without throwing", () => {
  for (const junk of [null, undefined, "", ".", "no-dot", "NaN.abc", "123."]) {
    assert.equal(humanPassValid(junk, "amy@example.com", NOW, SECRET), false);
  }
});

test("the cookie parser finds the pass among neighbours and ignores lookalikes", () => {
  const pass = signHumanPass("amy@example.com", NOW, SECRET);
  const header = `theme=dark; ${HUMAN_PASS_COOKIE}=${encodeURIComponent(pass)}; rv_human_extra=nope`;
  assert.equal(humanPassFromCookieHeader(header), pass);
  assert.equal(humanPassFromCookieHeader("rv_humanx=abc"), null);
  assert.equal(humanPassFromCookieHeader(null), null);
});
