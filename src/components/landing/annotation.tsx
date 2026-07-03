"use client";

import { motion, type Variants } from "motion/react";
import { EASE_SPRING } from "@/components/common/motion";

/**
 * A margin-note annotation: a short caption in a slanted serif italic, with a
 * hand-drawn arrow that unfurls (strokeDashoffset draw-on via `pathLength`) as
 * the section scrolls into view, pointing at one real part of a screenshot.
 *
 * Used sparingly (two or three across the whole page), never on every section.
 * The caption is real text (screen readers get the pointer's meaning); the arrow
 * itself is decorative and aria-hidden. Transform / opacity / strokeDashoffset
 * only, and it fires once so scrolling back never re-plays it. Motion always
 * plays per the design system, so there is no reduced-motion branch here.
 *
 * Everything is sized in container-query units (`cqw`) against the shot wrapper
 * (which must carry `@container`), and positioned with percentages, so the whole
 * annotation scales with the screenshot and lands on the same spot at every
 * width instead of overshooting on a narrow phone.
 */

const ACCENT: Record<string, string> = {
  cinnamon: "var(--color-cinnamon)",
  leaf: "var(--color-leaf)",
  sky: "var(--color-sky)",
  canopy: "var(--color-canopy)",
};

const captionVar: Variants = {
  hidden: { opacity: 0, y: 6 },
  shown: { opacity: 1, y: 0, transition: { duration: 0.42, ease: EASE_SPRING } },
};

// The stroke unfurls from nothing; the arrowhead lands after the line has almost
// finished drawing, so it reads as a single continuous gesture.
const lineVar: Variants = {
  hidden: { pathLength: 0, opacity: 0 },
  shown: {
    pathLength: 1,
    opacity: 1,
    transition: { pathLength: { duration: 0.62, delay: 0.18, ease: "easeInOut" }, opacity: { duration: 0.05, delay: 0.18 } },
  },
};

const headVar: Variants = {
  hidden: { pathLength: 0, opacity: 0 },
  shown: {
    pathLength: 1,
    opacity: 1,
    transition: { pathLength: { duration: 0.28, delay: 0.66, ease: "easeOut" }, opacity: { duration: 0.05, delay: 0.66 } },
  },
};

export type ArrowSpec = {
  viewBox: string;
  /** The unfurling curve. */
  d: string;
  /** The arrowhead, drawn last. */
  head: string;
  /**
   * Absolute placement of the SVG within the annotation unit, plus its display
   * width in cqw (e.g. "bottom-full right-1 mb-1 w-[24cqw]"). Height follows the
   * viewBox aspect ratio, so leave the height attribute off the element.
   */
  className: string;
};

export function Annotation({
  caption,
  accent = "cinnamon",
  rotate = -2.5,
  className = "",
  captionClassName = "",
  arrow,
}: {
  caption: string;
  accent?: "cinnamon" | "leaf" | "sky" | "canopy";
  rotate?: number;
  className?: string;
  captionClassName?: string;
  arrow: ArrowSpec;
}) {
  const color = ACCENT[accent] ?? ACCENT.cinnamon;
  return (
    <motion.div
      className={`pointer-events-none absolute z-20 ${className}`}
      initial="hidden"
      whileInView="shown"
      viewport={{ once: true, amount: 0.55 }}
    >
      <motion.p
        variants={captionVar}
        className={`font-heading italic leading-snug ${captionClassName}`}
        style={{ color, transform: `rotate(${rotate}deg)`, fontSize: "clamp(10.5px, 3.1cqw, 15px)" }}
      >
        {caption}
      </motion.p>
      <motion.svg
        viewBox={arrow.viewBox}
        fill="none"
        aria-hidden
        className={`absolute h-auto ${arrow.className}`}
      >
        <motion.path
          d={arrow.d}
          stroke={color}
          strokeWidth={2.4}
          strokeLinecap="round"
          strokeLinejoin="round"
          variants={lineVar}
        />
        <motion.path
          d={arrow.head}
          stroke={color}
          strokeWidth={2.4}
          strokeLinecap="round"
          strokeLinejoin="round"
          variants={headVar}
        />
      </motion.svg>
    </motion.div>
  );
}
