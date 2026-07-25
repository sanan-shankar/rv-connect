"use client";

/* ------------------------------------------------------------------ *
 *  Empty messages list — the same shape as the other resident-hoopoe
 *  moments (empty group, no saved posts): the bird is already sitting in
 *  the empty state, gives one wave when the panel scrolls into view, and
 *  settles content. It is decorative and aria-hidden; the empty state's
 *  own copy is what actually says "there is nothing here", so the panel
 *  still reads correctly on desktop where the sidebar resident holds the
 *  one-hoopoe slot and this one stands down.
 * ------------------------------------------------------------------ */

import { useRef } from "react";
import { Hoopoe } from "@/components/mascot/hoopoe";
import { useHoopoe } from "@/components/mascot/use-hoopoe";
import { wait } from "@/components/mascot/hoopoe-kit";
import { useMomentAutoplay, useSoloHoopoe } from "@/components/mascot/moments/moment-hoopoe";

export function MessagesEmptyHoopoe({
  size = 62,
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
    h.sequence(["wave", 1], wait(150), ["express", "content"]);
  });

  if (!solo) return null;

  return (
    <div ref={stageRef} aria-hidden className={className}>
      <Hoopoe ref={ref} size={size} />
    </div>
  );
}
