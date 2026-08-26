"use client";

/* ------------------------------------------------------------------ *
 *  Empty messages list — the same shape as the other resident-hoopoe
 *  moments: the bird is already sitting in the empty state, gives one
 *  wave when the panel scrolls into view, and settles content. It is
 *  decorative and aria-hidden; the empty state's own copy is what
 *  actually says "there is nothing here", so the panel still reads
 *  correctly on desktop where the sidebar resident holds the one-hoopoe
 *  slot and this one stands down.
 * ------------------------------------------------------------------ */

import { wait } from "@/components/mascot/hoopoe-kit";
import { MomentStage } from "./moment-hoopoe";

export function MessagesEmptyHoopoe({
  size = 62,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <MomentStage
      size={size}
      className={className}
      play={(h) => h.sequence(["wave", 1], wait(150), ["express", "content"])}
    />
  );
}
