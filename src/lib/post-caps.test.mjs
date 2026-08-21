import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { POST_CONTENT_MAX, POST_TOO_LONG, postContentMax } from "./post-caps.ts";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const read = (p) => readFileSync(resolve(ROOT, p), "utf8");

/* The two ends of a post's life have to agree on how long it may be. They did
 * not: creation accepted 20,000 characters for any kind while editing refused
 * anything over 5,000 for a plain post, so a long post could be written and
 * then never saved again, not even with no changes (audit B-047). */

test("the ceiling depends on the kind, and an unknown kind is a plain post", () => {
  assert.equal(postContentMax("letter"), POST_CONTENT_MAX.letter);
  assert.equal(postContentMax("post"), POST_CONTENT_MAX.post);
  assert.equal(postContentMax(undefined), POST_CONTENT_MAX.post);
  assert.equal(postContentMax(null), POST_CONTENT_MAX.post);
  assert.equal(postContentMax("anything else"), POST_CONTENT_MAX.post);
});

test("a plain post's ceiling is lower than a letter's", () => {
  // If these ever became equal the conditional cap would be pointless, and if
  // they inverted the composer's "this would make a lovely Letter" nudge would
  // be pointing at the shorter option.
  assert.ok(POST_CONTENT_MAX.post < POST_CONTENT_MAX.letter);
});

test("both ends read the ceiling from this module, neither hard-codes it", () => {
  const actions = read("src/app/(main)/feed/actions.ts");
  assert.ok(
    !/const cap = isLetter \? \d+ : \d+/.test(actions),
    "editPost hard-codes its own cap again instead of sharing the constant"
  );
  assert.match(actions, /postContentMax/, "editPost no longer uses the shared cap");

  const validators = read("src/lib/validators.ts");
  assert.match(validators, /postContentMax\(d\.kind\)/, "postSchema no longer caps per kind");
  assert.ok(
    !/content: z\.string\(\)\.min\(1, "Post cannot be empty"\)\.max\(20000\)/.test(validators),
    "postSchema is back to one flat ceiling for both kinds"
  );
});

test("the refusal points at a Letter rather than just saying no", () => {
  assert.match(POST_TOO_LONG, /Letter/);
  assert.match(POST_TOO_LONG, new RegExp(String(POST_CONTENT_MAX.post)));
  assert.ok(!POST_TOO_LONG.includes("—"), "em dash in member-facing copy");
});
