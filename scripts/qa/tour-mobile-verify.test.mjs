import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const scriptPath = new URL("./tour-mobile-verify.mjs", import.meta.url);

/* `tour-mobile-verify.mjs` is a manual script -- a human runs it and reads its
   output -- so its log lines, its retry wording and its list of tour stops are
   between it and whoever is watching. Pinning those here only made harmless
   edits to a dev tool fail `npm run check`, which is how this file grew to
   assert the exact text of a console.error.

   What is NOT between it and the human is how it signs in. This is a tool that
   holds DEV_LOGIN_SECRET and drives a real browser, and the four assertions
   below are the C1/H16 conditions on that: it authenticates by POSTing the
   secret to /api/dev-login rather than the deleted no-secret path; the base URL
   it is handed must be loopback; and the origin is re-checked AFTER navigation,
   so a redirect cannot walk the secret off the machine. */
test("the mobile tour script cannot send the dev secret anywhere but loopback", async () => {
  const source = await readFile(scriptPath, "utf8");

  assert.match(source, /requireLoopbackBaseUrl\(process\.argv\[2\]/, "an arbitrary base URL is accepted again");
  assert.match(source, /assertSameOriginAfterNavigation\(baseUrl, page\.url\(\)\)/, "the post-navigation origin check is gone");
  assert.match(source, /await fetch\(`\$\{baseUrl\}\/api\/dev-login`/, "sign-in no longer goes through dev-login");
  assert.doesNotMatch(source, /page\.evaluate\(async \(email\)/, "the deleted secretless admin-login path is back");
});
