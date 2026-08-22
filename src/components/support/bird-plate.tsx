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
 * "Active" is two different gestures. A mouse hovers, so pointerenter/leave
 * is immediate and self-clearing -- the row never asks a mouse user to do
 * anything. A touch has no hover to leave, so a tap sets the same state AND
 * starts a timer that clears it on its own after TAP_HOLD_MS; without the
 * timer the highlight would stick until something else was tapped, which
 * read as the row being stuck open (owner, 2026-08-22, replacing a version
 * that only revealed a name on a press-and-hold). */

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { BirdGlyphV2 } from "@/components/common/bird-avatar-v2";
import { EASE_OUT_SMOOTH, SPRINGS } from "@/components/common/motion";
import { PLATE } from "./plate-data";

const TAP_HOLD_MS = 7000;

export function BirdPlate() {
  const [over, setOver] = useState<number | null>(null);
  const clearTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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
        onPointerLeave={() => setOver(null)}
        className="mt-[var(--space-m)] grid grid-cols-4 gap-x-[var(--space-xs)] gap-y-[var(--space-s)] sm:grid-cols-6 sm:gap-x-[var(--space-s)] sm:gap-y-[var(--space-m)]"
      >
        {PLATE.map(({ name, index, seed }, i) => (
          <motion.li
            key={index}
            // On mount, not on scroll-into-view (owner: both rows appear
            // straight away). The stagger stays: twelve arrivals 30ms apart
            // still read as one gesture settling.
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...SPRINGS.gentle, delay: i * 0.03 }}
            onPointerEnter={() => setOver(i)}
            onClick={() => {
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
          </motion.li>
        ))}
      </ul>

      <p className="mt-[var(--space-m)] h-5 text-sm leading-5">
        {over !== null && (
          <motion.span
            key={PLATE[over].name}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.45, ease: EASE_OUT_SMOOTH }}
            className="font-medium text-foreground"
          >
            {PLATE[over].name}
          </motion.span>
        )}
      </p>
    </div>
  );
}
