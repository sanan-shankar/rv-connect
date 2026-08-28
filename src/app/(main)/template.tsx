"use client";

/* ------------------------------------------------------------------ *
 *  Content cross-fade for the authenticated app.
 *
 *  In the App Router a template (unlike a layout) re-mounts on every
 *  navigation. So wrapping {children} in a m.div here gives the
 *  whole app a quick, calm content entrance every time you move
 *  between Feed, Directory, Letters, Catch-ups, Collection, and the
 *  rest: the incoming view fades in and rises a few pixels into place.
 *
 *  A pure fade and rise (no scale) so only the content moves; the
 *  sidebar and background live in AppShell, outside this template, so
 *  they stay still. Hydration-safe: server and client both render the
 *  initial frame, then the client animates. Per owner decision we do
 *  NOT branch on reduced m. transform + opacity only.
 * ------------------------------------------------------------------ */

import { m } from "motion/react";
import { SPRINGS } from "@/components/common/motion";

export default function MainTemplate({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <m.div
      /* Passes the shell's height through to the page, which the directory map
         fills instead of measuring the window (see app-shell.tsx). A flex
         column of block children stacks exactly as the block box did. */
      className="flex min-h-0 flex-1 flex-col"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={SPRINGS.gentle}
    >
      {children}
    </m.div>
  );
}
