"use client";

/* The reward preview on /support, for members who have not contributed yet:
 * twelve of the fifty, arranged and faced by plate-data.ts so the row shows
 * the collection's variety rather than its first N indices. Four columns and
 * three rows under `sm`, six columns and two rows from `sm` up -- one
 * ordering, two reflows, both lookalike-safe (see plate-data.ts for how that
 * is proven, not just eyeballed).
 *
 * Twelve names cannot fit under six columns at any width, so the plate
 * carries one reserved caption line that names whichever bird is active; its
 * height never changes, so naming a bird never nudges the page. Activating
 * dims the other eleven, opacity only, and slowly: 620ms, because anything
 * quicker fired overlapping fades as the pointer swept the row and read as a
 * flicker (owner, twice).
 *
 * "Active" is two different gestures, and they do not share event handlers
 * any more. A mouse hovers, so pointerenter/leave is immediate and
 * self-clearing -- the row never asks a mouse user to do anything. A touch
 * has no hover to leave, so it used to run through the SAME pointerenter/
 * pointerleave handlers as the mouse: a tap fires pointerdown, pointerenter
 * (highlight on), pointerup, then a touch pointer counts as having "left"
 * the moment it lifts, so the row's pointerleave fired next (highlight off),
 * and only then did click fire (highlight back on, timer armed) -- three
 * state flips for one tap, which read as a flash-clear-flash glitch rather
 * than a highlight (owner, 2026-08-29). Gated on pointerType instead: a
 * touch pointer is ignored by enter/leave entirely and only ever answers to
 * click, so a tap is the one state change it has ever been meant to be. A
 * tap sets the same state AND starts a timer that clears it on its own after
 * TAP_HOLD_MS; without the timer the highlight would stick until something
 * else was tapped, which read as the row being stuck open (owner,
 * 2026-08-22, replacing a version that only revealed a name on a
 * press-and-hold). A mouse click is left alone -- hover already shows and
 * hides the bird it is resting on, so click has nothing to add for it. */

import { useCallback, useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { m } from "motion/react";
import { BirdGlyphV2 } from "@/components/common/bird-avatar-v2";
import { EASE_OUT_SMOOTH, SPRINGS } from "@/components/common/motion";
import { PLATE } from "./plate-data";

/** How long a tapped bird stays highlighted before it fades on its own. */
const TAP_HOLD_MS = 3000;

export function BirdPlate() {
  const [over, setOver] = useState<number | null>(null);
  const clearTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Set on pointerdown, read in onClick: React's click event carries no
  // pointerType of its own, so this is the only place left to ask "was this
  // a tap or a click" by the time click fires.
  const usedTouch = useRef(false);

  // Re-armed on every tap so tapping a second bird before the first one
  // fades resets the clock, rather than the new bird inheriting whatever was
  // left of the old one's countdown.
  const armAutoClear = useCallback((i: number) => {
    if (clearTimer.current) clearTimeout(clearTimer.current);
    clearTimer.current = setTimeout(() => {
      // Only clears if `i` is still the active bird: a stale timer firing
      // after the visitor has already moved on (tapped elsewhere, hovered a
      // different one with a mouse) must not blank out that newer state.
      setOver((current) => (current === i ? null : current));
    }, TAP_HOLD_MS);
  }, []);

  useEffect(() => {
    return () => {
      if (clearTimer.current) clearTimeout(clearTimer.current);
    };
  }, []);

  return (
    <div>
      <ul
        onPointerLeave={(e: ReactPointerEvent) => {
          if (e.pointerType === "touch") return;
          setOver(null);
        }}
        className="mt-[var(--space-m)] grid grid-cols-4 gap-x-[var(--space-xs)] gap-y-[var(--space-s)] sm:grid-cols-6 sm:gap-x-[var(--space-s)] sm:gap-y-[var(--space-m)]"
      >
        {PLATE.map(({ name, index, seed }, i) => (
          <m.li
            key={index}
            // On mount, not on scroll-into-view (owner: both rows appear
            // straight away). The stagger stays: twelve arrivals 30ms apart
            // still read as one gesture settling.
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...SPRINGS.gentle, delay: i * 0.03 }}
            onPointerDown={(e) => {
              usedTouch.current = e.pointerType === "touch";
            }}
            onPointerEnter={(e) => {
              if (e.pointerType === "touch") return;
              setOver(i);
            }}
            onClick={() => {
              if (!usedTouch.current) return;
              setOver(i);
              armAutoClear(i);
            }}
          >
            {/* The dim lives on an inner element so it never fights the
                entrance animation for the same opacity channel. */}
            <span
              role="img"
              aria-label={name}
              className="block aspect-square w-full [&>svg]:h-full [&>svg]:w-full"
              style={{
                opacity: over !== null && over !== i ? 0.3 : 1,
                transition: "opacity 620ms var(--ease-out-smooth)",
              }}
            >
              <BirdGlyphV2 seed={seed} px={96} speciesOverride={index} />
            </span>
          </m.li>
        ))}
      </ul>

      <p className="mt-[var(--space-m)] h-5 text-sm leading-5">
        {over !== null && (
          <m.span
            key={PLATE[over].name}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.45, ease: EASE_OUT_SMOOTH }}
            className="font-medium text-foreground"
          >
            {PLATE[over].name}
          </m.span>
        )}
      </p>
    </div>
  );
}
