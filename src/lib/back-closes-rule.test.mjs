import test from "node:test";
import assert from "node:assert/strict";
import { join, relative } from "node:path";
import { ROOT, read, decomment, walk, SKIP_DIRS } from "./test-kit.mjs";

/* ------------------------------------------------------------------ *
 *  Back closes what covers the page, and only back-closes.ts touches
 *  history to do it.
 *
 *  Owner, 2026-09-14: swiping back from a Collection photograph "takes me
 *  to feed". Nothing that covered the screen owned a history entry. The
 *  fix is one module (src/lib/back-closes.ts) that every overlay goes
 *  through, so these pin the three ways it comes undone:
 *
 *   - a dialog or sheet built on Base UI directly, skipping the wrapper
 *     that wires the gesture in;
 *   - a hand-drawn overlay losing its useBackCloses call;
 *   - a second piece of code pushing or popping history on its own, which
 *     is what the guide did before this and what the module's stack
 *     cannot see.
 * ------------------------------------------------------------------ */

const files = walk(join(ROOT, "src"), { skip: (n) => SKIP_DIRS.includes(n) || n === "lab" })
  .filter((f) => /\.tsx?$/.test(f))
  .map((f) => ({ path: relative(ROOT, f), src: decomment(read(f)) }));

test("only ui/dialog and ui/sheet build on Base UI's dialog, and both wire the back gesture", () => {
  const direct = files.filter((f) => /@base-ui\/react\/(dialog|alert-dialog|drawer)/.test(f.src));
  assert.deepEqual(
    direct.map((f) => f.path).sort(),
    ["src/components/ui/dialog.tsx", "src/components/ui/sheet.tsx"]
  );
  for (const f of direct) assert.match(f.src, /useBackClosableRoot\(props\)/, f.path);
});

test("every hand-drawn overlay calls useBackCloses", () => {
  const overlays = [
    "src/components/common/image-viewer.tsx",
    "src/components/catchups/settings/settings-surface.tsx",
    "src/components/directory/alumni-map.tsx",
    "src/components/catchups/edition/reader.tsx",
  ];
  for (const path of overlays) {
    const f = files.find((x) => x.path === path);
    assert.ok(f, `${path} is gone; move this entry with it`);
    assert.match(f.src, /useBackCloses\(/, path);
  }
  /* A new aria-modal surface is an overlay by its own declaration. */
  for (const f of files.filter((x) => /aria-modal/.test(x.src))) {
    assert.match(f.src, /useBackCloses\(|useBackClosableRoot\(/, `${f.path} is aria-modal but back does not close it`);
  }
});

test("nothing but back-closes.ts pushes or pops history", () => {
  const offenders = files
    .filter((f) => f.path !== "src/lib/back-closes.ts")
    .filter((f) => /history\.(pushState|back|go)\s*\(/.test(f.src))
    .map((f) => f.path);
  assert.deepEqual(offenders, []);
});
