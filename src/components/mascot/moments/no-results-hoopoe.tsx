"use client";

/* ------------------------------------------------------------------ *
 *  No search results — approved as designed on the mascot-moments idea
 *  board: curious, hunts left then right as if looking for the match,
 *  a small no-luck shake, back to content. Shared by the directory
 *  search and the feed search (the board scopes this moment to both).
 *  No copy of its own; the surface's own "no matches" text is the
 *  actual message, this is the quiet second voice.
 * ------------------------------------------------------------------ */

import { wait } from "@/components/mascot/hoopoe-kit";
import { MomentStage } from "./moment-hoopoe";

export function NoResultsHoopoe({
  size = 72,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <MomentStage
      size={size}
      className={className}
      play={(h) =>
        h.sequence(
          ["express", "curious"],
          () => h.gaze(-0.85),
          wait(430),
          () => h.gaze(0.85),
          wait(430),
          () => h.gaze(0),
          ["shake", 1],
          ["express", "content"]
        )
      }
    />
  );
}
