"use client";

/* ------------------------------------------------------------------ *
 *  One way into the image viewer.
 *
 *  Six files used to know the viewer's module path, and each of them wrote
 *  the same four things: the `dynamic()`, the bare `import()` that warms it,
 *  a `mounted`/`at` pair set together in an `open(i)`, and a
 *  `{mounted && <ImageViewer ... />}`. Five copies of a latch is five places
 *  for the latch to be got wrong, and only one of them carried the argument
 *  for why it is a latch at all. It is here now.
 *
 *  WHY A LATCH, not `{at !== null && ...}`. The viewer must STAY mounted once
 *  it has been opened, because its own exit animation needs something to play
 *  out of -- but it must not mount before the first open, or every card on a
 *  page would fetch the chunk on render and the deferral would buy nothing.
 *  True once, then true forever.
 *
 *  WHY A PRELOAD. The owner, clicking a photograph during the brief: "Oh, wow.
 *  This doesn't even load. What? I clicked on picture. Okay. Loaded." Every
 *  opener wires `preloadImageViewer` to `onPointerEnter` and `onFocus`, so on
 *  any normal pointer the chunk is in memory before the press lands.
 * ------------------------------------------------------------------ */

import { useState } from "react";
import dynamic from "next/dynamic";

export const LazyImageViewer = dynamic(
  () => import("@/components/common/image-viewer").then((m) => m.ImageViewer),
  { ssr: false }
);

export const preloadImageViewer = () => void import("@/components/common/image-viewer");

/**
 * The open/closed state five surfaces share. `at` is the index the viewer is
 * open at, or null for closed; `mounted` is the latch above.
 *
 * `initialAt` is for a surface that arrives already open -- /collection/[id]
 * lands on a shared link with a photograph showing.
 */
export function useImageViewer(initialAt: number | null = null) {
  const [at, setAt] = useState<number | null>(initialAt);
  const [mounted, setMounted] = useState(initialAt !== null);
  return {
    at,
    mounted,
    open: (index: number) => {
      setMounted(true);
      setAt(index);
    },
    close: () => setAt(null),
  };
}
