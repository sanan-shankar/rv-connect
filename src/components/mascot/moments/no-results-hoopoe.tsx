"use client";

/* ------------------------------------------------------------------ *
 *  No search results — approved as designed on the mascot-moments idea
 *  board: curious, hunts left then right as if looking for the match,
 *  a small no-luck shake, back to content. Shared by the directory
 *  search and the feed search (the board scopes this moment to both).
 *  No copy of its own; the surface's own "no matches" text is the
 *  actual message, this is the quiet second voice.
 * ------------------------------------------------------------------ */

import { useRef } from "react";
import { Hoopoe } from "@/components/mascot/hoopoe";
import { useHoopoe } from "@/components/mascot/use-hoopoe";
import { wait } from "@/components/mascot/hoopoe-kit";
import { useMomentAutoplay, useSoloHoopoe } from "./moment-hoopoe";

export function NoResultsHoopoe({
  size = 72,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  const { ref, ...h } = useHoopoe();
  const stageRef = useRef<HTMLDivElement>(null);
  const solo = useSoloHoopoe();

  useMomentAutoplay(stageRef, () => {
    h.cancel();
    h.sequence(
      ["express", "curious"],
      () => h.gaze(-0.85),
      wait(430),
      () => h.gaze(0.85),
      wait(430),
      () => h.gaze(0),
      ["shake", 1],
      ["express", "content"]
    );
  });

  if (!solo) return null;

  return (
    <div ref={stageRef} aria-hidden className={className}>
      <Hoopoe ref={ref} size={size} />
    </div>
  );
}
