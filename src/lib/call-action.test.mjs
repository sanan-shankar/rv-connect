import assert from "node:assert/strict";
import test from "node:test";
import { ACTION_FAILED, callAction } from "./call-action.ts";

test("a resolving action passes straight through, untouched", async () => {
  const out = await callAction(async () => ({ success: true, liked: true }));
  assert.deepEqual(out, { success: true, liked: true });
});

test("an action's own { error } is passed through, not replaced", async () => {
  // The helper must not overwrite a considered server-side refusal with a
  // generic connection message: "You are not a member of this group" is more
  // useful than "check your connection".
  const out = await callAction(async () => ({ error: "You are not a member of this group." }));
  assert.deepEqual(out, { error: "You are not a member of this group." });
});

test("a REJECTING action becomes an ordinary error result", async () => {
  const errors = [];
  const realError = console.error;
  console.error = (...args) => errors.push(args);
  try {
    const out = await callAction(async () => {
      throw new Error("Failed to find Server Action");
    });
    assert.deepEqual(out, { error: ACTION_FAILED });
  } finally {
    console.error = realError;
  }
  assert.equal(errors.length, 1, "the rejection was swallowed instead of logged");
});

test("a synchronous throw is caught too", async () => {
  const realError = console.error;
  console.error = () => {};
  try {
    const out = await callAction(() => {
      throw new Error("boom");
    });
    assert.deepEqual(out, { error: ACTION_FAILED });
  } finally {
    console.error = realError;
  }
});

test("the message is a sentence a member can act on, and carries no em dash", () => {
  assert.ok(!ACTION_FAILED.includes("—"), "em dash in member-facing copy");
  assert.match(ACTION_FAILED, /\.$/);
});
