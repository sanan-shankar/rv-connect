"use client";

/* ------------------------------------------------------------------ *
 *  <ResidentHoopoe> — a bird that has no moment of its own to play,
 *  only a place to sit (the Catch-ups empty and finished screens). It
 *  used to be a bare <Hoopoe> that breathed and blinked and did nothing
 *  else; this is the same bird with `useHoopoeLife` running from the
 *  start. The one-hoopoe rule stays with the caller, as before.
 * ------------------------------------------------------------------ */

import { Hoopoe } from "./hoopoe";
import { useHoopoe } from "./use-hoopoe";
import { useHoopoeLife } from "./use-hoopoe-life";

export function ResidentHoopoe({ size, className }: { size: number; className?: string }) {
  const { ref, ...h } = useHoopoe();
  useHoopoeLife(h, true);
  return <Hoopoe ref={ref} size={size} className={className} />;
}
