import assert from "node:assert/strict";
import test from "node:test";

import {
  assertSameOriginAfterNavigation,
  cookieDomainForBaseUrl,
  requireLoopbackBaseUrl,
} from "./local-base-url.mjs";
import { fetchSessionCookie } from "./_dev-login.mjs";
import { credLogin } from "./_probe-kit.mjs";

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

test("no sign-in sends the dev-login secret to an address off this machine", async () => {
  /* `npm run screenshot:auth <url>` used to post the secret to whatever site
     the URL named (bug audit 3, C1-01). The refusal comes before any request:
     a fetch here fails the test. */
  const realFetch = globalThis.fetch;
  const realSecret = process.env.DEV_LOGIN_SECRET;
  globalThis.fetch = async () => {
    throw new Error("fetch was called");
  };
  process.env.DEV_LOGIN_SECRET = "x".repeat(40);
  try {
    for (const base of [
      "https://rishivalley.space",
      "https://example.com/feed",
      "http://192.168.1.20:3000",
      "http://admin@localhost:3000",
    ]) {
      await assert.rejects(fetchSessionCookie(base, "someone@example.com"), /off this machine/, base);
      await assert.rejects(credLogin(base, { email: "a@example.com", password: "p", devBypass: "x" }), /off this machine/, base);
    }
    // This machine still gets as far as the request.
    await assert.rejects(fetchSessionCookie("http://localhost:3000/feed", "someone@example.com"), /fetch was called/);
    await assert.rejects(credLogin("http://127.0.0.1:3100", { email: "a@example.com", password: "p", devBypass: "x" }), /fetch was called/);
  } finally {
    globalThis.fetch = realFetch;
    if (realSecret === undefined) delete process.env.DEV_LOGIN_SECRET;
    else process.env.DEV_LOGIN_SECRET = realSecret;
  }
});
