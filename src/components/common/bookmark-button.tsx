"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { SPRINGS, EASE_POP } from "@/components/common/motion";

/**
 * One shared save/bookmark button for the whole app (feed posts, group posts,
 * letters, anything else). Same tier as {@link LoveButton}: if a surface adds a
 * bookmark, it adds THIS one, animation included. Do not fork it.
 *
 * The saved-state animation (owner brief): the ribbon drops in from the TOP
 * edge and extends downward, stretches a touch PAST its resting length, then
 * bounces back up to rest. Two coordinated layers, transform-only:
 *  - the cinnamon fill is clipped to the ribbon and revealed top-down
 *    (scaleY 0 -> 1 about the ribbon's top edge), so the colour pours in from
 *    the top instead of rising from the middle;
 *  - the whole mark springs its height (scaleY 1 -> 1.08 -> 1 about its top),
 *    which is the visible "extend past, then settle" bounce.
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
      setTimeout(() => setAnimate(false), 520);
    }
    onToggle();
  }

  return (
    <motion.button
      type="button"
      onClick={handleClick}
      aria-pressed={saved}
      aria-label={label ?? (saved ? "Remove bookmark" : "Save")}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.93 }}
      transition={SPRINGS.snappy}
      className={`flex items-center rounded-full px-2.5 py-1.5 text-sm hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 ${
        saved ? "text-cinnamon" : "hover:text-foreground"
      } ${className}`}
    >
      <motion.span
        className="relative inline-grid place-items-center will-change-transform"
        animate={animate ? { scaleY: [1, 1.08, 1] } : { scaleY: 1 }}
        transition={
          animate
            ? { duration: 0.5, ease: EASE_POP, times: [0, 0.42, 1] }
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
            fill="#C2622F"
            style={{ transformBox: "fill-box", transformOrigin: "50% 50%" }}
            initial={false}
            animate={{ scaleY: saved ? 1 : 0 }}
            transition={
              animate
                ? SPRINGS.gentle
                : { duration: saved ? 0 : 0.16, ease: "easeIn" }
            }
          />
          <path
            d="M5 4 H35 V52 L20 42 L5 52 Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="4"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        </svg>
      </motion.span>
    </motion.button>
  );
}
