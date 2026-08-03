import assert from "node:assert/strict";
import test from "node:test";

import {
  assertSameOriginAfterNavigation,
  cookieDomainForBaseUrl,
  requireLoopbackBaseUrl,
} from "./local-base-url.mjs";

test("the authenticated QA origin accepts loopback HTTP URLs and normalizes paths", () => {
  assert.equal(requireLoopbackBaseUrl("http://localhost:3000/about"), "http://localhost:3000");
  assert.equal(requireLoopbackBaseUrl("https://127.0.0.1:3443"), "https://127.0.0.1:3443");
  assert.equal(requireLoopbackBaseUrl("http://[::1]:3000"), "http://[::1]:3000");
});

test("the authenticated QA origin rejects remote, credentialed, and non-HTTP URLs", () => {
  for (const unsafeUrl of [
    "https://example.com",
    "http://localhost.example.com:3000",
    "http://admin@localhost:3000",
    "file:///tmp/fake-app",
    "not a URL",
  ]) {
    assert.throws(
      () => requireLoopbackBaseUrl(unsafeUrl),
      /loopback HTTP\(S\) URL without credentials/
    );
  }
});

test("the authenticated QA origin rejects a redirect away from its trusted origin", () => {
  assert.doesNotThrow(() =>
    assertSameOriginAfterNavigation("http://localhost:3000", "http://localhost:3000/login")
  );
  assert.throws(
    () => assertSameOriginAfterNavigation("http://localhost:3000", "https://example.com/login"),
    /redirected away from its trusted local origin/
  );
});

test("the QA cookie domain preserves the brackets Chrome requires for IPv6 loopback", () => {
  assert.equal(cookieDomainForBaseUrl("http://localhost:3000"), "localhost");
  assert.equal(cookieDomainForBaseUrl("http://[::1]:3000"), "[::1]");
});
