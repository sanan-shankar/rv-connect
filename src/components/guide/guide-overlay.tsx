"use client";

/* ------------------------------------------------------------------ *
 *  <GuideOverlay> — the chapter, over the page you were on.
 *
 *  The app's one bottom sheet (ui/sheet's BottomSheet), so it wears the
 *  same title row, X and swipe-down as every other panel that rises from
 *  the foot of the screen. The row says "Guide"; the chapter's own
 *  display heading says which one, a line below.
 *
 *  THE TWO THINGS THAT MADE IT FEEL CHEAP, both measured:
 *
 *  1. No entrance. This component is rendered by a route, so it mounts
 *     with the sheet ALREADY open, and a sheet that is born open has no
 *     closed-to-open transition to run. Traced at 30ms intervals it went
 *     from absent to fully opaque in one sample. So it now mounts shut
 *     and opens on the next frame, which is the whole difference between
 *     appearing and arriving.
 *
 *  2. No exit. Closing was router.back(), which unmounts the tree on the
 *     spot, so the sheet's own exit styles never got a frame either. Now
 *     the sheet closes first, and the store lets go once the animation
 *     has actually finished.
 *
 *  One fixed height, not sized to content. Sized to content, every
 *  chapter opened at a different height and the thing had no shape of its
 *  own (owner: "the panels all start at different heights").
 * ------------------------------------------------------------------ */

import { useCallback, useEffect, useState } from "react";
import { BottomSheet, BOTTOM_SHEET_MS } from "@/components/ui/sheet";
import { closeGuide } from "@/lib/guide-open";

export function GuideOverlay({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  // Shut on the first paint, open on the next frame. Without this there is no
  // enter transition at all: see the note at the top.
  useEffect(() => {
    const frame = requestAnimationFrame(() => setOpen(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  /* Close, then clear the store once the sheet has left. The back gesture
     needs no special case: the Sheet owns a history entry while open, so back
     arrives here through onOpenChange, the same road as the X. */
  const onOpenChange = useCallback((next: boolean) => {
    if (next) return;
    setOpen(false);
    window.setTimeout(closeGuide, BOTTOM_SHEET_MS);
  }, []);

  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title={<span aria-label={`Guide: ${title}`}>Guide</span>}
      className="h-[calc(100svh-2rem)] max-h-none max-w-3xl"
      bodyClassName="px-6 pb-14 pt-2 sm:px-9"
    >
      {children}
    </BottomSheet>
  );
}
