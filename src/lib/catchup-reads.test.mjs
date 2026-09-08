/* ------------------------------------------------------------------ *
 *  The read mark (build phase 5, spec 3.9): who has opened which
 *  Edition.
 *
 *  Run: node --test src/lib/catchup-reads.test.mjs
 *
 *  Nothing DRAWS it yet -- the list that shows an unread Edition
 *  differently is build phase 6 -- so every guarantee here is one a
 *  future page will read back and cannot check for itself. The mark is
 *  written from a server render, fire-and-forget, against the live
 *  database; there is no fake to exercise it with, so these read the
 *  real source and fail the moment a guarantee goes missing.
 * ------------------------------------------------------------------ */

import { test } from "node:test";
import assert from "node:assert/strict";

import { read, decomment } from "./test-kit.mjs";

const READER = "src/app/(main)/catchups/edition/[editionId]/page.tsx";

test("an Edition is only marked read once it is published", () => {
  /* The trap this exists to stop, and it is why the mark is not simply
     ContentView: the reader records a VIEW before it knows the Edition's
     status, so a deep link followed while an Edition was still collecting
     would mark it read, and it would come out looking read on the day it was
     published. The mark therefore sits after the `status !== "published"`
     return, not beside recordView. */
  const src = decomment(read(READER));
  const gate = src.indexOf('if (status !== "published")');
  const mark = src.indexOf("markEditionRead(");
  const view = src.indexOf('recordView(session?.user?.id, "edition"');
  assert.notEqual(gate, -1, "the published gate is gone; the mark's placement means nothing now");
  assert.notEqual(mark, -1, "nothing marks an Edition read any more");
  assert.ok(mark > gate, "an unpublished Edition is being marked read");
  assert.ok(view < gate, "recordView moved; it counts a view of any status, by design");
});

test("the mark is written off the render's path", () => {
  // after(), like recordView beside it: a member waits for the page, never for
  // a bookkeeping row.
  const src = decomment(read(READER));
  assert.match(src, /after\(\(\) => markEditionRead\(/);
});

test("re-opening an Edition keeps the FIRST time you read it", () => {
  /* `update: {}` rather than a touch of readAt. "When did you first see this"
     is the only question the mark can answer; re-reading an Edition a year
     later must not make it look new, and no surface counts anything from it
     (R32: "you're trying so hard to include useless information"). */
  const src = decomment(read("src/lib/catchup-reads.ts"));
  assert.match(src, /catchupEditionRead\.upsert/);
  assert.match(src, /update: \{\}/);
  assert.ok(!/readAt:/.test(src), "the mark now writes readAt, so a re-read looks like a first read");
});

test("a failed mark costs a mark, never a page", () => {
  const src = decomment(read("src/lib/catchup-reads.ts"));
  assert.match(src, /catch \(err\)/, "markEditionRead can throw into a render again");
  // ...and it says so in development, because a guard that hides its own
  // breakage is worse than no guard.
  assert.match(src, /NODE_ENV !== "production"/);
});

test("the demo writes marks too, or nothing there is ever read", () => {
  /* Every write in the demo goes through one allowlist, and a model missing
     from it is refused silently for a caller that swallows its errors -- which
     this one does. Without the row, the demo's list would draw every Edition
     as unread for ever, on the build he shows people. */
  const src = decomment(read("src/lib/demo.ts"));
  assert.match(src, /"CatchupEditionRead"/);
});

test("the mark dies with its member and with its Edition", () => {
  const schema = read("prisma/schema.prisma");
  const model = schema.slice(
    schema.indexOf("model CatchupEditionRead {"),
    schema.indexOf("}", schema.indexOf("model CatchupEditionRead {"))
  );
  assert.ok(model, "CatchupEditionRead is gone");
  // Both sides Cascade: a purged account leaves no marks behind, and an
  // Edition removed in the cleanup phase does not strand rows pointing at it.
  assert.equal((model.match(/onDelete: Cascade/g) ?? []).length, 2);
  // The pair is the identity. A surrogate id would let one member mark one
  // Edition twice, which is the one thing this table must not allow.
  assert.match(model, /@@id\(\[userId, editionId\]\)/);
});
