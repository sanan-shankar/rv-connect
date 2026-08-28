import assert from "node:assert/strict";
import test from "node:test";

import { normaliseHost, sameOrigin } from "./turnstile-origin-rule.ts";

/* ------------------------------------------------------------------ *
 *  The origin rule, written down as the attack it exists to stop.
 *
 *  Context: on 2026-08-28 the Turnstile widget's hostname list was
 *  widened to `vercel.app`, so the owner could sign in to past
 *  deployments (each at its own unguessable `rv-connect-<hash>` URL).
 *  Turnstile matches subdomains, so that entry hands our public site key
 *  to every site on vercel.app. These tests are the narrowing that makes
 *  the widening safe, and they are why it must not be quietly deleted.
 * ------------------------------------------------------------------ */

test("a token farmed on another vercel.app site is refused at the real site", () => {
  assert.equal(sameOrigin("evil-farm.vercel.app", "rishivalley.space"), false);
});

test("a token solved on one past deployment is refused at another", () => {
  // The widened list lets both render the widget; only this stops a token
  // from one being replayed at the other.
  assert.equal(sameOrigin("rv-connect-aaa111.vercel.app", "rv-connect-bbb222.vercel.app"), false);
});

test("the real site still signs its own members in", () => {
  assert.equal(sameOrigin("rishivalley.space", "rishivalley.space"), true);
});

test("a past deployment signs the owner in on itself", () => {
  assert.equal(sameOrigin("rv-connect-aaa111.vercel.app", "rv-connect-aaa111.vercel.app"), true);
});

test("www and the apex are one site, not a lockout", () => {
  assert.equal(sameOrigin("www.rishivalley.space", "rishivalley.space"), true);
  assert.equal(sameOrigin("rishivalley.space", "www.rishivalley.space"), true);
});

test("a Host header's port does not make the hosts differ", () => {
  // siteverify reports a bare hostname; a Host header carries the port.
  assert.equal(sameOrigin("localhost", "localhost:3000"), true);
});

test("case in a Host header does not make the hosts differ", () => {
  assert.equal(sameOrigin("RishiValley.Space", "rishivalley.space"), true);
});

test("unknown on either side fails OPEN, never locking members out", () => {
  // Deliberate: the Host header is not ours to control, and siteverify is
  // not obliged to return a hostname. Availability beats the farming case.
  assert.equal(sameOrigin(null, "rishivalley.space"), true);
  assert.equal(sameOrigin("rishivalley.space", null), true);
  assert.equal(sameOrigin(undefined, undefined), true);
  assert.equal(sameOrigin("", "rishivalley.space"), true);
});

test("a suffix is not a match: the check is the whole host", () => {
  // "notrishivalley.space" and "rishivalley.space.evil.com" both end or
  // start with the real host as a STRING; neither is the real host.
  assert.equal(sameOrigin("notrishivalley.space", "rishivalley.space"), false);
  assert.equal(sameOrigin("rishivalley.space.evil.com", "rishivalley.space"), false);
});

test("normaliseHost reduces a host to its comparable form", () => {
  assert.equal(normaliseHost("  WWW.Rishivalley.Space:443 "), "rishivalley.space");
  assert.equal(normaliseHost(":3000"), null);
  assert.equal(normaliseHost(null), null);
});
