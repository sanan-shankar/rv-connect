import { test } from "node:test";
import assert from "node:assert/strict";
import {
  AIM_Y,
  drawnRatio,
  drawnRows,
  drawnSize,
  framePhoto,
  photoRatio,
  photoSizes,
  PHOTO_MAX_WIDTH,
  PHOTO_MAX_HEIGHT,
  PHOTO_ROW_TARGET,
  TALL_TARGET,
} from "./photo-layout.ts";

/** The gutter a post and a Catch-up answer use between photographs. */
const GAP = 8;

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
        height <= PHOTO_MAX_HEIGHT + 0.5,
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
  // 500px tall at 3:4 is 375 wide, leaving 177px of bed each side of a 728px
  // column. Both numbers are load-bearing enough to write down.
  assert.deepEqual(JSON.parse(sizes[0]), { width: 375, height: 500 });
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
  // A panorama: wide enough that the 900px cap binds rather than the ceiling.
  const out = photoSizes(half, frameOf(SHAPES.find((s) => s.name.startsWith("21:9"))));
  assert.equal(
    out,
    "(max-width: 767px) min(50vw, 900px), min(calc((100vw - 104px) / 2), 900px)"
  );
});

/* ------------------------------------------------------------------ *
 *  Several photographs together. The brief asked for this by name:
 *  "all kinds of combinations of aspect ratios in the same post."
 *
 *  These assert what the BROWSER will do, because the layout is flexbox
 *  rather than measured pixels -- `drawnRows` is the same arithmetic
 *  flex-basis and flex-grow perform, written out so it can be checked.
 * ------------------------------------------------------------------ */

/** A card lays a row out from the FRAMED ratio and the single-photo cap. */
const asRow = (shapes) => {
  const frames = shapes.map((s) => frameOf(s));
  return { ratios: frames.map(drawnRatio), caps: frames.map((f) => f.maxWidth) };
};

/** The grid crops nothing, so its ratio is the file's own; the cap is the
 *  trailing-row guard, 2.5x the target. */
const asGrid = (shapes, target) => ({
  ratios: shapes.map(photoRatio),
  caps: shapes.map((s) => (s.w / s.h) * target * 2.5),
});

/** Every ordered pair and triple of the nine shapes, which is the "all kinds
 *  of combinations" the brief asked for: 81 pairs and 729 triples. */
function combinations(n) {
  if (n === 1) return SHAPES.map((s) => [s]);
  return combinations(n - 1).flatMap((rest) => SHAPES.map((s) => [...rest, s]));
}

test("every row fills its container exactly, at every column width", () => {
  for (const width of COLUMNS) {
    const container = Math.min(width, PHOTO_MAX_WIDTH);
    for (const combo of [...combinations(2), ...combinations(3)]) {
      const { ratios, caps } = asRow(combo);
      const rows = drawnRows(ratios, caps, container, GAP, PHOTO_ROW_TARGET);
      rows.forEach((row, i) => {
        const span = row.widths.reduce((a, b) => a + b, 0) + GAP * (row.widths.length - 1);
        /* A row that runs short did so because every photograph on it hit its
           own cap -- which is the single-photograph rule, so it is drawn
           exactly as it would have been posted alone. Anything else is the
           rows failing to line up, which is the whole point of the layout. */
        assert.ok(
          Math.abs(span - container) < 1 || row.capped,
          `${combo.map((s) => s.name).join(" + ")} at ${container}: row ${i} spans ${span} of ${container}`
        );
      });
    }
  }
});

test("no photograph in a row is ever a stamp beside its neighbour", () => {
  /* The measured failure this rule exists for: a real post holding a 1.77, a
     2.21 and a 0.45 drew the last one 72px wide beside a 357px neighbour.
     Framing first bounds the disparity, because the narrowest shape a row can
     hold is 3:4 and the widest that keeps its own shape is the panorama. */
  for (const combo of combinations(3)) {
    const { ratios, caps } = asRow(combo);
    for (const row of drawnRows(ratios, caps, 728, GAP, PHOTO_ROW_TARGET)) {
      if (row.widths.length < 2) continue;
      const ratio = Math.max(...row.widths) / Math.min(...row.widths);
      assert.ok(ratio <= 21 / 9 / TALL_TARGET + 0.01, `${combo.map((s) => s.name)} disparity ${ratio}`);
    }
  }
});

test("nothing in a card is ever drawn taller than the ceiling", () => {
  for (const width of COLUMNS) {
    for (const combo of [...combinations(2), ...combinations(3)]) {
      const { ratios, caps } = asRow(combo);
      for (const row of drawnRows(ratios, caps, Math.min(width, PHOTO_MAX_WIDTH), GAP, PHOTO_ROW_TARGET)) {
        assert.ok(
          row.height <= PHOTO_MAX_HEIGHT + 0.5,
          `${combo.map((s) => s.name)} at ${width}: ${row.height}px`
        );
      }
    }
  }
});

test("a phone gives a wide photograph its own row, a laptop packs three", () => {
  // The number PHOTO_ROW_TARGET exists to produce, and the reason the row
  // count is left to the browser rather than decided in JavaScript.
  const wide = SHAPES.find((s) => s.name.startsWith("3:2"));
  const three = asRow([wide, wide, wide]);
  assert.equal(drawnRows(three.ratios, three.caps, 358, GAP, PHOTO_ROW_TARGET).length, 3);
  assert.equal(drawnRows(three.ratios, three.caps, 728, GAP, PHOTO_ROW_TARGET).length, 1);
});

test("a photograph alone on a row is drawn exactly as if it were posted alone", () => {
  // What the per-photograph cap buys: a phone stacks them, and each one then
  // obeys the rule it would have obeyed on its own -- no second answer.
  for (const shape of SHAPES) {
    const frame = frameOf(shape);
    const [row] = drawnRows([drawnRatio(frame)], [frame.maxWidth], 358, GAP, PHOTO_ROW_TARGET);
    assert.equal(Math.round(row.widths[0]), Math.round(drawnSize(frame, 358).width), shape.name);
  }
});

test("the grid never crops, and its rows line up", () => {
  const TARGET = 220;
  for (const width of [358, 1112]) {
    const many = Array.from({ length: 34 }, (_, i) => SHAPES[i % SHAPES.length]);
    const { ratios, caps } = asGrid(many, TARGET);
    const rows = drawnRows(ratios, caps, width, 12, TARGET);
    rows.slice(0, -1).forEach((row, i) => {
      const span = row.widths.reduce((a, b) => a + b, 0) + 12 * (row.widths.length - 1);
      assert.ok(Math.abs(span - width) < 1, `row ${i} at ${width} spans ${span}`);
      // Equal heights within a row is what "nothing is cropped" costs and buys.
      row.widths.forEach((w, j) => {
        assert.ok(Math.abs(w / ratios[j] - row.height) < 0.01, `row ${i} height not shared`);
      });
    });
  }
});
