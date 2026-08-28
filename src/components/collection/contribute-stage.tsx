"use client";

/* ------------------------------------------------------------------ *
 *  THE STAGE - the photographs you are filing, one at a time.
 *
 *  This replaces the wall-and-panel the contribute room had, and the
 *  reason is not that a wall looked bad. The owner, 2026-08-28:
 *
 *    "firstly it defaults to select all, and then I don't think people
 *     are going to go one by one and put all the tags and stuff like
 *     that. and when people upload photos they're generally not going to
 *     upload all bird photos, so it's not like the tags will carry on
 *     for each batch of photos. so let's make a carousel that works very
 *     well."
 *
 *  That is a correctness argument, not a taste one. A wall with
 *  everything selected quietly promises that one answer fits a whole
 *  drop, and a real drop is a birthday, a match and a corridor. So the
 *  set is not a set any more: it is a sequence, and the photograph you
 *  are looking at is the one you are answering for. There is nothing to
 *  select, so there is no ring, no dimming and no "3 of 12 selected" --
 *  the owner again: "it doesn't need the selection outline over the
 *  picture any more if there's only one per."
 *
 *  THREE THINGS MAKE IT NOT A BASIC CAROUSEL:
 *
 *  1. THE STAGE IS ONE HEIGHT FOR THE WHOLE DROP, and the photograph is
 *     contained in it. Every other option was tried in <PhotoCarousel> and
 *     each was wrong somewhere (see its notes on shared shape and shared
 *     height). Here the answer is different from the feed's because the
 *     JOB is different: this is a filing surface, and a panel that changed
 *     height under the questions every time you swiped would move the
 *     controls you are reaching for. The owner asked for exactly this --
 *     "we have to make sure we manage the different sizing of the panel
 *     smoothly" -- and a still panel is what smooth means when your
 *     thumb is already on its way to a bucket tile. Contained, so a
 *     portrait is never cropped and never bedded on blur; centred, which
 *     fixes the left-alignment he spotted.
 *
 *     One height for the drop, though, not one height for the app: it is
 *     the tallest photograph you dropped, capped. See `stageHeight` -- a
 *     flat ceiling left 140px of white paper around a panorama.
 *  2. IT CROSS-FADES, IT DOES NOT SLIDE, and it is the SAME dissolve the
 *     full-screen viewer already uses. The owner named it: "when you move
 *     from one picture to another in the image viewer it doesn't slide,
 *     it does the crossfade thing -- that's what I mean." So this is not
 *     a second opinion about how a carousel should move; it is
 *     <ImageViewer>'s step, copied down to its two curves, for the same
 *     reason it was right there. Opacity and nothing else: these
 *     photographs are different shapes, so anything that travels drags a
 *     portrait's edge across a landscape's and the eye follows the
 *     rectangle instead of the picture.
 *
 *     The two legs are OPPOSITE curves, and that pairing is the whole
 *     trick -- the argument is written out in full at image-viewer.tsx's
 *     `FRAME_VARIANTS`. Both frames are mounted at once, so what shows
 *     through the cross is (1 - outgoing) * (1 - incoming); run both legs
 *     on the same curve and that product peaks at a quarter halfway,
 *     which here is a flash of empty white paper between two
 *     photographs. Incoming on EASE_OUT_SMOOTH, outgoing on "easeIn",
 *     and the product at the midpoint is about 0.02.
 *  3. THE ARROWS ARE BESIDE THE COUNT, NOT OVER THE PICTURE. On the feed
 *     they float on the photograph because the photograph is the whole
 *     card. Here they are navigation for a task you are in the middle
 *     of, so they are always visible, they are real buttons rather than
 *     a mouse decoration, and they sit either side of "3 of 12" in one
 *     line that costs 36px. Over a contained photograph they would
 *     have been floating on white half the time anyway.
 * ------------------------------------------------------------------ */

import type { CSSProperties } from "react";
import { m, AnimatePresence } from "motion/react";
import { X } from "lucide-react";
import { CarouselArrow } from "@/components/common/carousel-arrow";
import { EASE_OUT_SMOOTH } from "@/components/common/motion";
import { cn } from "@/lib/utils";

/** What the stage shows about one photograph. A structural subset of the
 *  room's `Staged`, so the stage never has to know about upload keys or
 *  files -- it draws a picture and says whether it has landed. */
export type StagePhoto = {
  id: string;
  preview: string;
  name: string;
  /** The photograph's own pixels. The room measures these before it draws
   *  anything, and the stage needs them for the reason in `PICTURE_BOX`. */
  width: number;
  height: number;
  landed: boolean;
  failed: boolean;
};

/** The box the picture is actually drawn in, to the pixel.
 *
 *  `object-contain` alone is not enough, and the difference is invisible until
 *  you hang something off a corner. It fits the PICTURE inside the element and
 *  leaves the ELEMENT at its full max-width -- so a 2:3 portrait in a 316px
 *  stage draws 160px of picture inside a 316px box, and the hairline border
 *  and the remove button both anchor to the box. Measured at 390px: the
 *  photograph ended at x=197 and its remove button sat at x=313.
 *
 *  So the box is given the picture's own ratio and a width that cannot
 *  overflow either axis: at most the container, and at most as wide as the
 *  stage's height allows at that ratio. Height then follows from
 *  `aspect-ratio`, so it can never exceed the stage either. No measurement, no
 *  ResizeObserver, correct on the first frame -- `--stage-h` is what makes it
 *  arithmetic the browser can do rather than something we have to observe. */
const PICTURE_BOX = (p: StagePhoto) => ({
  width: `min(100%, calc(var(--stage-h) * ${p.width} / ${p.height}))`,
  aspectRatio: `${p.width} / ${p.height}`,
});

/** How tall the stage is: as tall as it needs to be, and never taller.
 *
 *  It used to be a flat 240px, which is right when a portrait is in the drop
 *  and wasteful when nothing is. A 16:5 panorama drew 99px of picture with
 *  140px of white paper around it, and the owner's rule for that is the
 *  obvious one: "make 240px the max, but if the tallest photo is less than
 *  that then make it that."
 *
 *  The tallest photograph is the one with the SMALLEST width/height, and drawn
 *  across the full stage it wants `width / ratio` of height. So the stage is
 *  `min(the ceiling, that)`, and every other photograph in the drop is wider
 *  than the tallest one and therefore fits by construction.
 *
 *  Note this settles per DROP, not per swipe: the height is the same for all
 *  twelve photographs, so the questions underneath still never move while you
 *  are going through them. That was the point of the fixed stage and it
 *  survives intact -- what is gone is only the paper nobody needed.
 *
 *  `cqw` is what keeps this arithmetic rather than measurement. The stage's
 *  own width is not a number CSS can otherwise put in a `calc`, so the parent
 *  becomes a query container and 100cqw is that width -- correct on the first
 *  frame, through every resize, with no ResizeObserver and no state. The
 *  custom property has to be declared on the CHILD, because an element cannot
 *  query itself. */
const stageHeight = (photos: StagePhoto[]) => {
  const tallest = Math.min(...photos.map((p) => p.width / p.height));
  return `min(var(--stage-max), calc(100cqw / ${tallest.toFixed(6)}))`;
};

/** The step, and every number in it is <ImageViewer>'s. Equal durations keep
 *  it symmetric, so forward and back feel identical; the opposite curves are
 *  what keep the paper from showing through the middle of the cross. */
const STEP_SECONDS = 0.22;
const CARD = {
  enter: { opacity: 0 },
  here: {
    opacity: 1,
    transition: { duration: STEP_SECONDS, ease: EASE_OUT_SMOOTH },
  },
  leave: {
    opacity: 0,
    /* Not animatable, and not meant to be: Motion applies it on the first
       frame of the exit. Without it the outgoing card is still hit-testable
       for 220ms, so a fast press on the remove button lands on the
       photograph you have just navigated away from. */
    pointerEvents: "none" as const,
    /* Motion's named curve rather than a hand-typed cubic-bezier (banned:
       DESIGN-SYSTEM sec. 7, and eslint warns). motion.tsx has no ease-IN twin
       to import; if one is ever added, both this and the viewer take it. */
    transition: { duration: STEP_SECONDS, ease: "easeIn" as const },
  },
};

/** How far, or how fast, a swipe has to be before it counts -- the viewer's
 *  thresholds, so the same flick does the same thing in both places. */
const SWIPE_PX = 70;
const SWIPE_VELOCITY = 420;

export function ContributeStage({
  photos,
  at,
  onAt,
  onRemove,
}: {
  photos: StagePhoto[];
  /** Which photograph the questions are answering for. Owned by the room,
   *  because the room is what needs it. */
  at: number;
  onAt: (index: number) => void;
  onRemove: (id: string) => void;
}) {
  const last = photos.length - 1;
  const showing = photos[Math.min(at, Math.max(0, last))];

  const go = (index: number) => {
    const to = Math.max(0, Math.min(last, index));
    if (to !== at) onAt(to);
  };

  if (!showing) return null;

  return (
    /* The query container, and the ceiling. Both live out here because the
       stage inside reads them: an element cannot be its own container. */
    <div className="[--stage-max:240px] [container-type:inline-size] sm:[--stage-max:380px]">
      <div
        tabIndex={0}
        style={{ "--stage-h": stageHeight(photos) } as CSSProperties}
        role="group"
        aria-roledescription="carousel"
        aria-label={`${photos.length} photographs to describe`}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") {
            e.preventDefault();
            go(at + 1);
          }
          if (e.key === "ArrowLeft") {
            e.preventDefault();
            go(at - 1);
          }
        }}
        className={cn(
          /* The ceiling: 240px on a phone leaves the first question ("What is
             it of?") above the fold at 390x844 with the header and the counter
             above it; 380px on a laptop, where the stage stands beside a 500px
             column of questions rather than above them. `--stage-h` is the
             height it actually settles on -- see `stageHeight`. */
          "relative h-[var(--stage-h)] overflow-hidden rounded-[var(--radius-md)]",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        )}
      >
        {/* THE GESTURE, and it is one layer rather than one per photograph.
            The owner asked for swipe on a phone. `drag` with both constraints
            at zero and a small elastic means the picture leans into a thumb
            by a few pixels and always returns -- feedback that you were heard,
            without pretending to be a slide the release then has to finish.
            Motion sets `touch-action: pan-y` for a `drag="x"`, so the dialog
            underneath still scrolls up and down. */}
        <m.div
          className="absolute inset-0"
          drag={photos.length > 1 ? "x" : false}
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.14}
          dragDirectionLock
          /* Damped hard, because a drag-release spring that rebounds past 0
             and back is exactly the mobile bounce the viewer had to fix. */
          dragTransition={{ bounceStiffness: 600, bounceDamping: 60 }}
          onDragEnd={(_, info) => {
            if (info.offset.x < -SWIPE_PX || info.velocity.x < -SWIPE_VELOCITY) go(at + 1);
            else if (info.offset.x > SWIPE_PX || info.velocity.x > SWIPE_VELOCITY) go(at - 1);
          }}
        >
          {/* `sync`, so both frames are mounted through the cross. That is
              what makes it a dissolve rather than a hard cut. */}
          <AnimatePresence mode="sync" initial={false}>
            <m.div
              key={showing.id}
              variants={CARD}
              initial="enter"
              animate="here"
              exit="leave"
              /* No inset. `stageHeight` solves for the picture at the stage's
                 FULL width, so four pixels of horizontal padding would make
                 the picture four pixels narrower than the height was computed
                 for, and leave a couple of pixels of paper under it. There is
                 nothing for the padding to protect against either: with no bed
                 behind the picture, the stage is now exactly its size. */
              className="absolute inset-0 flex items-center justify-center"
            >
              {/* Shrink-wrapped to the picture, which is the whole reason it
                  exists: `object-contain` centres a portrait in a stage twice
                  its width, and a control positioned on the STAGE's corner
                  then floats in empty paper a hundred pixels from the thing
                  it removes. Measured at 390px before the fix: the photograph
                  ended at x=330 and its remove button sat at x=427. */}
              <div className="relative" style={PICTURE_BOX(showing)}>
              {/* No bed behind it. A warm fill under a contained photograph
                  is the "yellowing" the owner had already thrown out of the
                  bucket tiles and the description box: the pop-up is pure
                  white, and every warm surface on white reads as a stain
                  rather than as a frame. The photograph's own hairline is
                  what says where it ends. */}
              <m.img
                src={showing.preview}
                alt=""
                draggable={false}
                /* It develops: half-faded while its bytes are still climbing
                   to the bucket, full once they have landed. The true state
                   of the thing, and the right metaphor for an archive. This
                   is the picture's own opacity, multiplied by the card's --
                   an object `animate` rather than a variant label, so the
                   cross-fade above does not claim it. */
                animate={{ opacity: showing.landed ? 1 : 0.42 }}
                transition={{ duration: 0.55, ease: EASE_OUT_SMOOTH }}
                /* `object-contain` inside a max-sized box: the picture keeps
                   its own shape at the largest size that fits, and is centred
                   on both axes by the flex row. A portrait and a panorama
                   both leave the stage exactly as tall as it was. */
                /* The box above is already the picture's shape, so `cover`
                   and `contain` are the same thing here -- and `cover` is the
                   one that cannot leave a sliver of paper inside the border
                   if the two ever round differently. */
                className="h-full w-full select-none rounded-[var(--radius-md)] border border-border object-cover"
              />
              {/* Always there, never on hover. This was invisible on every
                  device for a while -- a `group-hover` with no `group` above
                  it -- and the owner's read was the right one: "I should be
                  able to remove a photo, now there's no way, I have to add
                  everything." A control for undoing something has to be
                  visible before you want it. */}
              <button
                type="button"
                onClick={() => onRemove(showing.id)}
                aria-label={`Take ${showing.name} back out`}
                className="absolute right-2 top-2 z-10 grid h-8 w-8 place-items-center rounded-full bg-foreground/60 text-background backdrop-blur-sm transition-colors duration-150 hover:bg-destructive focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <X className="h-4 w-4" />
              </button>
              </div>
              {showing.failed && (
                <span className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-destructive px-3 py-1 text-[13px] font-semibold text-white">
                  Would not upload
                </span>
              )}
            </m.div>
          </AnimatePresence>
        </m.div>

      </div>

      {/* The count, flanked. One photograph has no sequence to be in, so the
          whole line goes rather than reading "1 of 1" beside two dead
          arrows. */}
      {photos.length > 1 && (
        <div className="mt-2.5 flex items-center justify-center gap-3">
          <CarouselArrow
            forward={false}
            tone="plain"
            label="Previous photograph"
            disabled={at === 0}
            onPress={() => go(at - 1)}
          />
          <span
            className="min-w-[5.5rem] text-center text-[14px] tabular-nums text-muted-foreground"
            aria-live="polite"
          >
            {at + 1} of {photos.length}
          </span>
          <CarouselArrow
            forward
            tone="plain"
            label="Next photograph"
            disabled={at === last}
            onPress={() => go(at + 1)}
          />
        </div>
      )}
    </div>
  );
}
