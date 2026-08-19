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
 *  2. `pointer-events: none`, so it can never be grabbed, clicked
 *     through, or selected. It also means the hair can never intercept
 *     a real click, which is what keeps this from being an actual bug.
 *  3. It flees the cursor and STAYS fled — see the drift note below.
 * ------------------------------------------------------------------ */

import { useEffect } from "react";
import { motion, useMotionValue, useSpring } from "motion/react";

/* The drawn box. Fixed px rather than a viewport unit: a real hair is a
   real-world object about 4cm long, so it must NOT scale with the window,
   and the flee maths needs a known size to keep it on screen. */
const HAIR_W = 190;
const HAIR_H = 44;

/* Where it starts, as a fraction of the viewport. Just left of centre and
   a third of the way down puts it across the top of the letterhead sheet —
   over the name and occupation, which is the first place the eye lands on
   your own profile and therefore the most annoying place available. */
const BASE_LEFT = 0.34;
const BASE_TOP = 0.3;

/* How close the cursor gets before the hair moves, and how hard one
   pointermove event shoves it. 120px is roughly "the cursor is visibly
   near it" without being so wide that the hair reacts to unrelated
   movement across the page. 3.5px per event is small on purpose:
   pointermove fires ~60x a second, so a deliberate swipe at the hair
   carries it ~45px (measured, see the approach-only note below), while
   merely passing by nudges it two or three — which is the ambiguity that
   makes this work. A hair that leapt away would be obviously fake on the
   first pass. */
const FLEE_RADIUS = 120;
const STEP = 3.5;

/* It never returns to where it started. This is the point: the offset
   accumulates, so over an afternoon the hair wanders the screen, and
   there is never a snap-back frame to give the game away. Kept MARGIN px
   inside the viewport so it can't flee somewhere unreachable and quietly
   end the joke. */
const MARGIN = 20;

/* Rotation is capped so a long session can't wind it into a spinning
   pinwheel; a real hair being nudged swivels a little and stops. */
const MAX_ROTATION = 25;

/* Low stiffness, damping ratio just over 1 (20 / (2 * sqrt(90)) = 1.05),
   so it is very slightly OVERDAMPED: it glides to the new spot and never
   overshoots or wobbles. Every named spring in common/motion.tsx is
   underdamped by design — they are UI answering a click, and they should
   feel alive. This is the opposite: it must feel like inert matter being
   pushed through air, so it gets its own. */
const HAIR_SPRING = { stiffness: 90, damping: 20, mass: 1 } as const;

const clamp = (v: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, v));

export function StrayHair() {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useMotionValue(0);

  /* Sprung views of the raw values, so the pointermove handler can write
     as often as it likes without ever triggering a React render. */
  const springX = useSpring(x, HAIR_SPRING);
  const springY = useSpring(y, HAIR_SPRING);
  const springR = useSpring(rotate, HAIR_SPRING);

  useEffect(() => {
    let lastDist = Infinity;

    const onMove = (e: PointerEvent) => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const baseLeft = vw * BASE_LEFT;
      const baseTop = vh * BASE_TOP;

      /* Current centre = where CSS puts the box + how far it has drifted.
         Derived rather than measured: reading getBoundingClientRect on
         every pointermove would force layout 60x a second. */
      const dx = baseLeft + HAIR_W / 2 + x.get() - e.clientX;
      const dy = baseTop + HAIR_H / 2 + y.get() - e.clientY;
      const dist = Math.hypot(dx, dy);
      const closing = dist < lastDist;
      lastDist = dist;
      if (dist > FLEE_RADIUS) return;

      /* Only shove while the cursor is CLOSING on it — a bow wave, not a
         magnet. Without this, a swipe straight through the hair pushes it
         right on the way in and left again on the way out, and the two
         cancel: measured, a full swipe moved it 9px instead of the 46 it
         does now. Ignoring the receding half both fixes that and is the more
         honest physics, since air pushed ahead of your hand does not suck
         back when the hand has passed. */
      if (!closing) return;

      /* Dead centre gives no direction to flee in, so pick one rather
         than dividing by zero and freezing the hair under the cursor. */
      const nx = dist < 1 ? 0.7 : dx / dist;
      const ny = dist < 1 ? -0.7 : dy / dist;

      /* Closer cursor, harder shove. */
      const push = (FLEE_RADIUS - dist) / FLEE_RADIUS;

      x.set(
        clamp(
          x.get() + nx * push * STEP,
          MARGIN - baseLeft,
          vw - MARGIN - HAIR_W - baseLeft,
        ),
      );
      y.set(
        clamp(
          y.get() + ny * push * STEP,
          MARGIN - baseTop,
          vh - MARGIN - HAIR_H - baseTop,
        ),
      );
      rotate.set(
        clamp(rotate.get() + nx * push * 0.6, -MAX_ROTATION, MAX_ROTATION),
      );
    };

    /* On `window`, not the element: the element cannot receive pointer
       events at all (see rule 2 above), so the flee has to be driven by
       the pointer's position in the page rather than by hovering it. */
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [x, y, rotate]);

  return (
    <motion.div
      aria-hidden
      className="pointer-events-none fixed z-[70] select-none"
      style={{
        left: `${BASE_LEFT * 100}%`,
        top: `${BASE_TOP * 100}%`,
        width: HAIR_W,
        height: HAIR_H,
        x: springX,
        y: springY,
        rotate: springR,
      }}
    >
      <svg
        width={HAIR_W}
        height={HAIR_H}
        viewBox="-5 -30 190 44"
        fill="none"
        /* Enough blur to kill the hard vector edge — a real hair sits a
           hair's breadth off the screen's focal plane and never has a
           crisp CAD outline — but no more. This was 0.3px against a
           1.6px-wide strand, i.e. a fifth of the whole width, which is
           exactly why it read as a soft grey smudge rather than a hair.
           At the thinner 1px width it has to come down with it. */
        style={{ filter: "blur(0.12px)" }}
      >
        {/* One closed path, not a stroke: a stroke has constant width and
            a real hair tapers from ~1px at the root to a point. The
            outbound curve is the upper edge, the return curve the lower,
            converging at the tip.

            The shape is a shallow S, not an arc. The first version was a
            clean symmetric dome, and that was the whole tell — nothing
            organic is a parabola, so it read as a drawn stroke. A real
            hair falls with one strong bend near the root and a longer,
            lazier counter-bend out to the tip. */}
        <path
          d="M 0,2 C 22,-16 56,-26 92,-21 C 132,-15 152,-2 178,-8
             C 152,-1.3 132,-14.3 92,-20.25 C 56,-25.1 22,-15.1 0,3 Z"
          fill="var(--ink)"
          /* Up from 0.55 with the thinning: half the width means half
             the covered pixels, and at 0.55 the strand went faint enough
             to lose against the sheet's texture. */
          fillOpacity={0.68}
        />
      </svg>
    </motion.div>
  );
}
