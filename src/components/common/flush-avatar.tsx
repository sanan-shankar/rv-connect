"use client";

/* ------------------------------------------------------------------ *
 *  An avatar whose LEFT EDGE is where you think it is.
 *
 *  His, 2026-09-07, looking at a column of answers: "the people who've
 *  uploaded a profile photo, for them, their icon is correctly
 *  left-aligned to the left border, but many of the other people who have
 *  a bird, their bird is actually not left-aligned. It's displaced by a
 *  little bit."
 *
 *  Measured, because the cause is not the layout. Every avatar BOX in a
 *  column starts at the same x to the tenth of a pixel. What differs is
 *  the ink inside it: a photograph is clipped to a full circle and fills
 *  its box, while a bird is drawn inside r~45 of a 0..100 viewBox
 *  (bird-avatar-v2.tsx says so at the top) and its drawn pixels span about
 *  32 of a 40px box, starting 4px in. So a column of alternating
 *  photographs and birds has a ragged left edge, by 4px, every time.
 *
 *  It is not new and it is not fixed in the feed either; the feed simply
 *  never stacks twelve of them in one column, which is why it had never
 *  been seen. The app-wide cure would be to normalise every glyph's ink
 *  box, which is a change to fifty drawings and his to call.
 *
 *  What this does instead: measure the glyph's real ink box and slide it
 *  left by its own inset, so every mark in a column starts on the same
 *  pixel. Sizes are untouched, because the glyphs are optically sized
 *  against each other on purpose and normalising WIDTH would shrink an
 *  eagle to a sparrow. The translate is layout-neutral, so the name beside
 *  it never moves.
 *
 *  It lives here rather than beside one caller because the Edition reader
 *  has two: an answer's byline at 40px and a photo run's foot line at 22.
 *  The lab drew it twice and said in the second copy that a third caller
 *  should make it shared; the shipped reader is that moment.
 * ------------------------------------------------------------------ */

import { useCallback } from "react";
import { BirdAvatar } from "@/components/common/bird-avatar";

export function FlushAvatar({
  person,
  size,
}: {
  person: { id: string; name: string; photoUrl: string | null; birdOverride?: string | null };
  size: number;
}) {
  /* Measured in the ref callback and written straight to the node. No state
     and no effect: this is one number read off geometry the browser has
     already built, and React's own rule is that talking to the DOM like this
     belongs outside the render loop. */
  const measure = useCallback(
    (host: HTMLSpanElement | null) => {
      const inner = host?.firstElementChild as HTMLElement | null;
      if (!host || !inner) return;
      const svg = host.querySelector("svg");
      // A photograph already fills its circle; only a glyph needs this.
      if (!svg) {
        inner.style.transform = "";
        host.style.marginRight = "";
        return;
      }
      /* getBBox on the <svg> root unions its children WITH their own
         transforms applied, which is what the per-species optical `adjust`
         is; calling it on the inner <g> would read the geometry from before
         that transform and slide the wrong birds. */
      const box = (svg as unknown as SVGGraphicsElement).getBBox();
      inner.style.transform = `translateX(${-(box.x * size) / 100}px)`;
      /* AND CLOSE THE GAP ON THE RIGHT, which the first version did not.
         Sliding the glyph left flushes its left edge and moves its RIGHT edge
         left with it, so the space between a bird and the name beside it came
         out up to 4px wider than the space after a photograph -- and wider
         still than either was meant to be. His, 2026-09-10: "the names are a
         bit too separated from the bird icons. make it more like it's one
         meaning instead of these two separate things."

         So the host also gives back its own right-hand inset. The gap the
         layout asks for is then measured ink to ink, the same for a bird as
         for a photograph, and a bird and a name read as one object. The cost
         is that a name can start a few pixels left of its neighbour's, which
         is a far quieter raggedness than the one this fixes: an avatar is a
         big solid shape at the column's edge, a name is text that varies
         anyway.

         AND THE SLACK IS THE WHOLE SLACK, not the right inset. A bird's ink
         is inset at BOTH ends -- typically 10 units of 100 each side, so 32px
         of ink in a 40px box. Flushing the left edge slides the glyph left by
         one inset, which puts the ENTIRE 8px between the ink and the box's
         right edge. Giving back only the right inset was the first version of
         this line and it closed half the gap: measured at 1440, a bird still
         sat 16px from its name against a photograph's 12. What comes back is
         the box minus the ink. */
      const inkWidth = (box.width * size) / 100;
      host.style.marginRight = `${-(size - inkWidth)}px`;
    },
    [size],
  );

  return (
    <span ref={measure} className="block shrink-0" style={{ width: size, height: size }}>
      <span className="block">
        <BirdAvatar user={person} size={size} />
      </span>
    </span>
  );
}
