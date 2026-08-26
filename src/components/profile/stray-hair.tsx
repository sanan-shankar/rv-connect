"use client";

/* ------------------------------------------------------------------ *
 *  A single hair, apparently stuck to the screen.
 *
 *  THIS IS A PRANK. It is not a feature, it has no product purpose, and
 *  it should not be treated as one. It renders for exactly the user ids
 *  in ./stray-hair-ids.ts, and only on their own profile. Nobody else
 *  can see it, and it touches nothing else in the app.
 *
 *  To end the joke: empty the array in ./stray-hair-ids.ts. That is the
 *  whole kill switch — one line, no env var, no migration. Deleting both
 *  files and the two lines in profile/[id]/page.tsx removes it entirely.
 *
 *  The three details that sell it, in order of importance:
 *
 *  1. It is `fixed`, not absolute. A hair lying on the glass does not
 *     scroll with the page. This is the entire illusion; get it wrong
 *     and it reads instantly as a drawing in the layout.
 *  2. It does not move. An earlier pass had it flee the cursor, which
 *     was rejected on sight: a hair that dodges is obviously a script,
 *     and the whole point is that there is no explanation available
 *     except a dirty screen. Inert is the more convincing behaviour.
 *  3. It is SHARP and nearly opaque, not soft and grey — see the note
 *     on the path below, which is where the first two attempts died.
 *
 *  You can swat it: one click on the strand and it is gone. It does not
 *  persist, so it is back on the next load of the page. That is
 *  deliberate — a permanent dismissal would end the joke on the first
 *  lucky click, and a hair you brush off the glass was never gone for
 *  good either.
 * ------------------------------------------------------------------ */

import { useState } from "react";
import { AnimatePresence, m } from "motion/react";

/* The drawn box. Fixed px rather than a viewport unit: a real hair is a
   real-world object about 4cm long, so it must NOT scale with the window.
   It stays this size on a phone for the same reason. */
const HAIR_W = 190;
const HAIR_H = 44;

/* Where it sits, as a fraction of the viewport. Just left of centre and a
   third of the way down puts it across the top of the letterhead sheet —
   over the name and occupation, which is the first place the eye lands on
   your own profile and therefore the most annoying place available. */
const BASE_LEFT = 0.34;
const BASE_TOP = 0.3;

/* The strand itself: one closed path, not a stroke, because a stroke has
   constant width and a real hair tapers from ~0.9px at the root to a point.
   The outbound curve is the upper edge, the return curve the lower,
   converging at the tip.

   The shape is a shallow S with a kink two-thirds along, not an arc. The
   first version was a clean symmetric dome and that was the whole tell —
   nothing organic is a parabola, so it read as a drawn stroke. */
const HAIR_PATH = `M 0,2 C 22,-16 56,-26 92,-21 C 112,-18 124,-11 140,-11
   C 156,-11 168,-6 178,-8
   C 168,-5.4 156,-10.4 140,-10.4 C 124,-10.4 112,-17.4 92,-20.3
   C 56,-25.2 22,-15.2 0,2.9 Z`;

/* The same curve as a bare centreline, used ONLY as the click target. The
   filled strand above is under a pixel wide, and hit-testing against its
   real geometry would mean demanding a sub-pixel click — not "hard", just
   broken. A 4px invisible ribbon along the spine means you have to
   deliberately land on the hair and a near miss still does nothing, which
   is the intended difficulty. */
const HAIR_SPINE = `M 0,2.5 C 22,-15.6 56,-25.6 92,-20.6 C 112,-17.6 124,-10.7 140,-10.7
   C 156,-10.7 168,-5.7 178,-8`;
const HIT_WIDTH = 4;

export function StrayHair() {
  const [swatted, setSwatted] = useState(false);

  return (
    <AnimatePresence>
      {!swatted ? (
        <m.div
          aria-hidden
          /* pointer-events-none on the WRAPPER is load-bearing: the box is
             190x44 and sits over real content, so if the box itself were
             clickable it would swallow clicks meant for the sheet beneath
             it. Only the hit ribbon inside re-enables them. */
          className="pointer-events-none fixed z-[70] select-none"
          style={{
            left: `${BASE_LEFT * 100}%`,
            top: `${BASE_TOP * 100}%`,
            width: HAIR_W,
            height: HAIR_H,
          }}
          /* Brushed away rather than deleted: 120ms is under the ~150ms it
             takes to read as a transition at all, so it reads as "gone the
             moment I touched it" without the jarring single-frame pop. */
          exit={{ opacity: 0 }}
          transition={{ duration: 0.12 }}
        >
          <svg width={HAIR_W} height={HAIR_H} viewBox="-5 -30 190 44" fill="none">
            <defs>
              {/* A real hair is not one flat tone down its length. It presses
                  against the glass in the middle, where it reads darkest, and
                  lifts at both ends, where it thins to almost nothing.
                  Painting that falloff into the fill is what stops the strand
                  looking like a drawn line with two abrupt ends. */}
              <linearGradient id="stray-hair-ink" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0" stopColor="var(--ink)" stopOpacity="0.5" />
                <stop offset="0.18" stopColor="var(--ink)" stopOpacity="0.95" />
                <stop offset="0.62" stopColor="var(--ink)" stopOpacity="0.9" />
                <stop offset="1" stopColor="var(--ink)" stopOpacity="0.2" />
              </linearGradient>
            </defs>

            {/* NO BLUR, and near-opaque. Two earlier passes had this
                backwards: a sub-pixel shape at 0.68 opacity under a 0.12px
                blur is nothing but antialiasing spread over two-odd pixels,
                which is precisely how you draw a soft grey smudge. A hair
                lying on the glass is in the same focal plane as the pixels
                under it, so it is SHARP, and it is nearly black rather than
                grey. Contrast is what makes it read as a fine strand instead
                of a thick soft one: measured, the darkest point is luma 49
                against a 232 background, at 1.0px wide falling to 0.75px. */}
            <path d={HAIR_PATH} fill="url(#stray-hair-ink)" />

            {/* The swat target. `pointerEvents="stroke"` with no fill and no
                visible stroke colour: it is hit-tested but never painted. */}
            <path
              d={HAIR_SPINE}
              fill="none"
              stroke="transparent"
              strokeWidth={HIT_WIDTH}
              strokeLinecap="round"
              pointerEvents="stroke"
              className="pointer-events-auto cursor-default"
              onClick={() => setSwatted(true)}
            />
          </svg>
        </m.div>
      ) : null}
    </AnimatePresence>
  );
}
