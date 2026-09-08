"use client";

/* ------------------------------------------------------------------ *
 *  One Catch-up on /catchups. THE CARD IS THE PICTURE.
 *
 *  His, 2026-09-07, on the version with the photograph above and the
 *  words under it: "I'm just wondering whether having the entire thing
 *  as an image and then fading to black, kind of like a Spotify thing,
 *  might be nicer than this." And: "the picture is too small. I wanted
 *  it to kind of be more of an expensive thing, where it's just kind of
 *  a spectacle and it's just so cute ... just makes you wanna click it."
 *
 *  So the photograph runs the card's whole height and the name and the
 *  stage sit on it over the shared scrim. Landscape, and that is his
 *  too: "on a laptop it is kind of vertically long. I think it might be
 *  better to make it more landscape ... I can't even see 4 catch-ups."
 *  5:2 on a laptop, 16:9 on a phone -- two ratios that land the card at
 *  about the same height either way (214px against 196px, measured), so
 *  the shelf reads the same on both.
 *
 *  WHAT IS GONE, AND WHY IT IS GONE RATHER THAN RESTYLED. No View
 *  button, no three dots, no row of birds, no "+18", no count of
 *  anything, no Edition number, no call to action. "That's pretty much
 *  all the information this is giving me, because I am not identifying
 *  the birds or the people" (brief 23), and "I have 3 different calls to
 *  action, okay? It's overpowering" (brief 23). The measured fault it
 *  replaces: 63 to 76% of every old tile was the gap between the title
 *  at one end and the View button at the other (recon I2). There is no
 *  gap here because there is nothing at the other end.
 *
 *  A CARD ALWAYS OPENS THE HOME. It used to open the reader for a
 *  published Edition and the home for everything else, and that is the
 *  thing he says he hates most about what ships (N42): "I still can't
 *  predict where it's gonna open when I click it. It just does whatever
 *  it wants and I don't have a sense of it in my head." One rule costs a
 *  tap on the way to an Edition and buys knowing where you will land.
 *
 *  Transplanted from `Panel` in
 *  src/app/lab/catchups/sketches/_list.tsx, which he approved.
 *
 *  ── the one thing that is not in the drawing, and why it is here ──
 *
 *  ARCHIVING. Build phase 5 made Leave the only exit and put both verbs
 *  in a three-dot menu on this card; the drawing deletes that menu, and
 *  architecture.md section 4 replaces it with one gesture: "On a phone a
 *  card swipes left to archive, the WhatsApp gesture he named (brief 5),
 *  undoable from a toast." Leaving moves behind Settings on the home,
 *  which is build phase 7, and until then the home's people dialog still
 *  offers it -- checked, not assumed.
 *
 *  A swipe leaves a mouse with nothing, and on a batch Catch-up
 *  archiving is the ONLY exit there is (batch-catchups.test.mjs pins
 *  that). So the same action has a second door: a control in the card's
 *  top right -- which is where he said dots belong "if at all" (brief
 *  24) -- invisible until you point at the card or reach it with a
 *  keyboard. At rest the shelf is still a shelf of photographs, which is
 *  the whole point of the drawing.
 * ------------------------------------------------------------------ */

import Image from "next/image";
import { Archive } from "lucide-react";
import { m, useMotionValue, useTransform } from "motion/react";
import { SPRINGS } from "@/components/common/motion";
import { useCoarsePointer } from "@/components/common/use-coarse-pointer";
import { cn } from "@/lib/utils";
import { CARD_FRAME, CARD_IMAGE_SIZES, CardCaption, CardScrim, PictureDoor } from "./picture-door";

export type ListCatchup = {
  catchupId: string;
  name: string;
  /** The one line under the name: what this Catch-up is doing, in words. */
  stage: string;
  picture: { src: string; focus: string };
};

/** How far left the card has to travel before letting go archives it.
 *
 *  88px, which is about a quarter of a 348px phone card: far enough that the
 *  edge of a vertical scroll cannot reach it, short enough to do with a thumb
 *  without repositioning. The panel behind is 96px wide, so the glyph is fully
 *  clear of the card's edge by the time the threshold is crossed. */
const SWIPE_ARCHIVE_PX = 88;

export function CatchupCard({
  c,
  /** The shelf archives it, animates it out and owns the undo. A card that
   *  removed itself could not animate its own exit, and the Undo in the toast
   *  outlives it. See catchup-shelf-view.tsx. */
  onArchive,
}: {
  c: ListCatchup;
  onArchive: () => void;
}) {
  const coarse = useCoarsePointer();
  const x = useMotionValue(0);
  /* The panel behind fades in over the pull, so the gesture explains itself
     before it commits to anything. Opacity only. */
  const revealed = useTransform(x, [0, -SWIPE_ARCHIVE_PX], [0, 1]);

  const card = (
    <PictureDoor href={`/catchups/${c.catchupId}`} label={`Open ${c.name}`}>
      <span className={cn("relative block w-full overflow-hidden bg-muted", CARD_FRAME)}>
        <Image
          src={c.picture.src}
          alt=""
          fill
          sizes={CARD_IMAGE_SIZES}
          /* The photograph's own band, the same one the home's banner uses:
             what makes these read as a place is in the lower quarter of every
             one of them (see src/lib/catchup-pictures.ts). */
          style={{ objectPosition: c.picture.focus }}
          className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
        />
        <CardScrim />
        <CardCaption title={c.name} line={c.stage} />
      </span>
      {/* The pointer's way to the same thing the swipe does. Invisible until
          the card is pointed at or reached with a keyboard, so the shelf at
          rest is photographs and nothing else. Only opacity and transform
          animate; the tint under the glyph does not fade between states. */}
      {!coarse && (
        <button
          type="button"
          onClick={onArchive}
          aria-label={`Archive ${c.name}`}
          className="pointer-events-auto absolute right-2.5 top-2.5 z-20 flex size-8 items-center justify-center rounded-full bg-black/40 text-white opacity-0 backdrop-blur-[2px] transition-[opacity,transform] duration-200 ease-out hover:scale-105 focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white active:scale-95 group-hover:opacity-100"
        >
          <Archive className="size-4" aria-hidden />
        </button>
      )}
    </PictureDoor>
  );

  if (!coarse) return card;

  /* The phone's gesture. `dragDirectionLock` is what lets a vertical flick
     scroll the page instead of pulling the card: motion locks to the axis the
     finger actually moved in and sets `touch-action: pan-y` itself.
     `dragSnapToOrigin` returns anything short of the threshold, so a gesture
     that changed its mind costs nothing. */
  return (
    <div className="relative">
      <m.div
        aria-hidden
        style={{ opacity: revealed }}
        /* CANOPY, not cinnamon, and the difference is a rule rather than a
           preference: cinnamon means one-way in this app -- every control that
           cannot be undone wears it (architecture 6) -- and archiving is
           undoable from the toast before your thumb has left the screen.
           Canopy is the app's own affirmative surface. Spending the warning
           colour on a tidying gesture is how a warning colour stops meaning
           anything. */
        className="absolute inset-y-0 right-0 flex w-24 items-center justify-center rounded-[var(--radius)] bg-canopy text-white"
      >
        <Archive className="size-5" />
      </m.div>
      <m.div
        drag="x"
        style={{ x }}
        dragDirectionLock
        dragSnapToOrigin
        dragConstraints={{ left: -120, right: 0 }}
        dragElastic={{ left: 0.5, right: 0 }}
        /* The snap back. `dragTransition` takes inertia options rather than a
           spring, so SPRINGS.firm cannot be spread in -- but its two numbers
           are read off it rather than copied, because it has been retuned once
           already ("that spring is too loose") and a card-sized swipe should
           settle the way every other card-sized press in the app does. */
        dragTransition={{
          bounceStiffness: SPRINGS.firm.stiffness,
          bounceDamping: SPRINGS.firm.damping,
        }}
        onDragEnd={(_, info) => {
          // Distance OR a flick: a fast short swipe is the same intent, and
          // WhatsApp's own gesture answers to both.
          if (info.offset.x < -SWIPE_ARCHIVE_PX || info.velocity.x < -650) onArchive();
        }}
        className="relative"
      >
        {card}
      </m.div>
    </div>
  );
}
