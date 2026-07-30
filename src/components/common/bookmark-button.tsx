"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { SPRINGS, EASE_POP } from "@/components/common/motion";

/**
 * One shared save/bookmark button for the whole app (feed posts, group posts,
 * letters, anything else). Same tier as {@link LoveButton}: if a surface adds a
 * bookmark, it adds THIS one, animation included. Do not fork it.
 *
 * The saved-state animation (owner brief): the colour pours down from the TOP
 * edge, and the moment it REACHES THE BOTTOM its weight tugs the mark down a
 * little, which then bounces back up to rest. The two layers OVERLAP at the
 * landing moment. The earlier bug was an ease-out fill that visually finished
 * pouring almost immediately (front-loaded), so the colour LOOKED landed long
 * before the tug fired, reading as a janky gap.
 *  - the cinnamon fill is clipped to the ribbon and revealed top-down
 *    (scaleY 0 -> 1 about the ribbon's top edge), so the colour pours in from
 *    the top instead of rising from the middle. It pours at a LINEAR rate over
 *    300ms, so there is one clear, predictable moment it hits the bottom (an
 *    ease-out would fake an early landing; a spring has no fixed settle time);
 *  - the bounce is delayed to exactly 300ms, so it begins the INSTANT the fill
 *    reaches the bottom, never before (scaleY 1 -> 1.08 -> 0.99 -> 1 about the
 *    top: the arriving colour's weight overshoots the mark down, it bounces back
 *    up past rest, then settles). Starting it a hair early was the last jank.
 * Unsaving just retracts the fill straight back up to the top, quickly, with no
 * reverse theatrics. The outline is `currentColor`, so it reads muted at rest
 * and cinnamon once saved (the button owns that colour swap).
 */
export function BookmarkButton({
  saved,
  onToggle,
  id,
  className = "",
  label,
}: {
  saved: boolean;
  onToggle: () => void;
  /** Unique per instance: namespaces the SVG clipPath id so multiple cards don't collide. */
  id: string;
  className?: string;
  label?: string;
}) {
  const [animate, setAnimate] = useState(false);

  function handleClick() {
    if (!saved) {
      setAnimate(true);
      // fill pours LINEARLY and reaches the bottom at exactly 300ms; the bounce is
      // delayed to 300ms so it begins the instant the colour lands, then runs 420ms.
      setTimeout(() => setAnimate(false), 740);
    }
    onToggle();
  }

  return (
    <motion.button
      type="button"
      onClick={handleClick}
      aria-pressed={saved}
      aria-label={label ?? (saved ? "Remove bookmark" : "Save")}
      whileTap={{ scale: 0.93 }}
      transition={SPRINGS.snappy}
      className={`flex items-center rounded-full px-2.5 py-1.5 text-sm hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 ${
        saved ? "text-cinnamon" : "hover:text-foreground"
      } ${className}`}
    >
      <motion.span
        className="relative inline-grid place-items-center will-change-transform"
        animate={animate ? { scaleY: [1, 1.08, 0.99, 1] } : { scaleY: 1 }}
        transition={
          animate
            ? { duration: 0.42, ease: "easeOut", times: [0, 0.3, 0.62, 1], delay: 0.3 }
            : { duration: 0 }
        }
        style={{ transformOrigin: "50% 8%" }}
      >
        <svg
          width="13"
          height="18"
          viewBox="0 0 40 56"
          aria-hidden
          style={{ overflow: "visible", display: "block" }}
        >
          <defs>
            <clipPath id={`bm-${id}`}>
              <path d="M5 4 H35 V52 L20 42 L5 52 Z" />
            </clipPath>
          </defs>
          {/* Fill reveals TOP-DOWN. Framer scales an SVG rect about its own bounding-box
              centre (transform-origin is ignored here), so the rect is sized/placed with its
              centre exactly on the ribbon's top edge (y=4, height 104 -> y=-48). scaleY 0 -> 1
              then grows the colour downward from the top; unsave retracts it straight back up.
              (The old rect was centred at y=28, which is why it "appeared from the middle".) */}
          <motion.rect
            clipPath={`url(#bm-${id})`}
            x="3"
            y="-48"
            width="34"
            height="104"
            fill="var(--color-cinnamon)"
            style={{ transformBox: "fill-box", transformOrigin: "50% 50%" }}
            initial={false}
            animate={{ scaleY: saved ? 1 : 0 }}
            transition={
              animate
                ? { duration: 0.3, ease: "linear" }
                : { duration: saved ? 0 : 0.16, ease: "easeIn" }
            }
          />
          {/* strokeWidth 3.35: the siblings are 16px Lucide icons at strokeWidth 2 (24-unit
              viewBox), i.e. 1.33px rendered and ~8.3% of icon width. This mark renders at
              13px wide from a 40-unit viewBox (scale 0.325), so matching that stroke-to-width
              RATIO (not the raw px) needs 40 * 0.083 / 1 = ~3.3 here. 4 read heavier (denser
              closed shape), 2.5 read thinner (0.81px); 3.35 = ~1.09px = optical parity. */}
          <path
            d="M5 4 H35 V52 L20 42 L5 52 Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="3.35"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        </svg>
      </motion.span>
    </motion.button>
  );
}
