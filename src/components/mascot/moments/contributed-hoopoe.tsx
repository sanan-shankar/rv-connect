"use client";

/* ------------------------------------------------------------------ *
 *  Photographs added to the Collection.
 *
 *  A genuine moment of gladness, and one of the few the app has: somebody
 *  has just given the valley something it did not have. So the bird gets
 *  to be pleased about it -- looks up at the count, celebrates once,
 *  settles proud, and rests.
 *
 *  ONE appearance, never twice, and never on the way in. It plays at the
 *  end of the contribute room and nowhere else, which is the whole
 *  easter-egg template: the moment is earned rather than decorative
 *  (docs/spec/mascot.md). `MomentStage` carries the one-hoopoe rule and
 *  the scroll-into-view autoplay for free.
 * ------------------------------------------------------------------ */

import { MomentStage } from "./moment-hoopoe";

export function ContributedHoopoe({
  /* Bigger than the other moments', and deliberately: those are ambient
     companions inside an empty state, where the bird is secondary to the
     copy. This one IS the moment -- somebody has just given the valley
     photographs it did not have -- and the owner asked for it (2026-08-29):
     "make the hoopoe on that page a bit bigger and have a big celebration
     reaction." */
  size = 104,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <MomentStage
      size={size}
      className={className}
      play={(h) =>
        h.sequence(
          // Up at the line that just thanked you.
          () => h.gaze(-0.5),
          ["express", "surprise", { hold: 320 }],
          /* Level 3, "everything at once": a 38px hop over 1.3s against
             level 2's 24px over 0.85s. This is the one screen in the app
             that exists purely to be glad, so it gets the whole thing. */
          ["celebrate", 3],
          // Two hops out of the cheer, so the gladness has somewhere to go
          // rather than stopping dead on the last frame of it.
          ["hop", 2],
          ["express", "proud", { hold: 1000 }],
          () => h.gaze(0),
          ["express", "content"]
        )
      }
    />
  );
}
