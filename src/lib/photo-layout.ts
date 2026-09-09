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
 * narrower with more blur beside it (375px wide against 333px at the 500px
 * ceiling). A 9:16 screenshot keeps 75% of itself, which is the cost.
 */
export const TALL_TARGET = 3 / 4;

/**
 * The tallest a photograph is ever drawn, in pixels. EVERY photograph.
 *
 * 500, the owner's number on 2026-08-27. `/lab/crop` offered 560, 700 and 840;
 * he picked 560 from the room and then went lower after living with it, for a
 * reason the room could not show because the room drew photographs rather than
 * posts: "560 makes one post take up my entire desktop screen which shouldn't
 * happen." A card is the photograph plus a byline, the words and the actions --
 * about 120px of it -- so the number that matters is the card's height, and on
 * a 900px-tall laptop window 560 leaves nothing else on screen. 500 does.
 * Which is the same constraint he opened with: "definitely don't want some
 * huge ass pictures to keep scrolling past."
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
 * photograph comes out 728px tall in a laptop column, so the shape the rule
 * was built to bound (a portrait, 420px x 560) ends up a third SHORTER than
 * one it was not. The handover's F9 saw this coming and left it open. So the
 * ceiling applies to everything, and a wide photograph obeys it the way a tall
 * one does: by narrowing, never by being cut.
 *
 * The lower the ceiling, the further that reaches, and at 500 it is worth
 * knowing where. A shape is narrowed only when `500 x ratio` is less than both
 * the column and the 900px cap, so: nothing at all on a phone; on a laptop
 * 1.46:1 and squarer, which is a small bed on an ordinary 4:3 (667 x 500, 30px
 * a side in a 728px column) and a wide one on a square (500 x 500, 114px a
 * side); on a wide screen everything up to 1.8:1, so all but a panorama.
 * Blurred beds are common by design -- they are what a bounded height costs
 * when nothing may ever be cut.
 */
export const PHOTO_MAX_HEIGHT = 500;

/**
 * How far the visible window may travel when a tall photograph is cut.
 *
 * Vertical only: nothing is ever trimmed at the sides (`framePhoto`).
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
 * have done anyway. And the uploader can OVERRIDE it, which is X's own
 * replacement and is spec §9: the crop handle in the composer sets
 * `focalSet`, and this whole band is switched off for an image somebody has
 * aimed by hand. The brake is on the guess, never on the person -- braking
 * them would make the handle lie, leaving the window somewhere they did not
 * put it.
 *
 * How much work the clamp is doing, measured rather than assumed: of the 41
 * photographs in the database on 2026-08-27, 14 have a focal point within 3%
 * of an edge of the frame and only 13 fall inside this band unclamped.
 * sharp's `attention` is a contrast heuristic and it goes for the bright sky.
 */
export const AIM_Y = { lo: 0.15, hi: 0.5 };

/**
 * The same brakes for a WIDE photograph, whose window travels up and down
 * because what it loses is its top and bottom.
 *
 * Symmetric, where the tall band is not, and for a reason: the tall band is
 * floored at 50% because heads live in the upper half of a portrait, so the
 * worst case of a bad guess is the centre crop. A landscape has no such rule
 * -- sharp's `attention` goes for the bright sky, which on a landscape is the
 * boring half -- so the window has to be free to move down as well as up. It
 * is a small movement either way: the crop below is at most 20% of the frame,
 * so the window can travel at most a tenth of it from centre.
 */
export const AIM_WIDE_Y = { lo: 0.25, hi: 0.75 };

/**
 * How much of a photograph we may cut to spare it a blurred bed.
 *
 * The owner's number and his own reversal, 2026-08-28, looking at two
 * landscapes in his feed with blur down both sides: *"i'll allow you to crop
 * 20% of an image to have fewer blur bars. so we don't have bars on these
 * types of things. obviously any time there's crop you use sharp to crop
 * decently well."*
 *
 * It buys exactly one thing, and only for a photograph SQUARE OR WIDER. Such
 * a photograph is never cut, so the 500px ceiling could only be obeyed by
 * NARROWING it, and a landscape between about 1:1 and 1.46:1 therefore came
 * out short of its column with blurred bed either side -- 27px a side on a
 * 4:3 in a 728px card, 82px on a 1.18:1. Twenty per cent of the frame is
 * enough to let almost all of them fill the column instead: at a 728px column
 * a photograph down to 1.18:1 now reaches both edges, where before it stopped
 * at 590. What it does NOT do is touch the tall rule. A tall photograph is
 * already brought to 3:4 and already keeps a bed, and 3:4 was chosen because
 * a phone's own portrait passes through it untouched (D7); spending this
 * budget there would start cutting the commonest portrait anybody posts to
 * buy back 46px of bed.
 */
export const CROP_BUDGET = 0.2;

/** A photograph's shape, and nothing else. It is all justified rows ever
 *  need, because they never crop: no focal point, because nothing is aimed. */
export type PhotoShape = { width: number; height: number };

/** What the renderer needs to know about a photograph. The subset of the
 *  `Image` row that decides layout, so a caller can pass a row straight in. */
export type PhotoFacts = PhotoShape & {
  focalX: number;
  focalY: number;
  /** True once the uploader aimed this crop by hand, which turns the clamps
   *  off for it. Optional so every existing caller, and every row written
   *  before the column existed, reads as "the machine guessed this". */
  focalSet?: boolean;
};

/** A photograph as a card receives it: what decides its layout, plus the
 *  smear that stands in for it while it loads and fills the space beside it
 *  when it does not span its column. */
export type StoredPhoto = PhotoFacts & { blurDataUrl: string | null };

export type PhotoFrame = {
  /** `max-width` for the photograph, in px. Under it, the photo fills its
   *  column: the frame is `width: 100%` and this bounds it. */
  maxWidth: number;
  /** `max-height` for the photograph, in px. What actually enforces the 500px
   *  ceiling now that a wide photograph is allowed to fill its column: the
   *  aspect-ratio below asks for the photograph's true height, this clamps it,
   *  and `object-fit: cover` takes the difference off the top and bottom.
   *  Both are known before a byte arrives, so the space is still reserved and
   *  the page still does not jump. */
  maxHeight: number;
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
  const { width, height, focalY } = facts;
  const r = width / height;
  /* Where the window sits. A hand-aimed image is used as given; a guessed one
     is braked into its band. Both are then held inside 0..1, because an
     object-position outside the frame is not a position. */
  const aim = (band: { lo: number; hi: number }) =>
    pct(facts.focalSet ? focalY : clamp(focalY, band.lo, band.hi));

  /* Square or wider: true shape, never cut, never barred, so a 21:9 is a thin
     strip. Owner, verbatim: "for very wide images like 21:9, our solution
     should definitely not add bars above and below it. we should just let it
     be a thin photo. it's only the tall ones that are tricky."

     Two things bound how large it is drawn and both are widths, because
     nothing here is ever cut: the 900px cap, and the height ceiling expressed
     as the width that produces it. For anything wider than about 1.29:1 the
     cap is the binding one and the ceiling never comes into it. */
  if (r >= 1) {
    /* The widest it can be drawn without losing anything: the 900px cap, or
       the width at which its true height is exactly the ceiling. Under this
       it is whole. */
    const whole = Math.min(PHOTO_MAX_WIDTH, Math.round(PHOTO_MAX_HEIGHT * r));
    /* And the widest it may be drawn at all, which is the same thing with the
       crop budget spent: 20% off the frame buys 25% more width. For anything
       from about 1.46:1 up the 900px cap binds first and nothing is ever cut. */
    const filled = Math.min(
      PHOTO_MAX_WIDTH,
      Math.round((PHOTO_MAX_HEIGHT / (1 - CROP_BUDGET)) * r)
    );
    return {
      maxWidth: filled,
      maxHeight: PHOTO_MAX_HEIGHT,
      aspectRatio: `${width} / ${height}`,
      /* Only moves once the ceiling is actually cutting, and then only up and
         down, because that is the axis being cut. */
      objectPosition: `50% ${aim(AIM_WIDE_Y)}`,
      /* The worst case, at a column wide enough for the cap to bind. On a
         phone no column is, so nothing is cut at all. */
      kept: whole / filled,
    };
  }

  /* Taller than wide. 3:4 is a FLOOR, not a target, and the difference is the
     owner's, 2026-08-28: "why do we make 4:5 into 3:4? aren't we just cutting
     off material from the side and adding a blur bar when we could just leave
     that material and have less blur bar."

     He is right, and it was strictly worse on every axis. A 4:5 forced to 3:4
     is drawn NARROWER than its own shape allows -- 375px against 400 in a
     728px column -- so the rule was cutting 6% off its sides in order to make
     the picture smaller and the bed wider. There is no reading of the rule
     that wanted that. The cut only ever pays when it makes the photograph
     WIDER, which is exactly the case of a photograph taller than 3:4: a 9:16
     goes from 281px to 375px by giving up its top and bottom.

     So the shape a tall photograph is brought to is `max(its own, 3:4)`.
     Anything between 3:4 and square keeps every pixel it came with and gets
     the smallest bed its shape allows; anything taller is brought to 3:4 as
     before. Two things follow. The bed is now never the price of a cut -- if
     we cut, it is to shrink the bed. And a tall photograph is only ever
     trimmed top and bottom, so the sideways aim this branch used to need is
     gone with the case that needed it.


     What went with the old rule was one shared width for every tall card,
     which is the smaller half of the rhythm: the height ceiling already makes
     every one of them exactly as tall, and that is what a scroll feels. */
  const shape = Math.max(r, TALL_TARGET);
  return {
    // The ceiling is a HEIGHT, and it reaches CSS as the width that produces
    // it: 500px at 3:4 is 375, at 4:5 it is 400.
    maxWidth: Math.min(PHOTO_MAX_WIDTH, Math.round(PHOTO_MAX_HEIGHT * shape)),
    maxHeight: PHOTO_MAX_HEIGHT,
    aspectRatio: shape === r ? `${width} / ${height}` : "3 / 4",
    /* Only ever the top and bottom now, so the window only travels vertically.
       It starts where a person would put it and moves towards the machine's
       guess as far as the clamp allows -- and no further, because heads live
       in the upper half and the floor at 50% means the worst a bad guess can
       do is the plain centre crop. A photograph that keeps all of itself is
       not aimed at all: there is no window to move, and saying otherwise in
       the CSS invites the next reader to believe something is being cut. */
    objectPosition: shape === r ? "50% 50%" : `50% ${aim(AIM_Y)}`,
    kept: keptAt(r, shape),
  };
}

/* ------------------------------------------------------------------ *
 *  A SET of photographs sharing one frame: the carousel.
 * ------------------------------------------------------------------ */

/**
 * How wide a carousel may be drawn, given what is in it.
 *
 * A CAROUSEL SHARES A HEIGHT, NOT A SHAPE. Two earlier versions shared a
 * shape instead (handover D21); the owner found the bill in his own feed on
 * 2026-08-28, where a shared shape drew the Colosseum 372 x 347 inside a
 * 372 x 495 frame in a card 850px wide -- "why are all the photos fixed at
 * that aspect ratio... that photo can take up much more space but we're not
 * letting it??" At its own shape it is 833 x 500, five times the area.
 *
 * What has to be stable is the CARD's height -- nothing may change size under
 * a reader's thumb mid-swipe. A shared aspect ratio delivers that and charges
 * every photograph that is not that shape for it.
 *
 * Sharing the HEIGHT gives the stable card for free and costs nothing:
 *
 *    every photograph in a carousel is drawn EXACTLY as it would have been
 *    had it been posted on its own,
 *
 * which is the same sentence <PhotoRows> already lives by for a photograph
 * alone on a row. The frame's height is then whichever of them is tallest,
 * and the browser works that out on its own -- a flex line's height is the
 * tallest thing on it, so there is nothing here to compute and nothing to
 * measure. All this function decides is how wide the frame may be, which is
 * the widest any one of them may be drawn.
 *
 * What it costs, honestly: a portrait beside a landscape now has a blurred bed
 * at its sides on a wide screen, where under the median rule the frame was
 * narrow and the portrait filled it. That is the same bed the same portrait
 * gets when posted alone in the same column, and it buys the landscape beside
 * it five times the picture.
 */
export function carouselWidth(frames: PhotoFrame[]): number {
  if (!frames.length) return PHOTO_MAX_WIDTH;
  return Math.min(PHOTO_MAX_WIDTH, Math.max(...frames.map((f) => f.maxWidth)));
}

/**
 * The `sizes` promise for a photograph under this rule, given what the
 * surface would otherwise have said.
 *
 * `sizes` tells the browser how wide the slot will be so it can pick a rung
 * off the srcset, and a wrong one is worse than none (image-cdn.ts spells out
 * what each surface's own measurement is). The rule above puts a hard cap on
 * top of every one of those: whatever the column does, the photograph stops
 * at 900px, or at 375px if it is tall. So the honest promise is the smaller
 * of the two, which is what `min()` says.
 */
export function photoSizes(columnSizes: string, frame: PhotoFrame): string {
  return mapSizes(columnSizes, (slot) => `min(${slot}, ${frame.maxWidth}px)`);
}

/**
 * Rewrite every slot in a `sizes` list, leaving the media conditions alone.
 *
 * A `sizes` clause is an optional media condition and then a length. The
 * condition is the parenthesised group at the START, which is the only
 * reliable way to split it: the length itself is often a `calc()` and may hold
 * parentheses of its own, so looking for the last `") "` cuts
 * `calc((100vw - 104px) / 2)` in half.
 */
function mapSizes(columnSizes: string, slotFn: (slot: string) => string): string {
  return columnSizes
    .split(",")
    .map((clause) => {
      const [, condition = "", slot = clause.trim()] =
        /^(\([^)]*\))\s+(.+)$/.exec(clause.trim()) ?? [];
      return `${condition ? `${condition} ` : ""}${slotFn(slot)}`;
    })
    .join(", ");
}

/**
 * What the browser will actually draw, given a column width.
 *
 * The rule above is CSS on purpose -- a max-width and an aspect-ratio, which
 * the browser resolves against whatever the column turns out to be -- so
 * nothing NEEDS this to draw a photograph. It exists so the rule can be
 * ASSERTED at the three real column widths (358 on a phone, 728 on a laptop,
 * 1216 where the feed stops growing) rather than eyeballed, which is what
 * spec §12 asks for. It is the same arithmetic `width: 100%; max-width: N`
 * does, which is why the two callers that want the number ahead of the paint
 * -- the carousel's height table and /lab/crop's readout -- ask this rather
 * than measure the DOM.
 */
export function drawnSize(
  frame: PhotoFrame,
  columnWidth: number
): { width: number; height: number } {
  const width = Math.min(columnWidth, frame.maxWidth);
  const [w, h] = frame.aspectRatio.split("/").map((n) => Number(n.trim()));
  /* `max-height` beside `aspect-ratio`: the shape asks for a height, the
     ceiling clamps it, and the difference is what `object-fit: cover` cuts. */
  return { width, height: Math.min(frame.maxHeight, width * (h / w)) };
}

/* ================================================================== *
 *  SEVERAL photographs together: a post with two or three, a Catch-up
 *  photo wall, the Collection grid.
 *
 *  Justified rows, which is what the owner's reference gallery does
 *  (<https://gallery.alekziol.com/mechsoc-banquet/>, Pixieset, measured
 *  on 2026-08-26) and what Flickr, Google Photos and Unsplash all do.
 *  Every photograph keeps the shape it is drawn at, the gutters stay
 *  even, and the rows line up -- spec §3.2, D11 and D12. The arithmetic
 *  is one line: for a row of ratios r1..rn with n-1 gaps of g,
 *
 *      height = (containerWidth - g * (n - 1)) / (r1 + ... + rn)
 *
 *  because each photograph's width is its ratio times the shared height,
 *  and those widths plus the gaps have to come to the container width.
 *
 *  IT IS BUILT AS FLEXBOX, NOT AS MEASURED PIXELS (handover D16), and
 *  that is the one departure from `/lab/crop`'s model worth stating out
 *  loud: a layout that has to measure its container can only run after
 *  the first paint, so the photographs would land in the wrong places
 *  and then jump -- the complaint (#18) this phase exists to end, not to
 *  relocate. So the browser solves it. Every photograph gets a
 *  flex-basis of `ratio x targetHeight` and a flex-grow of `ratio`;
 *  `flex-wrap` breaks the line where the greedy justified walk would,
 *  and the grow justifies whatever landed there, so every photograph on
 *  the line comes out the same height and the widths add up exactly.
 *
 *  THE ROW COUNT FOLLOWS THE COLUMN (handover D18), rather than a
 *  "three per row" decided in JavaScript. The phone killed that first
 *  attempt: three photographs balanced into one row are 267, 334 and
 *  113px wide in a 730px feed card, which is right, and 112, 140 and
 *  47px wide in a 316px one, which is a contact sheet.
 *
 *  `drawnRows` at the bottom is the same arithmetic written out, so the
 *  tests can assert what the browser is going to do.
 * ================================================================== */

/** A photograph's aspect ratio. Everything below is a function of this. */
export function photoRatio(p: PhotoShape): number {
  return p.width / p.height;
}

/**
 * The ratio a framed photograph is actually DRAWN at, which is its own except
 * where the single-photograph rule has brought it to 3:4.
 *
 * This is what a row of photographs in a feed card or a Catch-up answer is
 * solved from, and the reason is a measurement rather than a preference. A
 * real post in the feed on 2026-08-27 holds a 1.77, a 2.21 and a 0.45 -- two
 * wide frames and a screenshot -- and solving that row at true shapes drew the
 * screenshot **72px wide** beside a 357px neighbour. Justified rows give every
 * photograph in a row the same height, so the width disparity is the ratio
 * disparity, and 2.21 against 0.45 is five to one.
 *
 * Bringing the tall one to 3:4 first is not a new rule; it is the LOCKED rule
 * from §3.1 applied where it was already going to apply. A tall photograph
 * posted ON ITS OWN is drawn 3:4 on a blurred bed, aimed and clamped. There is
 * no reading of that decision under which the same photograph, posted beside
 * two others, should instead be a strip. It also lands exactly where D11 put
 * the line: the feed and Catch-ups crop, the Collection grid does not -- and
 * the grid is the other component, which never calls this.
 *
 * The wide side is deliberately left alone. Clamping a 21:9 to 16:9 would cut
 * a quarter off a panorama to buy about 20px for its neighbours, and the owner
 * was unambiguous: "for very wide images like 21:9... we should just let it be
 * a thin photo." A wide photograph in a row makes the whole row shorter, which
 * is uniform, and uniform is not a bug.
 */
export function drawnRatio(frame: PhotoFrame): number {
  const [w, h] = frame.aspectRatio.split("/").map((n) => Number(n.trim()));
  return w / h;
}

/**
 * The height a row of photographs in a CARD aims for, in px.
 *
 * Not a taste number, a packing number: it is what decides how many
 * photographs share a row at each column width, because a photograph's
 * flex-basis is this times its ratio. Measured against the real columns:
 *
 *   730px laptop card   three ordinary frames on one row, 151px high
 *   358px phone card    one wide frame per row, or two portraits
 *   900px wide card     three on a row, 189px high
 *
 * Raise it and a laptop drops to two per row; lower it and a phone starts
 * putting three across, which is the contact sheet this number exists to
 * prevent. Spec §3.2 marked the row guards OPEN and named a target of
 * `columnWidth / 2.2`; a fraction of the column cannot do this job at all,
 * because it packs the same number of photographs into a phone as into a
 * 27-inch monitor, which is exactly the failure.
 */
export const PHOTO_ROW_TARGET = 150;

/**
 * The height a row of the COLLECTION GRID aims for, as CSS rather than a
 * number, because the right target is not a constant: 220px suits a 1112px
 * Collection column and would put one photograph on a row of a 358px phone.
 *
 * A percentage of the CONTAINER rather than of the viewport, which matters
 * here: the sidebar appears at a breakpoint, so the column does not change
 * width at the same places the viewport does. 30% is two ordinary frames
 * across a phone and three or four across a laptop.
 *
 * Aimed a little UNDER where the rows should land, and that is deliberate.
 * flex-wrap breaks a line the moment the next photograph's basis does not
 * fit, so a row can only ever grow past this number, never settle below it --
 * where the greedy justified walk is free to do either, and Flickr's own
 * refinement is to take whichever is CLOSER to the target. Aiming low
 * recovers most of that. Measured on the Collection with its two
 * photographs: a 4:1 panorama and a 5:4 print aiming at 220 could not share
 * a 1112px row, so the panorama took a row to itself at full width, and the
 * row they would have shared was 207px high -- nearer 220 than the layout
 * that rejected it. At 190 they sit together.
 */
export const PHOTO_GRID_TARGET_PX = 190;
export const PHOTO_GRID_TARGET = `min(${PHOTO_GRID_TARGET_PX}px, 30%)`;

/** The same target as a NUMBER, for the code that has to know a height rather
 *  than hand one to CSS. `river-geometry.ts` computes a year's exact pixel
 *  height before its photographs exist, and it cannot do that from a `min()`
 *  expression -- but the two must never drift, so the CSS above is built from
 *  this constant rather than repeating the literal. */
export const PHOTO_GRID_MAX_SCALE = 2.5;

/**
 * A photograph's flex-basis: its natural width at the height the row is
 * aiming for. `flex-wrap` breaks the line where the greedy justified walk
 * would, and `flex-grow` justifies what landed there.
 */
export function photoBasis(ratio: number, targetHeight: string): string {
  return `calc(${targetHeight} * ${ratio.toFixed(4)})`;
}

/**
 * A photograph's flex-grow. Its ratio, scaled -- and the scale is the whole
 * reason this is a function rather than the ratio itself.
 *
 * **A flex line whose grow factors sum to LESS THAN ONE does not fill.** The
 * spec says so: below one, the factors are treated as fractions of the free
 * space rather than as shares of it, and the remainder is simply left over.
 * Ratio is a natural grow factor -- free space shared in proportion to ratio
 * is exactly what makes every photograph in a row the same height -- but a
 * lone 3:4 photograph on a row has a grow of 0.75, so it took three quarters
 * of the space and stopped: measured 265px wide in a 316px phone card on
 * 2026-08-27, with 51px of nothing beside it. Scaling every factor by the same
 * number changes no proportion and puts every plausible row safely over one.
 */
export function photoGrow(ratio: number): number {
  return ratio * 1000;
}

/**
 * What the browser will draw: where flex-wrap breaks each line, and what
 * height each line settles at. The same arithmetic as the flexbox above,
 * written out so it can be asserted at the real column widths rather than
 * eyeballed (spec §12).
 *
 * A line takes the next photograph if its basis still fits, which is what
 * flexbox does with `flex-wrap` and a definite basis. Then the line grows to
 * fill the width -- never shrinks, since a line that overflowed would have
 * wrapped instead -- up to whatever caps its photographs. `caps` is that, per
 * photograph, in the same order: a card passes each photograph's own
 * single-photograph max width, so a lone one on the last row is drawn exactly
 * as it would have been had it been posted alone; the grid passes a multiple
 * of the target instead.
 */
export function drawnRows(
  ratios: number[],
  caps: number[],
  containerWidth: number,
  gap: number,
  targetHeight: number,
  /** The ceiling, where the surface has one. A card does: a photograph alone
   *  on a row would otherwise be drawn 625px tall, since its width cap now
   *  carries the crop budget. The grid does not -- it crops nothing, so a
   *  row's own arithmetic is the only thing bounding it. */
  maxHeight = Infinity
): { height: number; widths: number[]; capped: boolean }[] {
  const lines: { r: number; cap: number }[][] = [];
  let line: { r: number; cap: number }[] = [];
  let basis = 0;
  ratios.forEach((r, i) => {
    const next = r * targetHeight;
    if (line.length && basis + gap * line.length + next > containerWidth) {
      lines.push(line);
      line = [];
      basis = 0;
    }
    line.push({ r, cap: caps[i] });
    basis += next;
  });
  if (line.length) lines.push(line);

  return lines.map((row) => {
    const sum = row.reduce((a, c) => a + c.r, 0);
    const free = (containerWidth - gap * (row.length - 1)) / sum;
    /* Every photograph in a row reaches its cap at the same height when the
       caps are all `ratio x something`, which is how both callers set them --
       so a capped row is still a row. */
    /* Width is settled first, because that is what flexbox settles: the row
       grows until it fills, or until a photograph reaches its own width cap. */
    const box = Math.min(free, ...row.map((c) => c.cap / c.r));
    /* Then the ceiling clamps what is DRAWN, and `object-fit: cover` takes the
       difference off the top and bottom. It does not narrow anything, so the
       row still spans what it spanned. */
    return {
      height: Math.min(box, maxHeight),
      widths: row.map((c) => c.r * box),
      /* A capped row is narrower than its container and is centred rather than
         ragged. Not the layout failing: it is a photograph refusing to be
         drawn larger than the rule allows. */
      capped: box < free - 0.01,
    };
  });
}
