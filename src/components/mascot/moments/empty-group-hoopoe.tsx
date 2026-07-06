"use client";

/* ------------------------------------------------------------------ *
 *  Empty group — approved idea #08 off the mascot-moments board: the
 *  hoopoe is already perched on the group header. A single wave when
 *  you arrive, a soft express, then it points at Invite classmates and
 *  settles. "The perch is the only new piece" per the board, i.e. this
 *  is the existing verb set (wave / express / point) in a new resting
 *  spot, not a new animation primitive.
 *
 *  Only rendered for the Keeper of a genuinely empty group (no posts,
 *  no one invited yet), since Invite classmates only exists for them —
 *  pointing at a button a viewer can't see would be a moment that
 *  fights its own page semantics.
 * ------------------------------------------------------------------ */

import { useRef } from "react";
import { Hoopoe } from "@/components/mascot/hoopoe";
import { useHoopoe } from "@/components/mascot/use-hoopoe";
import { wait } from "@/components/mascot/hoopoe-kit";
import { useMomentAutoplay, useSoloHoopoe } from "./moment-hoopoe";

/** Read-only ref shape so any element-typed `useRef` (div, button, ...) can be
 *  passed in without a variance fight over the mutable `current` setter. */
type Peekable = { readonly current: HTMLElement | null };

export function EmptyGroupHoopoe({
  inviteRef,
  size = 60,
  className = "",
}: {
  inviteRef: Peekable;
  size?: number;
  className?: string;
}) {
  const { ref, ...h } = useHoopoe();
  const stageRef = useRef<HTMLDivElement>(null);
  const solo = useSoloHoopoe();

  useMomentAutoplay(stageRef, () => {
    h.cancel();
    h.sequence(
      ["wave", 1],
      ["express", "happy"],
      wait(150),
      ["point", inviteRef.current, { label: "Invite classmates", hold: 900 }],
      wait(150),
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
