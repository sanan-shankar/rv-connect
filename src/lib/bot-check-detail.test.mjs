import { test } from "node:test";
import assert from "node:assert/strict";
import { botCheckDetail } from "./bot-check-detail.ts";

test("the server's own verdict always survives", () => {
  assert.equal(botCheckDetail("no-token", null, null), "no-token");
  assert.equal(botCheckDetail("wrong-host", null, "a.com != b.com"), "wrong-host (a.com != b.com)");
});

test("a hint the widget can actually produce is kept", () => {
  assert.equal(botCheckDetail("no-token", "timeout", null), "no-token/timeout");
  assert.equal(botCheckDetail("no-token", "blocked", null), "no-token/blocked");
  // The number is the whole value of the hint: 110200 is "domain not allowed",
  // which is a lookup rather than an investigation.
  assert.equal(botCheckDetail("no-token", "error-110200", null), "no-token/error-110200");
});

test("a hint the widget cannot produce is dropped, not escaped", () => {
  // The hint rides in on the sign-in POST, so it is whatever the caller sent.
  for (const junk of [
    "<script>alert(1)</script>",
    "timeout; DROP TABLE \"LoginAttempt\"",
    "error-110200 and a sentence after it",
    "../../etc/passwd",
    "a".repeat(500),
    "",
    "   ",
  ]) {
    assert.equal(botCheckDetail("no-token", junk, null), "no-token", `leaked: ${junk.slice(0, 30)}`);
  }
});

test("what siteverify said is kept, stripped of anything it would not have said", () => {
  assert.equal(
    botCheckDetail("refused", null, "timeout-or-duplicate"),
    "refused (timeout-or-duplicate)",
  );
  assert.equal(
    botCheckDetail("refused", null, "invalid-input-response,bad-request"),
    "refused (invalid-input-response,bad-request)",
  );
  assert.ok(!botCheckDetail("refused", null, "<b>x</b>").includes("<"));
});

test("never longer than the column is wide", () => {
  const long = botCheckDetail("no-token", "error-" + "9".repeat(200), "z".repeat(400));
  assert.ok(long.length <= 120, `was ${long.length}`);
});
