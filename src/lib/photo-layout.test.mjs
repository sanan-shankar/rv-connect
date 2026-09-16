import { test } from "node:test";
import assert from "node:assert/strict";
import {
  AIM_Y,
  AIM_WIDE_Y,
  CROP_BUDGET,
  CAROUSEL_BOX_CAP,
  carouselHeight,
  carouselHeightCss,
  carouselWidth,
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
    // And the height clamp cuts rather than squashes: `object-fit: cover`
    // against a box the aspect-ratio and the ceiling decide between them.
  }
});

test("square or wider runs free, and a panorama is never cut at all", () => {
  for (const shape of SHAPES.filter((s) => s.w >= s.h)) {
    const frame = frameOf(shape);
    // Bounded by the 900px cap, or by the ceiling plus the crop budget for a
    // near-square photo -- whichever binds first. Never wider than the cap.
    assert.ok(frame.maxWidth <= PHOTO_MAX_WIDTH);
  }
  /* From 1.8:1 up -- the 900px cap over the 500px ceiling -- the cap binds
     first, so the budget is never spent and the photograph keeps every pixel
     at every column width. That is the shape the owner was most explicit
     about: "we should just let it be a thin photo." */
  for (const shape of SHAPES.filter((s) => s.w / s.h >= PHOTO_MAX_WIDTH / PHOTO_MAX_HEIGHT)) {
    const frame = frameOf(shape);
    assert.equal(frame.kept, 1, `${shape.name} lost some of itself`);
    for (const column of COLUMNS) {
      const { width, height } = drawnSize(frame, column);
      assert.ok(
        Math.abs(width / height - shape.w / shape.h) < 0.002,
        `${shape.name} was cut at ${column}`
      );
    }
  }
});

test("a landscape fills its column rather than sitting on a bed", () => {
  /* The owner's complaint on 2026-08-28, looking at two of his own posts:
     "i'll allow you to crop 20% of an image to have fewer blur bars. so we
     don't have bars on these types of things." Both were landscapes between
     1:1 and 1.46:1, the band where the 500px ceiling could only be obeyed by
     narrowing the photograph. It is now obeyed by cutting up to a fifth off
     the top and bottom instead. */
  for (const r of [1.18, 1.28, 1.34, 1.456]) {
    const frame = frameOf({ w: r * 1000, h: 1000 });
    assert.equal(drawnSize(frame, 728).width, 728, `${r}:1 was bedded in a 728px card`);
  }
  /* The budget is a fifth and no more, so it does not reach every shape at
     every width -- a square in a card wider than 625px keeps a bed, a smaller
     one. What it must never do is leave the bed WIDER than it was. */
  const square = frameOf({ w: 1000, h: 1000 });
  assert.equal(drawnSize(square, 728).width, 625);
});

test("no photograph is ever cut by more than the budget", () => {
  // The other half of the same decision: the budget is a ceiling, not a
  // licence. A square keeps its bed rather than losing a third of itself.
  for (const shape of SHAPES.filter((s) => s.w >= s.h)) {
    const frame = frameOf(shape);
    assert.ok(frame.kept >= 1 - CROP_BUDGET - 0.001, `${shape.name} kept only ${frame.kept}`);
    for (const column of COLUMNS) {
      const { width, height } = drawnSize(frame, column);
      const kept = Math.min(shape.w / shape.h, width / height) / Math.max(shape.w / shape.h, width / height);
      assert.ok(kept >= 1 - CROP_BUDGET - 0.001, `${shape.name} at ${column} kept ${kept}`);
    }
  }
});

test("a wide photograph is aimed up and down, and braked both ways", () => {
  // What it loses is its top and bottom, so that is the axis the window
  // travels on -- and symmetrically, because sharp's guess on a landscape
  // goes for the bright sky, which is the half worth losing.
  const wide = SHAPES.find((s) => s.name.startsWith("4:3"));
  assert.equal(frameOf(wide, { focalX: 0.5, focalY: 0 }).objectPosition, `50% ${AIM_WIDE_Y.lo * 100}%`);
  assert.equal(frameOf(wide, { focalX: 0.5, focalY: 1 }).objectPosition, `50% ${AIM_WIDE_Y.hi * 100}%`);
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
  /* And a 4:5 keeps all of itself, because 3:4 is a FLOOR. Forcing it down to
     3:4 cut its sides to draw it NARROWER than its own shape allows -- 375px
     against 400 in a 728px column -- which is a cut that pays for a bigger
     bed. The owner caught it: "aren't we just cutting off material from the
     side and adding a blur bar when we could just leave that material and
     have less blur bar." */
  assert.equal(kept["4:5 Instagram portrait"], 1);
  for (const [name, k] of Object.entries(kept)) {
    assert.ok(k >= 0.75, `${name} kept only ${Math.round(k * 100)}%`);
  }
});

test("every tall card is the same HEIGHT, which is what a scroll feels", () => {
  /* The rhythm that matters is vertical: the ceiling makes every tall card
     exactly as tall, so the feed scrolls evenly whatever shapes are in it.
     Their WIDTHS differ now, deliberately -- a photograph between 3:4 and
     square keeps its own shape rather than being cut narrower to match. */
  const drawn = SHAPES.filter((s) => s.w < s.h).map((s) => drawnSize(frameOf(s), 728));
  assert.equal(new Set(drawn.map((d) => d.height)).size, 1, "tall cards came out ragged");
  assert.equal(drawn[0].height, PHOTO_MAX_HEIGHT);
  // 500px tall at 3:4 is 375 wide; at 4:5 it is 400, which is the whole point.
  const width = (name) => drawnSize(frameOf(SHAPES.find((s) => s.name.startsWith(name))), 728).width;
  assert.equal(width("9:16"), 375);
  assert.equal(width("3:4"), 375);
  assert.equal(width("4:5"), 400);
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

test("a hand-aimed crop is not braked, because the brake is on the guess", () => {
  /* Spec sec. 9's crop handle. The clamp above exists because sharp's
     `attention` is a contrast heuristic that goes for the bright sky -- of the
     first 41 photographs measured, 14 landed within 3% of an edge. A person
     who has dragged the window has looked at the photograph, and X's own
     conclusion after withdrawing their saliency crop was that "how to crop an
     image is a decision best made by people". Braking them would make the
     handle lie: the window would settle somewhere they did not put it. */
  const tall = SHAPES[0]; // 9:16
  const wide = SHAPES.find((s) => s.name.startsWith("4:3"));
  for (const shape of [tall, wide]) {
    for (const focalY of [0, 0.05, 0.85, 1]) {
      const guessed = frameOf(shape, { focalX: 0.5, focalY });
      const aimed = frameOf(shape, { focalX: 0.5, focalY, focalSet: true });
      assert.equal(
        aimed.objectPosition,
        `50% ${Math.round(focalY * 100)}%`,
        `${shape.name} at ${focalY} was braked despite being aimed by hand`
      );
      // And the point of the flag: without it, the same number is braked.
      assert.notEqual(aimed.objectPosition, guessed.objectPosition);
    }
  }
});

test("aiming by hand changes where the window sits and nothing else", () => {
  // It must not move the box, the cap or the ceiling: this is a decision about
  // WHAT is kept, never about how large the photograph is drawn.
  for (const shape of SHAPES) {
    const guessed = frameOf(shape, { focalX: 0.5, focalY: 0.9 });
    const aimed = frameOf(shape, { focalX: 0.5, focalY: 0.9, focalSet: true });
    for (const key of ["maxWidth", "maxHeight", "aspectRatio", "kept"]) {
      assert.deepEqual(aimed[key], guessed[key], `${shape.name} moved its ${key}`);
    }
  }
});

test("a photograph that keeps its whole frame is never aimed, hand or not", () => {
  /* What the crop handle keys off: it renders nothing when `kept` is 1, so
     this is the assertion that the button cannot appear on a photograph with
     no window to move. A 4:5 is the case -- taller than 3:4, so it keeps
     everything. */
  const four5 = SHAPES.find((s) => s.name.startsWith("4:5"));
  const frame = frameOf(four5, { focalX: 0.5, focalY: 0.1, focalSet: true });
  assert.equal(frame.kept, 1);
  assert.equal(frame.objectPosition, "50% 50%");
});

test("a tall photograph is only ever trimmed top and bottom", () => {
  /* The sideways case is gone with the rule that created it. Nothing tall is
     drawn narrower than its own shape any more, so there is no axis but the
     vertical one to cut, and a photograph that keeps all of itself is not
     aimed at all. */
  for (const shape of SHAPES.filter((s) => s.w < s.h)) {
    const frame = frameOf(shape, { focalX: 0.9, focalY: 0.1 });
    assert.ok(frame.objectPosition.startsWith("50% "), `${shape.name} aimed sideways`);
  }
  const four5 = frameOf(SHAPES.find((s) => s.name.startsWith("4:5")), { focalX: 0.9, focalY: 0.1 });
  assert.equal(four5.objectPosition, "50% 50%", "a 4:5 keeps all of itself, so nothing is aimed");
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
      for (const row of drawnRows(ratios, caps, Math.min(width, PHOTO_MAX_WIDTH), GAP, PHOTO_ROW_TARGET, PHOTO_MAX_HEIGHT)) {
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

/* ------------------------------------------------------------------ *
 *  A carousel: one shape, agreed on by the set.
 * ------------------------------------------------------------------ */


test("a carousel is as wide as its widest photograph may be drawn, and no wider", () => {
  const pano = SHAPES.find((s) => s.name.startsWith("21:9"));
  const tall = SHAPES.find((s) => s.name.startsWith("9:16"));
  // Three portraits stay as narrow as one portrait: 500px of ceiling at 3:4.
  assert.equal(carouselWidth([tall, tall, tall].map(frameOf)), Math.round(PHOTO_MAX_HEIGHT * TALL_TARGET));
  // Three panoramas reach the same 900px cap a single panorama reaches.
  assert.equal(carouselWidth([pano, pano, pano].map(frameOf)), PHOTO_MAX_WIDTH);
  // Mixed: the widest decides, so the widest is never made small to spare
  // the narrowest a bed.
  assert.equal(
    carouselWidth([tall, pano, tall].map(frameOf)),
    carouselWidth([pano].map(frameOf))
  );
});

test("every photograph in a carousel is drawn exactly as it would be posted alone", () => {
  /* The rule, asserted rather than described. This is what the two earlier
     shared-SHAPE versions could not say: under the median rule the owner's own
     Colosseum came out 375 x 351 in a 728px card beside two portraits, where
     posted alone it is 728 x 500. */
  for (const combo of combinations(3)) {
    const frames = combo.map(frameOf);
    const frameWidth = carouselWidth(frames);
    for (const column of COLUMNS) {
      // The frame caps the column; each photograph is then drawn inside it.
      const inside = Math.min(column, frameWidth);
      for (const [i, shape] of combo.entries()) {
        assert.deepEqual(
          drawnSize(frames[i], inside),
          drawnSize(frames[i], column),
          `${shape.name} beside ${combo.map((c) => c.name).join(" + ")} at ${column}px`
        );
      }
    }
  }
});

test("a carousel's box is one height for the set, and it is never over the ceiling", () => {
  for (const combo of combinations(3)) {
    const frames = combo.map(frameOf);
    const frameWidth = carouselWidth(frames);
    for (const column of COLUMNS) {
      const inside = Math.min(column, frameWidth);
      const heights = frames.map((f) => drawnSize(f, inside).height);
      const box = carouselHeight(frames, inside);
      const names = combo.map((c) => c.name).join(" + ");

      assert.ok(box <= PHOTO_MAX_HEIGHT + 0.01, `${box}px is over the ceiling (${names})`);
      /* Between the shortest and the tallest: never taller than the tallest
         photograph (that would bed every one of them) and never shorter than
         the shortest (that would cut something that already fits). */
      assert.ok(box <= Math.max(...heights) + 0.01, `box exceeds the tallest (${names})`);
      assert.ok(box >= Math.min(...heights) - 0.01, `box is under the shortest (${names})`);

      for (const [i, shape] of combo.entries()) {
        assert.ok(
          drawnSize(frames[i], inside).width <= frameWidth + 0.01,
          `${shape.name} overflows a ${frameWidth}px frame`
        );
        /* The bound the whole rule exists for. Anything shorter than the box
           is bedded, and the bed may never be more than the photograph. */
        if (heights[i] < box) {
          assert.ok(
            box <= heights[i] * CAROUSEL_BOX_CAP + 0.01,
            `${shape.name} sits in ${(box / heights[i]).toFixed(2)}x its own height (${names})`
          );
        }
      }
    }
  }
});

test("one orientation costs nothing: the cap never binds on a set that agrees", () => {
  /* The common case, and the reason the rule starts from the tallest. Three
     phone portraits, three phone landscapes, three of anything alike: every
     height is the same, so the box is that height and not a pixel of anyone's
     picture is bedded or trimmed. */
  for (const shape of SHAPES) {
    const frames = [shape, shape, shape].map(frameOf);
    for (const column of COLUMNS) {
      const inside = Math.min(column, carouselWidth(frames));
      const alone = drawnSize(frames[0], inside).height;
      assert.equal(
        carouselHeight(frames, inside),
        alone,
        `${shape.name} x3 was not drawn at its own height in a ${column}px column`
      );
    }
  }
});

test("the box the owner is looking at: 16:9, 20:9 and a 9:20 in a phone card", () => {
  /* His one real three-photograph post, 2026-09-16, and the numbers he was
     shown before choosing this rule. Under the rule this replaced the card was
     196px, then 157px, then 464px -- it nearly tripled between two slides,
     under his thumb. */
  const frames = [
    { w: 1600, h: 900 },
    { w: 1600, h: 720 },
    { w: 185, h: 412 },
  ].map(frameOf);
  const box = carouselHeight(frames, Math.min(348, carouselWidth(frames)));
  assert.equal(Math.round(box), 313);

  const heights = frames.map((f) => drawnSize(f, 348).height);
  // The two wide ones are bedded, and by less than a quarter of the frame each side.
  assert.equal(Math.round((box - heights[0]) / 2), 59);
  assert.equal(Math.round((box - heights[1]) / 2), 78);
  // The portrait is trimmed rather than given a 464px frame to sit in.
  assert.equal(Math.round((box / heights[2]) * 100), 68);
});

test("the CSS box and the arithmetic box are the same number", () => {
  /* `carouselHeightCss` is what ships and `carouselHeight` is what these tests
     assert on, so the two drifting apart would make every assertion above
     worthless. They are one expression over two algebras (`boxHeight`); this
     evaluates the CSS one to prove it. */
  /** Split on a separator that is not inside a nested call. */
  const splitTop = (text, separator) => {
    const parts = [];
    let depth = 0;
    let start = 0;
    for (let i = 0; i < text.length; i++) {
      if (text[i] === "(") depth++;
      else if (text[i] === ")") depth--;
      else if (text[i] === separator && depth === 0) {
        parts.push(text.slice(start, i));
        start = i + 1;
      }
    }
    parts.push(text.slice(start));
    return parts.map((part) => part.trim());
  };

  const evaluate = (css, cqw) => {
    const text = css.trim();
    const call = /^(min|max|calc)\((.*)\)$/s.exec(text);
    if (!call) {
      const [, n, unit] = /^([\d.]+)(px|cqw)?$/.exec(text) ?? [];
      assert.ok(n !== undefined, `cannot read CSS term ${text}`);
      return unit === "cqw" ? (Number(n) / 100) * cqw : Number(n);
    }
    const values = splitTop(call[2], ",").map((argument) => {
      // A term is one expression, optionally multiplied by plain numbers.
      const [head, ...factors] = splitTop(argument, "*");
      return factors.reduce((product, f) => product * Number(f), evaluate(head, cqw));
    });
    if (call[1] === "calc") return values[0];
    return call[1] === "min" ? Math.min(...values) : Math.max(...values);
  };

  for (const combo of combinations(3)) {
    const frames = combo.map(frameOf);
    for (const column of COLUMNS) {
      const inside = Math.min(column, carouselWidth(frames));
      assert.ok(
        Math.abs(evaluate(carouselHeightCss(frames), inside) - carouselHeight(frames, inside)) < 0.01,
        `CSS and arithmetic disagree for ${combo.map((c) => c.name).join(" + ")} at ${column}px`
      );
    }
  }
});

test("the owner's Colosseum: a landscape beside two portraits is not shrunk to fit them", () => {
  /* 2026-08-28, looking at his own post: three photographs, two upright and
     one of the Colosseum, in a card about 850px wide. "why are all the photos
     fixed at that aspect ratio... that photo can take up much more space but
     we're not letting it??" Under the median rule the frame was 3:4, so the
     landscape was drawn 375 x 351 inside it. */
  const tall = SHAPES.find((s) => s.name.startsWith("3:4"));
  const wide = SHAPES.find((s) => s.name.startsWith("4:3"));
  const frames = [tall, wide, tall].map(frameOf);
  const inside = Math.min(728, carouselWidth(frames));

  const landscape = drawnSize(frames[1], inside);
  assert.equal(landscape.width, 728);
  assert.equal(landscape.height, PHOTO_MAX_HEIGHT);
  // Its neighbours are untouched: still the 375 x 500 a portrait is alone.
  const portrait = drawnSize(frames[0], inside);
  assert.equal(portrait.width, Math.round(PHOTO_MAX_HEIGHT * TALL_TARGET));
  assert.equal(portrait.height, PHOTO_MAX_HEIGHT);
});
