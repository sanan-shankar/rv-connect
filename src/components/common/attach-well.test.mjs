import assert from "node:assert/strict";
import test from "node:test";
import { read, decomment } from "../../lib/test-kit.mjs";

/* ------------------------------------------------------------------ *
 *  Pins for the attach-well material (owner round, 2026-08-29: "make
 *  sure no information is repeated... take the best of both").
 *
 *  The disease these guard against is drift-by-copy: the well's look
 *  was hand-rolled a second time in the Collection, and a redundant
 *  DialogDescription restated every input method the well already
 *  shows. Static-shape assertions in the security-regressions style --
 *  they fail `npm run check` the moment either shape comes back.
 * ------------------------------------------------------------------ */

const ATTACH = "src/components/common/attach-image-dialog.tsx";
const ROOM = "src/components/collection/contribute-room.tsx";

test("the attach dialog never re-describes the well's doors", () => {
  const src = decomment(read(ATTACH));
  assert.ok(
    !src.includes("DialogDescription"),
    "AttachImageDialog has a DialogDescription again -- the well below it already " +
      "shows every way in, so a description here can only repeat it"
  );
});

test("there is one well material, and both drop surfaces wear it", () => {
  const attach = decomment(read(ATTACH));
  const room = decomment(read(ROOM));
  assert.ok(
    /export function wellClass/.test(attach),
    "wellClass is no longer exported from attach-image-dialog"
  );
  assert.ok(
    /wellClass/.test(room) && /WELL_PRESS/.test(room),
    "the Collection's invitation stopped wearing the shared well material " +
      "(wellClass + WELL_PRESS) and is presumably hand-rolling its own again"
  );
  // The dashed border that MEANS "photographs go in here" is declared once.
  // (Profiles use dashed for editable slots -- a different meaning, different
  // file, deliberately untouched by this pin.)
  const dashedHere = (attach.match(/border-dashed/g) ?? []).length;
  assert.equal(
    dashedHere,
    1,
    "attach-image-dialog declares border-dashed more than once -- the well look is escaping wellClass"
  );
  assert.ok(
    !room.includes("border-dashed"),
    "contribute-room hand-writes border-dashed instead of using wellClass"
  );
});

test("the room's title is visible, not sr-only with a stand-in heading", () => {
  const room = decomment(read(ROOM));
  // The 2026-08-28 shape hid the DialogTitle from sighted users and let a
  // styled paragraph impersonate it -- the inversion the owner could feel
  // but not name. The header carries no sr-only in either room state now.
  const header = room.slice(room.indexOf("<DialogHeader"), room.indexOf("</DialogHeader>"));
  assert.ok(header.length > 0, "contribute-room lost its DialogHeader");
  assert.ok(
    !header.includes("sr-only"),
    "the contribute room's DialogTitle went back to sr-only"
  );
});
