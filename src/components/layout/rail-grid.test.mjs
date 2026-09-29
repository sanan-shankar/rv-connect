import assert from "node:assert/strict";
import test from "node:test";

import { railStartsAtTop } from "./rail-grid.ts";

/* ------------------------------------------------------------------ *
 *  Where the confirm-your-email chip may float in the rail's top corner:
 *  only where the rail starts level with the page header.
 *
 *  It floated on every /catchups page after the Catch-ups rework had
 *  changed them, landing on the index's "Start a Catch-up" pill and on a
 *  Catch-up's cover photograph (2026-09-29).
 * ------------------------------------------------------------------ */

test("the Feed's rail starts level with its header", () => {
  assert.equal(railStartsAtTop("/feed"), true);
});

test("no Catch-ups page does: the index has no rail, a home has a cover above it", () => {
  for (const p of [
    "/catchups",
    "/catchups/cmsepxoas000d04jr6xc30y3z",
    "/catchups/new",
    "/catchups/cmsepxoas000d04jr6xc30y3z/answer",
    "/catchups/edition/abc",
  ]) {
    assert.equal(railStartsAtTop(p), false, p);
  }
});

test("pages that never had a rail still do not", () => {
  for (const p of ["/directory", "/letters", "/profile/abc", "/welcome", "/feedback"]) {
    assert.equal(railStartsAtTop(p), false, p);
  }
});
