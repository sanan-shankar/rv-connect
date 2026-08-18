"use client";

/* The reward preview on /support, for members who have not contributed yet:
 * fourteen of the fifty, two rows of seven, arranged and faced by
 * plate-data.ts so the row shows the collection's variety rather than its
 * first N indices.
 *
 * Fourteen names cannot fit under seven columns at any width, so the plate
 * carries one reserved caption line that names whichever bird the pointer is
 * over; its height never changes, so naming a bird never nudges the page.
 * Pointing dims the other thirteen, opacity only, and slowly: 620ms, because
 * anything quicker fired seven overlapping fades as the pointer swept the row
 * and read as a flicker (owner, twice). */

import { useState } from "react";
import { motion } from "motion/react";
import { BirdGlyphV2 } from "@/components/common/bird-avatar-v2";
import { EASE_OUT_SMOOTH, SPRINGS } from "@/components/common/motion";
import { PLATE } from "./plate-data";

export function BirdPlate() {
  const [over, setOver] = useState<number | null>(null);

  return (
    <div>
      <ul
        onPointerLeave={() => setOver(null)}
        className="mt-[var(--space-m)] grid grid-cols-7 gap-x-[var(--space-xs)] gap-y-[var(--space-s)] sm:gap-x-[var(--space-s)] sm:gap-y-[var(--space-m)]"
      >
        {PLATE.map(({ name, index, seed }, i) => (
          <motion.li
            key={index}
            // On mount, not on scroll-into-view (owner: both rows appear
            // straight away). The stagger stays: fourteen arrivals 30ms
            // apart still read as one gesture settling.
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...SPRINGS.gentle, delay: i * 0.03 }}
            onPointerEnter={() => setOver(i)}
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
