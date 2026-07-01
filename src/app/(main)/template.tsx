"use client";

/* ------------------------------------------------------------------ *
 *  Content cross-fade for the authenticated app.
 *
 *  In the App Router a template (unlike a layout) re-mounts on every
 *  navigation. So wrapping {children} in a motion.div here gives the
 *  whole app a quick, calm content entrance every time you move
 *  between Feed, Directory, Letters, Catch-ups, Collection, and the
 *  rest: the incoming view fades in and rises a few pixels into place.
 *
 *  A pure fade and rise (no scale) so only the content moves; the
 *  sidebar and background live in AppShell, outside this template, so
 *  they stay still. Hydration-safe: server and client both render the
 *  initial frame, then the client animates. Per owner decision we do
 *  NOT branch on reduced motion. transform + opacity only.
 * ------------------------------------------------------------------ */

import { motion } from "motion/react";
import { SPRINGS } from "@/components/common/motion";

export default function MainTemplate({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={SPRINGS.gentle}
    >
      {children}
    </motion.div>
  );
}
