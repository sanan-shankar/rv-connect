"use client";

/* ------------------------------------------------------------------ *
 *  No saved posts — approved as designed on the mascot-moments idea
 *  board: the hoopoe sits by the empty bookmark, gazes over at it,
 *  goes a touch sleepy with a slow double blink, then back to content.
 *  Quiet, never nagging (per the owner's emotional guidance, `sleepy`
 *  is used sparingly and only for a couple of beats before settling
 *  back to a content, happy-adjacent rest).
 *
 *  `bookmarkRef` is the element to gaze toward (the bookmark glyph in
 *  the empty state); the board's demo used a fixed numeric gaze bias
 *  because its bookmark icon sat at a known spot on the stage, but a
 *  real layout can vary, so this gazes at the actual element instead.
 * ------------------------------------------------------------------ */

import { useRef } from "react";
import { Hoopoe } from "@/components/mascot/hoopoe";
import { useHoopoe } from "@/components/mascot/use-hoopoe";
import { useMomentAutoplay, useSoloHoopoe } from "./moment-hoopoe";

/** Read-only ref shape so any element-typed `useRef` (div, button, ...) can be
 *  passed in without a variance fight over the mutable `current` setter. */
type Peekable = { readonly current: HTMLElement | null };

export function NoSavedHoopoe({
  bookmarkRef,
  size = 64,
  className = "",
}: {
  bookmarkRef?: Peekable;
  size?: number;
  className?: string;
}) {
  const { ref, ...h } = useHoopoe();
  const stageRef = useRef<HTMLDivElement>(null);
  const solo = useSoloHoopoe();

  useMomentAutoplay(stageRef, () => {
    h.cancel();
    h.sequence(
      () => h.gaze(bookmarkRef?.current ?? 0.7),
      ["express", "sleepy", { hold: 700 }],
      ["blinkOnce", true],
      () => h.gaze(0),
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
