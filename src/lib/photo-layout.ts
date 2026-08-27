/* ------------------------------------------------------------------ *
 *  One photograph of unknown shape, one column of known width.
 *  What happens to it?
 *
 *  This is the rule the owner picked in `/lab/crop` after eight of them
 *  were drawn against six awkward photographs at the three real column
 *  widths. It is LOCKED (docs/planning/collection-rework/spec.md §1 and
 *  §3.1); the reasoning is in that campaign's handover under D6 to D13
 *  and F8 to F13. In one paragraph:
 *
 *    Square or wider fills the column at its true shape, never cut and
 *    never barred, so a 21:9 is a thin strip and that is correct.
 *    Taller than wide is brought to 3:4 -- a phone sensor is 4:3, so a
 *    phone held upright shoots exactly that and passes through
 *    untouched -- drawn as large as a height ceiling allows, on a
 *    blurred bed of itself. The crop is aimed at the subject and
 *    clamped hard.
 *
 *  Everything here is pure and expressed as CSS the browser resolves on
 *  its own: a max-width and an aspect-ratio, never a measured pixel
 *  width. That matters. A rule that needs to know the column width can
 *  only run after layout, which is another frame, another reflow, and a
 *  page that jumps -- the exact complaint this is here to fix.
 * ------------------------------------------------------------------ */

/**
 * The widest a photograph is ever drawn, however wide its card grows.
 *
 * The feed column reaches 1216px on a large screen, and a photograph
 * stretched across all of it goes soft -- most of what people post is a
 * phone photo, and the stored file stops at 1920 on its long edge (image.ts).
 * The owner: "images in the feed are sometimes extremely stretched
 * particularly when you're viewing it on a wide screen monitor... and we get
 * extremely grainy things." 900px is his own number, given in the room.
 */
export const PHOTO_MAX_WIDTH = 900;

/**
 * The one shape every tall photograph is brought to: 3:4.
 *
 * Not 2:3 and not 4:5, and the reason is the phone. A phone camera's sensor
 * is 4:3, so held upright it produces a 3:4 photograph -- the most common
 * portrait anybody will ever post here, and at this target it passes through
 * completely untouched. 2:3 is the 35mm shape: right for the school
 * photographer's camera, wrong for everyone else, and it draws the picture
 * narrower with more blur beside it (525px wide against 467px at the 728px
 * column). A 9:16 screenshot keeps 75% of itself, which is the cost.
 */
export const TALL_TARGET = 3 / 4;

/**
 * The tallest a photograph may be drawn, in pixels. EVERY photograph.
 *
 * An absolute number and not a share of the column, which the lab room got
 * wrong first time: tying the ceiling to the column drew a 9:16 photo 201px
 * wide on a phone, smaller than what ships today, on the device where
 * portraits matter most. A ceiling is about the SCREEN's height and has
 * nothing to do with how wide the card is.
 *
 * It governs wide photographs too, which is a small extension of what spec
 * §3.1 says and the reason is arithmetic the spec did not do. Written
 * literally -- ceiling for tall, 900px cap for everything else -- a SQUARE
 * photograph comes out 728px tall in a laptop column and 900px on a wide
 * screen, so the shape the rule was built to bound (a portrait, 700px) ends up
 * SHORTER than one it was not. The handover's F9 saw this coming and left it
 * open: "at the 1216px wide column a SQUARE is 1216px tall, which the ceiling
 * does not touch because it only governs r < 1." So the ceiling applies to
 * everything, and a wide photograph obeys it the way a tall one does: by
 * narrowing, never by being cut. Only shapes between 1:1 and about 1.29:1 are
 * affected at all, and only on a column wider than 700px.
 *
 * The NUMBER is still open. 560, 700 and 840 were all built in `/lab/crop` and
 * none was picked; 700 is about three quarters of a laptop screen and is the
 * spec's assumption. It is this line and nothing else, so look at all three
 * with real photographs before settling it.
 */
export const TALL_CEILING = 700;

/**
 * How far the visible window may travel when a tall photograph is cut.
 *
 * The brakes, and they are the load-bearing part rather than a nicety. X
 * cropped timeline previews with a saliency model from 2018, audited it in
 * 2021, found it favoured white faces over Black faces and women over men,
 * and withdrew it -- "how to crop an image is a decision best made by
 * people". Our archive is about to fill up with photographs of people, so
 * three things have to hold together or the aim is not worth shipping.
 *
 * It only NUDGES: the crop is 25% at most, where X was cutting an arbitrary
 * image down to a small 16:9 preview and so choosing which of several people
 * you saw. It is CLAMPED, here: heads live in the upper half, so a floor at
 * 50% means the worst case of a bad guess is the plain centre crop we would
 * have done anyway. And the uploader must be able to OVERRIDE it, which is
 * X's own replacement and is spec §9 -- not built yet, and the reason to
 * build it is below.
 *
 * How much work the clamp is doing, measured rather than assumed: of the 41
 * photographs in the database on 2026-08-27, 14 have a focal point within 3%
 * of an edge of the frame and only 13 fall inside this band unclamped.
 * sharp's `attention` is a contrast heuristic and it goes for the bright sky.
 */
export const AIM_Y = { lo: 0.15, hi: 0.5 };
export const AIM_X = { lo: 0.25, hi: 0.75 };

/** What the renderer needs to know about a photograph. The subset of the
 *  `Image` row that decides layout, so a caller can pass a row straight in. */
export type PhotoFacts = {
  width: number;
  height: number;
  focalX: number;
  focalY: number;
};

/** A photograph as a card receives it: what decides its layout, plus the
 *  smear that stands in for it while it loads and fills the space beside it
 *  when it does not span its column. */
export type StoredPhoto = PhotoFacts & { blurDataUrl: string | null };

export type PhotoFrame = {
  /** `max-width` for the photograph, in px. Under it, the photo fills its
   *  column: the frame is `width: 100%` and this bounds it. */
  maxWidth: number;
  /** `aspect-ratio`, as CSS. The photo's own shape when it is square or
   *  wider; 3/4 when it is taller than wide. This is what reserves the
   *  space, so the page stops jumping as each photograph lands. */
  aspectRatio: string;
  /** `object-position`. Only ever moves for a photo that is being cut. */
  objectPosition: string;
  /** How much of the original frame survives, 0 to 1. Nothing renders this;
   *  it is what the tests assert on and what a future crop handle shows. */
  kept: number;
};

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const pct = (v: number) => `${Math.round(clamp(v, 0, 1) * 100)}%`;

/** Overlap between a photo of ratio `r` and a box of ratio `box`, 0 to 1. */
function keptAt(r: number, box: number): number {
  return Math.min(r, box) / Math.max(r, box);
}

/**
 * The frame one photograph gets, anywhere in the app: the feed, a Catch-up
 * answer, a letter. One rule, one implementation, no second opinion.
 */
export function framePhoto(facts: PhotoFacts): PhotoFrame {
  const { width, height, focalX, focalY } = facts;
  const r = width / height;

  /* Square or wider: true shape, never cut, never barred, so a 21:9 is a thin
     strip. Owner, verbatim: "for very wide images like 21:9, our solution
     should definitely not add bars above and below it. we should just let it
     be a thin photo. it's only the tall ones that are tricky."

     Two things bound how large it is drawn and both are widths, because
     nothing here is ever cut: the 900px cap, and the height ceiling expressed
     as the width that produces it. For anything wider than about 1.29:1 the
     cap is the binding one and the ceiling never comes into it. */
  if (r >= 1) {
    return {
      maxWidth: Math.min(PHOTO_MAX_WIDTH, Math.round(TALL_CEILING * r)),
      aspectRatio: `${width} / ${height}`,
      objectPosition: "50% 50%",
      kept: 1,
    };
  }

  /* Taller than wide: one shape, so every tall card in the feed matches, and
     as large as the ceiling allows. At the 728px laptop column that is
     525 x 700 with 102px of bed each side; on a phone the ceiling never
     binds, the photo simply fills the width and no bed shows at all. */
  return {
    // Same ceiling, same conversion: it is a HEIGHT, and the shape is fixed,
    // so it reaches CSS as the width that produces it. 700px at 3:4 is 525.
    maxWidth: Math.min(PHOTO_MAX_WIDTH, Math.round(TALL_CEILING * TALL_TARGET)),
    aspectRatio: "3 / 4",
    /* Taller than the target loses its top and bottom, so the window travels
       vertically; shallower than it (a 4:5, say) loses its sides, so the
       window travels sideways instead. Either way it starts where a person
       would put it and moves towards the machine's guess only as far as the
       clamp allows. */
    objectPosition:
      r < TALL_TARGET
        ? `50% ${pct(clamp(focalY, AIM_Y.lo, AIM_Y.hi))}`
        : `${pct(clamp(focalX, AIM_X.lo, AIM_X.hi))} 50%`,
    kept: keptAt(r, TALL_TARGET),
  };
}

/**
 * The `sizes` promise for a photograph under this rule, given what the
 * surface would otherwise have said.
 *
 * `sizes` tells the browser how wide the slot will be so it can pick a rung
 * off the srcset, and a wrong one is worse than none (image-cdn.ts spells out
 * what each surface's own measurement is). The rule above puts a hard cap on
 * top of every one of those: whatever the column does, the photograph stops
 * at 900px, or at 525px if it is tall. So the honest promise is the smaller
 * of the two, which is what `min()` says.
 */
export function photoSizes(columnSizes: string, frame: PhotoFrame): string {
  return columnSizes
    .split(",")
    .map((clause) => {
      /* A `sizes` clause is an optional media condition and then a length. The
         condition is the parenthesised group at the START, which is the only
         reliable way to split it: the length itself is often a `calc()` and
         may hold parentheses of its own, so looking for the last `") "` cuts
         `calc((100vw - 104px) / 2)` in half. */
      const [, condition = "", slot = clause.trim()] =
        /^(\([^)]*\))\s+(.+)$/.exec(clause.trim()) ?? [];
      return `${condition ? `${condition} ` : ""}min(${slot}, ${frame.maxWidth}px)`;
    })
    .join(", ");
}

/**
 * What the browser will actually draw, given a column width.
 *
 * The rule above is CSS on purpose -- a max-width and an aspect-ratio, which
 * the browser resolves against whatever the column turns out to be -- so
 * nothing in the app calls this. It exists so the rule can be ASSERTED at the
 * three real column widths (358 on a phone, 728 on a laptop, 1216 where the
 * feed stops growing) rather than eyeballed, which is what spec §12 asks for.
 * It is the same arithmetic `width: 100%; max-width: N` does.
 */
export function drawnSize(
  frame: PhotoFrame,
  columnWidth: number
): { width: number; height: number } {
  const width = Math.min(columnWidth, frame.maxWidth);
  const [w, h] = frame.aspectRatio.split("/").map((n) => Number(n.trim()));
  return { width, height: width * (h / w) };
}
