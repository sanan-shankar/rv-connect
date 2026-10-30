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

/* Code outside back-closes.ts that moves through history or rewrites the
   current entry, each with the reason it cannot pull an entry out from under
   an open layer. A layer's entry carries back-closes.ts's mark in its state:
   popping it, or replacing the state of it, is how the stack comes undone. */
const MAY_TOUCH_HISTORY = {
  "src/components/settings/dark-gauntlet.tsx":
    "the page's own Go back button, a whole route and never a layer; it leaves the page, which any open layer leaves with",
  "src/components/settings/lights-on.tsx":
    "one press turns dark mode off and returns to the page the member came from; a route, not a layer",
  "src/components/collection/collection-client.tsx":
    "the filters write the Collection's own address in place, and they cannot change while the photo viewer covers them",
  "src/components/guide/guide-tour-start.tsx":
    "drops ?tour=replay from the Feed's entry before the tour opens its window, so it rewrites the page's entry, never a layer's",
  "src/components/announcement/announcement-start.tsx":
    "the same ?announcement=replay drop, before the window opens. Listed on 2026-10-30 while a peer session's file was still uncommitted, so its absence is not a failure; once it is committed it is held like the rest",
};
const MAY_BE_ABSENT = new Set(["src/components/announcement/announcement-start.tsx"]);

/* `router.back()` IS `history.back()` (Next's app-router-instance.js:
   `back: () => window.history.back()`), and closing the guide by calling it
   was the guide's own history bug. The sweep looked only for the literal
   `history.back(`, so the exact call it was written against walked past it
   (bug audit 3, L9-06). Forward and replaceState were unswept too. */
const TOUCHES_HISTORY = /\bhistory\.(?:pushState|replaceState|back|forward|go)\s*\(|\brouter\.(?:back|forward)\s*\(/;

test("nothing but back-closes.ts pushes or pops history", () => {
  const offenders = files
    .filter((f) => f.path !== "src/lib/back-closes.ts" && !MAY_TOUCH_HISTORY[f.path])
    .filter((f) => TOUCHES_HISTORY.test(f.src))
    .map((f) => f.path);
  assert.deepEqual(offenders, [], "these move or rewrite history outside src/lib/back-closes.ts");

  for (const path of Object.keys(MAY_TOUCH_HISTORY)) {
    const f = files.find((x) => x.path === path);
    if (!f && MAY_BE_ABSENT.has(path)) continue;
    assert.ok(f, `${path} is gone; drop its entry`);
    assert.match(f.src, TOUCHES_HISTORY, `${path} no longer touches history; drop its entry`);
  }
});

test("the history sweep sees router.back(), forward and replaceState", () => {
  for (const call of [
    "onClick={() => router.back()}",
    "router.forward();",
    "window.history.forward();",
    'window.history.replaceState(null, "", "/feed");',
    "history.go(-1);",
  ]) {
    assert.match(call, TOUCHES_HISTORY, call);
  }
  assert.doesNotMatch("router.push(href); router.refresh();", TOUCHES_HISTORY);
});
