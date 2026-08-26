import assert from "node:assert/strict";
import test from "node:test";

import { isLetterDraft } from "./draft-rule.ts";
import { read, decomment } from "./test-kit.mjs";

/* Audit C-122. createPost skipped requireVerifiedMember on the raw
 * `saveAsDraft` flag alone, while the row it then wrote was only a draft when
 * the kind was also "letter". A submission carrying saveAsDraft=true and no
 * kind therefore skipped the gate AND stored status: "published" -- an
 * unverified, unconfirmed account publishing to the whole feed. */

test("a draft is a letter and nothing else", () => {
  assert.equal(isLetterDraft({ kind: "letter", saveAsDraft: true }), true);
  assert.equal(isLetterDraft({ kind: "post", saveAsDraft: true }), false);
  assert.equal(isLetterDraft({ saveAsDraft: true }), false);
  assert.equal(isLetterDraft({ kind: null, saveAsDraft: true }), false);
  assert.equal(isLetterDraft({ kind: "letter", saveAsDraft: false }), false);
  assert.equal(isLetterDraft({ kind: "letter" }), false);
  assert.equal(isLetterDraft({}), false);
});

/* The bug was not the predicate, it was that there were two of them. Pin the
 * property that fixes it: both decisions in createPost -- whether to skip the
 * verified-member gate, and whether the row is stored as a draft -- read the
 * SAME predicate. If either grows its own copy again they can drift again. */

test("createPost decides the gate-skip and the stored status through one predicate", () => {
  const src = decomment(read("src/app/(main)/feed/actions.ts"));
  const start = src.indexOf("export async function createPost");
  assert.ok(start > -1, "createPost is gone");
  const body = src.slice(start, src.indexOf("\nexport ", start + 1));

  const gateSkip = /const\s+savingDraft\s*=\s*([\s\S]*?);\n/.exec(body);
  assert.ok(gateSkip, "createPost no longer binds savingDraft");
  assert.match(
    gateSkip[1],
    /isLetterDraft\(/,
    "the verified-member gate-skip has its own draft test again"
  );

  const stored = /const\s+isDraft\s*=\s*([\s\S]*?);\n/.exec(body);
  assert.ok(stored, "createPost no longer binds isDraft");
  assert.match(
    stored[1],
    /isLetterDraft\(/,
    "the stored-status decision has its own draft test again"
  );

  // And the gate still exists to be skipped.
  assert.match(body, /requireVerifiedMember\(/, "the verified-member gate is gone");
});
