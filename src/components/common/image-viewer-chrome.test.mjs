import assert from "node:assert/strict";
import test from "node:test";
import { read, decomment } from "../../lib/test-kit.mjs";

/* ------------------------------------------------------------------ *
 *  Pins for the two things the owner reported on 2026-09-03, looking
 *  at his own photographs:
 *
 *    "don't fade out the controls on the image viewer if we're hovering
 *     over anything. I keep scrolling it and every now and then it fades
 *     out and I click next picture and it exits and i've totally lost
 *     track of where i was"
 *
 *    "also don't allow me to scroll or interact with whatever's behind
 *     the image viewer while i'm in it"
 *
 *  Both are mechanisms whose absence LOOKS FINE. The viewer opens, the
 *  photograph fills the screen, the chrome comes and goes -- and the
 *  cursor parked on the Next arrow watches it disappear, or the page
 *  behind quietly scrolls under a photograph nobody meant to leave.
 *  Shape assertions in the house style, so `npm run check` answers
 *  rather than the owner.
 * ------------------------------------------------------------------ */

const VIEWER = "src/components/common/image-viewer.tsx";
const GLOBALS = "src/app/globals.css";

test("the page lock goes on <html>, because <body> cannot reach the viewport here", () => {
  const src = decomment(read(VIEWER));
  assert.ok(
    /documentElement[\s\S]{0,80}style\.overflow\s*=\s*"hidden"/.test(src),
    "the viewer stopped locking `document.documentElement`. A `body` lock does " +
      "nothing in this app: overflow only propagates from <body> to the viewport " +
      "when the root element's own overflow is `visible` in both axes, and " +
      "globals.css sets `overflow-x: clip` on <html>. The page went on scrolling " +
      "behind the photograph for a fortnight on exactly that mistake"
  );
  assert.ok(
    !/document\.body\.style\.overflow/.test(src),
    "the body lock is back. It is not a harmless second belt -- it is the one " +
      "that read as a lock while doing nothing"
  );
  assert.ok(
    /overflow-x:\s*clip/.test(read(GLOBALS)),
    "globals.css no longer clips <html> sideways, which is the reason the lock " +
      "has to live on <html>. If this rule really is gone, re-check the lock " +
      "rather than deleting this test"
  );
});

test("wheel and touch are held inside the overlay, and the caption keeps its scroll", () => {
  const src = decomment(read(VIEWER));
  assert.ok(
    /addEventListener\("wheel",\s*block,\s*\{\s*passive:\s*false\s*\}\)/.test(src) &&
      /addEventListener\("touchmove",\s*block,\s*\{\s*passive:\s*false\s*\}\)/.test(src),
    "the wheel/touchmove guard lost its non-passive listeners. A passive handler " +
      "cannot preventDefault, so iOS rubber-bands the page under the photograph"
  );
  assert.ok(
    /data-viewer-scroll/.test(src),
    "the one scroll box inside the viewer -- a caption opened past its 42vh -- " +
      "lost its `data-viewer-scroll` exemption, so the guard now freezes it"
  );
  assert.ok(
    /dialogRef\.current\?\.contains\(target\)/.test(src),
    "the guard stopped asking whether the event is even inside this overlay. " +
      "The Edit dialog opens ON TOP of a viewer that stays open behind it, and " +
      "its own max-h-[90vh] body has to keep scrolling"
  );
});

test("the chrome never withdraws from under a cursor that is resting on it", () => {
  const src = decomment(read(VIEWER));
  assert.ok(
    /\[data-viewer-chrome\]:hover/.test(src),
    "the idle timer stopped checking for a hovered control. A parked mouse sends " +
      "no pointermove, so the Next arrow faded out from under a cursor aiming at " +
      "it and the click fell through to the wash, which CLOSES the viewer"
  );
  assert.ok(
    /matchMedia\("\(hover: hover\)"\)/.test(src),
    "the hover check is being asked on touchscreens too, where `:hover` sticks " +
      "after a tap and would leave the chrome up for good"
  );
  const marks = src.match(/data-viewer-chrome/g) ?? [];
  assert.ok(
    marks.length >= 5,
    `only ${marks.length} references to data-viewer-chrome; the two step arrows ` +
      "and the two chrome blocks all have to carry it, or the hover check silently " +
      "protects nothing"
  );
  assert.ok(
    /addEventListener\("wheel",\s*nudge/.test(src),
    "a wheel stopped counting as activity. Zooming with the trackpad or scrolling " +
      "a long caption moves no pointer at all, so the chrome used to withdraw in " +
      "the middle of the one gesture that proves somebody is using it"
  );
  assert.ok(
    !/addEventListener\("pointerdown",\s*nudge/.test(src),
    "a press is counting as activity again. It must not: `onTapPhoto` toggles the " +
      "chrome, so a pointerdown that first sets \"shown\" inverts the tap, and on a " +
      "phone tapping a withdrawn chrome puts it away again"
  );
});
