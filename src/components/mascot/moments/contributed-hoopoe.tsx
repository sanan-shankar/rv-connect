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
  size = 76,
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
          // Up at the line that just told you how many.
          () => h.gaze(-0.5),
          ["express", "surprise", { hold: 380 }],
          ["celebrate", 2],
          () => h.gaze(0),
          ["express", "proud", { hold: 900 }],
          ["express", "content"]
        )
      }
    />
  );
}
