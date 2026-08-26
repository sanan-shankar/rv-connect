import assert from "node:assert/strict";
import test from "node:test";

import { read } from "../../lib/test-kit.mjs";

/* ------------------------------------------------------------------ *
 *  The flyer aims at the last perch the destination reported, so the
 *  destination has to report every time the perch MOVES.
 *
 *  It watched the hoopoe's own box, which is a fixed square: it never
 *  resizes, so on a page that reflowed after mount the observer fired
 *  once and never again. /signup reflows every time — its trivia
 *  question arrives a beat after mount and wraps to a second or third
 *  line, and because the column is vertically centred, a taller question
 *  lifts the box without changing its size at all. The bird went on
 *  aiming at the rect the box had while the question still read "...",
 *  and landed that far below it (owner, 2026-08-26).
 *
 *  The column is the thing that resizes. Watching it is the whole fix,
 *  and this is the tripwire for anyone who trims the observer back.
 * ------------------------------------------------------------------ */

const HOOK = read("src/components/mascot/use-flight-arrival.ts");

test("the perch report follows the column, not just the box inside it", () => {
  assert.ok(
    HOOK.includes("ro.observe(entranceRef.current)"),
    "the ResizeObserver must watch the entrance column, or a late reflow moves the perch unreported"
  );
  assert.ok(
    HOOK.includes("ro.observe(el)"),
    "and still watch the box itself, which is what a font swap or an icon change resizes"
  );
});

test("the report is the observer's own delivery, never a call in the effect", () => {
  // Dated 2026-08-11 in the hook: calling reportPerchRect() directly from the
  // effect read geometry off a dirty tree and forced an ~85ms layout, which
  // the flight paid for in skipped frames. ResizeObserver callbacks run after
  // layout, so the initial delivery reports just as early and forces nothing.
  const effect = HOOK.slice(HOOK.indexOf("const ro = new ResizeObserver"));
  const body = effect.slice(0, effect.indexOf("perchWatchStop.current = stop"));
  assert.ok(
    !/^\s*reportPerchRect\(\);/m.test(body),
    "reportPerchRect() must not be called straight from the effect; the observer's initial delivery is the report"
  );
});
