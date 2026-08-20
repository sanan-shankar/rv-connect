import assert from "node:assert/strict";
import test from "node:test";

import { originAllowed } from "./origin-rule.ts";

/* The cross-site origin rule (audit M33), phrased as attacks. */

test("a cross-site POST's origin is refused", () => {
  assert.equal(originAllowed("https://evil.example", "rishivalley.space"), false);
});

test("a subdomain is not the site", () => {
  assert.equal(originAllowed("https://rishivalley.space.evil.example", "rishivalley.space"), false);
});

test("the literal 'null' origin (sandboxed iframe) is refused", () => {
  assert.equal(originAllowed("null", "rishivalley.space"), false);
});

test("a garbage origin header is refused, not crashed on", () => {
  assert.equal(originAllowed("not a url", "rishivalley.space"), false);
});

test("the site calling itself passes", () => {
  assert.equal(originAllowed("https://rishivalley.space", "rishivalley.space"), true);
});

test("localhost dev with its port passes", () => {
  assert.equal(originAllowed("http://localhost:3000", "localhost:3000"), true);
});

test("a preview deployment passes against its own host", () => {
  assert.equal(originAllowed("https://rv-alumni-abc123.vercel.app", "rv-alumni-abc123.vercel.app"), true);
});

test("no Origin header (curl, probes, servers) passes — no ambient cookie to ride", () => {
  assert.equal(originAllowed(null, "rishivalley.space"), true);
});

test("an Origin with no Host to compare against is refused", () => {
  assert.equal(originAllowed("https://rishivalley.space", null), false);
});
