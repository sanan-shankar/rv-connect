"use client";

import { useState } from "react";
import { Heart } from "@phosphor-icons/react";
import { motion } from "motion/react";
import { SPRINGS, EASE_POP } from "@/components/common/motion";

// Tiny flecks that drift up when a heart is liked, in the valley palette. Timing/scale ported from
// the /lab feedback lab so they drift slowly (0.9s) instead of snapping.
const LEAF_FLECKS = [
  { x: -14, y: -34, c: "#1F8A4C" },
  { x: 13, y: -40, c: "#C2622F" },
  { x: 2, y: -44, c: "#235C49" },
];

/**
 * ONE heart, ONE size. There used to be an `sm` variant at 12px against the
 * `md` 18px, and it spread: comments took it, and every profile concept took
 * it, so the same heart showed up at two thirds the ink depending on where you
 * met it. The owner's read, seeing them side by side: "what's this sudden habit
 * of all the heart icons being half the size it should be?"
 *
 * The love button is already pinned to one colour on purpose (#E03A33, see
 * below). Pinning the size too is the same argument: it is a single recognisable
 * mark, not a scalable decoration. If a future surface genuinely needs a smaller
 * heart, change it here, once, rather than reintroducing a per-call-site knob.
 */
const HEART = { icon: 18, gap: "gap-1.5", padding: "px-2.5 py-1.5" } as const;

/**
 * One shared love/like button for the whole app (feed posts, comments, the Collection,
 * group posts). Captures the feed's exact "never flashes black" interaction:
 * - The heart is hardcoded to #E03A33 and painted on the first frame with `transition: none`,
 *   so it can never tween through the inherited/dark colour.
 * - Only `transform` animates: a smooth multi-keyframe pop (tween, EASE_POP, never a spring).
 * - Three leaf flecks drift outward and fade on like.
 *
 * Per DESIGN-SYSTEM sec. 7 / PUNCHLIST: extract once, reuse everywhere. Do not fork this again.
 */
export function LoveButton({
  liked,
  count,
  onToggle,
  showCount = true,
  className = "",
  label,
}: {
  liked: boolean;
  count: number;
  onToggle: () => void;
  /** Hide the count entirely (e.g. comment hearts already hide count at 0 via the caller). */
  showCount?: boolean;
  className?: string;
  label?: string;
}) {
  const [animate, setAnimate] = useState(false);
  const { icon, gap, padding } = HEART;

  function handleClick() {
    if (!liked) {
      setAnimate(true);
      setTimeout(() => setAnimate(false), 900);
    }
    onToggle();
  }

  return (
    <motion.button
      type="button"
      onClick={handleClick}
      aria-pressed={liked}
      aria-label={label}
      whileTap={{ scale: 0.93 }}
      transition={SPRINGS.snappy}
      className={`inline-flex items-center ${gap} rounded-full ${padding} text-sm hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 ${
        liked ? "text-heart" : "hover:text-foreground"
      } ${className}`}
    >
      <span className="relative inline-flex">
        {/* Heart is ALWAYS red, painted on the first frame. transition:none stops it
            tweening through the dark inherited colour, so it can never flash black.
            Only transform animates: a smooth multi-keyframe pop (tween, never a spring). */}
        <motion.span
          className="inline-flex will-change-transform"
          animate={animate ? { scale: [1, 0.86, 1.28, 0.97, 1] } : { scale: 1 }}
          transition={
            animate
              ? { duration: 0.5, ease: EASE_POP, times: [0, 0.18, 0.5, 0.74, 1] }
              : { duration: 0 }
          }
        >
          <Heart
            size={icon}
            weight={liked ? "fill" : "duotone"}
            color="#E03A33"
            style={{ opacity: liked ? 1 : 0.45, transition: "none" }}
          />
        </motion.span>
        {animate && (
          <span aria-hidden className="pointer-events-none absolute left-1/2 top-1/2">
            {LEAF_FLECKS.map((f, i) => (
              <motion.span
                key={i}
                className="absolute block rounded-full"
                style={{ width: 7, height: 7, marginLeft: -3.5, marginTop: -3.5, background: f.c }}
                initial={{ opacity: 0, x: 0, y: 0, scale: 0.5, rotate: 0 }}
                animate={{
                  opacity: [0, 0.95, 0.95, 0],
                  x: f.x,
                  y: f.y,
                  scale: [0.5, 1, 1, 0.9],
                  rotate: f.x > 0 ? 40 : -40,
                }}
                transition={{ duration: 0.9, ease: EASE_POP, times: [0, 0.18, 0.7, 1] }}
              />
            ))}
          </span>
        )}
      </span>
      {showCount && <span>{count}</span>}
    </motion.button>
  );
}
