"use client";

import { useEffect, useState } from "react";

/**
 * Whether the viewport is wide enough for a side panel, kept live.
 *
 * The shell is chosen from the VIEWPORT rather than left to Radix's collision
 * flipping, because at 390px a side panel has nowhere to flip to that is not
 * also off-screen: below the breakpoint these surfaces switch shells entirely,
 * to a bottom sheet, rather than letting a side popover degrade into one that
 * opens below the trigger and covers the rows underneath it.
 *
 * False until the first effect runs, so the server and the first client frame
 * agree and nothing flips shell during hydration.
 *
 * Extracted because the house-chain editor and the year-row house picker each
 * carried a copy. The picker itself was deleted on 2026-09-07 (owner: "delete
 * the whole house picker lab we don't need it"); the editor still uses this,
 * and so does anything else that must choose a shell rather than a side.
 */
export function useWideViewport(): boolean {
  const [wide, setWide] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const sync = () => setWide(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return wide;
}
