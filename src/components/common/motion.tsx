"use client";

/* ------------------------------------------------------------------ *
 *  Shared motion foundation for the real app. One spring set, one set
 *  of ease curves, and two primitives (FadeRise, SpringPress), so every
 *  promoted delight reads like one hand made it. Ported from the
 *  /preview/delight lab kit. Light-mode app; transform/opacity only.
 *
 *  Owner decision: motion runs all the time, by choice. We deliberately
 *  do NOT gate any of this on the OS prefers-reduced-motion setting.
 * ------------------------------------------------------------------ */

import { motion, type MotionProps } from "motion/react";
import type { ReactNode, CSSProperties } from "react";

/* one spring set to rule them all (matches the v2 / lab feel) */
export const SPRINGS = {
  gentle: { type: "spring", stiffness: 210, damping: 24, mass: 0.9 } as const, // enters, route changes
  snappy: { type: "spring", stiffness: 420, damping: 30 } as const, // pills, presses, avatars
  settle: { type: "spring", stiffness: 160, damping: 22 } as const, // ambient, breathing
};

/* ease curves for multi-keyframe tweens (never pair 3+ keyframes with a spring) */
export const EASE_POP = [0.34, 1.56, 0.64, 1] as const; // anticipation + overshoot
export const EASE_SPRING = [0.34, 1.5, 0.64, 1] as const; // softer settle

/* The sidebar active-row marker glides with a touch more weight than `snappy`, so the pill and its
   cinnamon edge settle rather than snap dead. Shared so any future edge-marker reads the same. */
export const NAV_MARKER_SPRING = { type: "spring", stiffness: 480, damping: 38, mass: 0.9 } as const;

/* Content rises a touch as it arrives. Hydration-safe: server and client both
   render the initial frame, then the client animates (no reduced-motion branching). */
export function FadeRise({
  children,
  delay = 0,
  y = 10,
  className,
  style,
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <motion.div
      className={className}
      style={style}
      initial={{ opacity: 0, y }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...SPRINGS.gentle, delay }}
    >
      {children}
    </motion.div>
  );
}

/* A clear press on every clickable: a sink on tap, a small lift on hover, one spring. */
export function SpringPress({
  children,
  className,
  onClick,
  as = "button",
  ...rest
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  as?: "button" | "div" | "a" | "span";
} & MotionProps) {
  const Comp = (motion as unknown as Record<string, typeof motion.button>)[as] ?? motion.button;
  return (
    <Comp
      className={className}
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.93 }}
      transition={SPRINGS.snappy}
      {...rest}
    >
      {children}
    </Comp>
  );
}
