import { test } from "node:test";
import assert from "node:assert/strict";
import {
  AIM_Y,
  drawnSize,
  framePhoto,
  photoSizes,
  PHOTO_MAX_WIDTH,
  TALL_CEILING,
  TALL_TARGET,
} from "./photo-layout.ts";

/* ------------------------------------------------------------------ *
 *  One photograph in a column. The rule the owner picked in /lab/crop,
 *  asserted at the three column widths this app actually has, across
 *  every aspect ratio from 9:16 to 21:9 -- which the brief asked for by
 *  name: "I need really thorough testing for this... you have to try
 *  with all kinds of aspect ratios."
 * ------------------------------------------------------------------ */

/** The three real column widths: a phone, a laptop, and where the feed stops. */
const COLUMNS = [358, 728, 1216];

/** A spread of shapes, named the way a person would name them. */
const SHAPES = [
  { name: "9:16 phone video still", w: 1080, h: 1920 },
  { name: "2:3 camera portrait", w: 1200, h: 1800 },
  { name: "3:4 phone portrait", w: 1200, h: 1600 },
  { name: "4:5 Instagram portrait", w: 1080, h: 1350 },
  { name: "1:1 square", w: 1200, h: 1200 },
  { name: "4:3 phone landscape", w: 1600, h: 1200 },
  { name: "3:2 camera landscape", w: 1800, h: 1200 },
  { name: "16:9 widescreen", w: 1920, h: 1080 },
  { name: "21:9 panorama", w: 1920, h: 823 },
];

const centred = { focalX: 0.5, focalY: 0.5 };
const frameOf = (s, focal = centred) => framePhoto({ width: s.w, height: s.h, ...focal });

test("no photograph is ever drawn taller than the ceiling", () => {
  // The owner's one firm constraint on this whole decision, verbatim:
  // "definitely don't want some huge ass pictures to keep scrolling past."
  for (const shape of SHAPES) {
    for (const column of COLUMNS) {
      const { height } = drawnSize(frameOf(shape), column);
      assert.ok(
        height <= TALL_CEILING + 0.5,
        `${shape.name} at ${column}px came out ${Math.round(height)}px tall`
      );
    }
  }
});

test("nothing is ever stretched", () => {
  // Either the frame IS the photograph's own shape, or it is the 3:4 box the
  // photo is cut to fill. A frame of any third shape would mean a distorted
  // photograph, which is the one thing that must never happen anywhere.
  for (const shape of SHAPES) {
    const frame = frameOf(shape);
    const [w, h] = frame.aspectRatio.split("/").map(Number);
    const framed = w / h;
    const real = shape.w / shape.h;
    const isTrueShape = Math.abs(framed - real) < 0.001;
    const isTallBox = Math.abs(framed - TALL_TARGET) < 0.001;
    assert.ok(isTrueShape || isTallBox, `${shape.name} framed at ${frame.aspectRatio}`);
  }
});

test("square or wider runs free: full width, true shape, nothing cut", () => {
  for (const shape of SHAPES.filter((s) => s.w >= s.h)) {
    const frame = frameOf(shape);
    assert.equal(frame.kept, 1, `${shape.name} lost some of itself`);
    assert.equal(frame.objectPosition, "50% 50%");
    // Bounded by the 900px cap, or by the ceiling for a near-square photo --
    // whichever binds first. Never wider than the cap.
    assert.ok(frame.maxWidth <= PHOTO_MAX_WIDTH);
    // A 21:9 is a thin strip and that is correct -- no bars, top or bottom.
    const { width, height } = drawnSize(frame, 728);
    assert.ok(Math.abs(width / height - shape.w / shape.h) < 0.001);
  }
});

test("a phone's own portrait passes through untouched, which is why 3:4", () => {
  // The whole argument for 3:4 over 2:3: a phone sensor is 4:3, so held
  // upright it shoots 3:4, and at this target that photograph is not cut at
  // all. It is the most common portrait anyone will ever post here.
  const frame = frameOf(SHAPES.find((s) => s.name.startsWith("3:4")));
  assert.equal(frame.kept, 1);
});

test("a tall photograph is cut a little, never a lot", () => {
  const kept = Object.fromEntries(
    SHAPES.filter((s) => s.w < s.h).map((s) => [s.name, frameOf(s).kept])
  );
  // 9:16 keeps 75%: the cost of the rule, and it is a screenshot or a video
  // still rather than a framed photograph. Nothing keeps less than that.
  assert.ok(Math.abs(kept["9:16 phone video still"] - 0.75) < 0.001);
  assert.ok(Math.abs(kept["2:3 camera portrait"] - 8 / 9) < 0.001);
  assert.equal(kept["3:4 phone portrait"], 1);
  assert.ok(Math.abs(kept["4:5 Instagram portrait"] - 0.9375) < 0.001);
  for (const [name, k] of Object.entries(kept)) {
    assert.ok(k >= 0.75, `${name} kept only ${Math.round(k * 100)}%`);
  }
});

test("every tall card is the same size, which is the point of one shape", () => {
  const sizes = SHAPES.filter((s) => s.w < s.h).map((s) =>
    JSON.stringify(drawnSize(frameOf(s), 728))
  );
  assert.equal(new Set(sizes).size, 1, "tall cards came out ragged");
  // 700px tall at 3:4 is 525 wide, leaving 101.5px of bed each side of a
  // 728px column. Both numbers are load-bearing enough to write down.
  assert.deepEqual(JSON.parse(sizes[0]), { width: 525, height: 700 });
});

test("on a phone nothing narrows and no bed shows", () => {
  // The ceiling is about the screen's height and never binds on a phone: a
  // portrait simply fills the column. The earlier version of this rule tied
  // the ceiling to the column width and drew a 9:16 photo 201px wide here,
  // smaller than what shipped, on the device where portraits matter most.
  for (const shape of SHAPES) {
    const { width } = drawnSize(frameOf(shape), 358);
    assert.equal(width, 358, `${shape.name} narrowed on a phone`);
  }
});

test("a photograph stops growing at 900px however wide the card gets", () => {
  // The wide-screen complaint: "images in the feed are sometimes extremely
  // stretched particularly when you're viewing it on a wide screen monitor".
  for (const shape of SHAPES) {
    const { width } = drawnSize(frameOf(shape), 1216);
    assert.ok(width <= PHOTO_MAX_WIDTH, `${shape.name} grew to ${width}px`);
  }
});

test("the aim is clamped, so a bad guess cannot do damage", () => {
  const tall = SHAPES[0]; // 9:16, cut top and bottom, so the window moves in y
  const top = frameOf(tall, { focalX: 0.5, focalY: 0 });
  const bottom = frameOf(tall, { focalX: 0.5, focalY: 1 });
  assert.equal(top.objectPosition, `50% ${AIM_Y.lo * 100}%`);
  assert.equal(bottom.objectPosition, `50% ${AIM_Y.hi * 100}%`);
  // The floor at 50% is the whole safety argument: the worst a wrong guess
  // can do is the plain centre crop we would have done anyway.
  assert.equal(bottom.objectPosition, "50% 50%");
});

test("a photo shallower than the box is aimed sideways, not downwards", () => {
  // A 4:5 is taller than wide but SHALLOWER than 3:4, so filling the box cuts
  // its sides. Moving the window down would be aiming along the axis that is
  // not being cut, which does nothing at all.
  const frame = frameOf(SHAPES.find((s) => s.name.startsWith("4:5")), {
    focalX: 0.9,
    focalY: 0.1,
  });
  assert.equal(frame.objectPosition, "75% 50%");
});

test("the sizes promise carries the cap, and survives a nested calc", () => {
  // `sizes` is a promise about layout and a wrong one is worse than none. The
  // cap has to reach it: a card 1216px wide whose photo stops at 900 must not
  // ask for a 1456px file. The split has to survive a calc with parentheses
  // of its own, which a naive one cuts in half.
  const half = "(max-width: 767px) 50vw, calc((100vw - 104px) / 2)";
  const out = photoSizes(half, frameOf(SHAPES.find((s) => s.name.startsWith("16:9"))));
  assert.equal(
    out,
    "(max-width: 767px) min(50vw, 900px), min(calc((100vw - 104px) / 2), 900px)"
  );
});
