"use client";

/* ------------------------------------------------------------------ *
 *  Content cross-fade for the authenticated app.
 *
 *  In the App Router a template (unlike a layout) re-mounts on every
 *  navigation. So wrapping {children} in a motion.div here gives the
 *  whole app a quick, calm content cross-fade every time you move
 *  between Feed, Directory, Letters, Catch-ups, Collection, and the
 *  rest: the incoming view fades in and rises a few pixels into place.
 *
 *  Fast on purpose (about 240ms) so it never feels slow. Hydration-safe:
 *  server and client both render the initial frame, then the client
 *  animates. Per owner decision we do NOT branch on reduced motion.
 *  transform + opacity only.
 * ------------------------------------------------------------------ */

import { motion } from "motion/react";
import { EASE_SPRING } from "@/components/common/motion";

export default function MainTemplate({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6, scale: 0.99 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.24, ease: EASE_SPRING }}
    >
      {children}
    </motion.div>
  );
}
