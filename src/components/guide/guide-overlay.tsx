"use client";

/* ------------------------------------------------------------------ *
 *  <GuideOverlay> — the chapter, over the page you were on.
 *
 *  The app's one bottom sheet (ui/sheet's BottomSheet), so it wears the
 *  same X and swipe-down as every other panel that rises from the foot
 *  of the screen.
 *
 *  THE HEADER. "Guide" is a small label, not the sheet's usual 18px
 *  serif title, and it stands on the chapter's own left line. The owner,
 *  2026-09-27: "If you don't want guide to be the biggest text element,
 *  which is fair, Why are you pushing it off to the left? [...] Either
 *  just move it above the feed, but to the same left line". It sat at the
 *  header's 16px while the chapter sat at 24 (36 on a laptop). The sheet
 *  is now the standard `max-w-xl` rather than `max-w-3xl`, which puts
 *  label, title and text on the sheet's own 16px inset without a
 *  per-sheet header, and brings a line to ~68 characters on a laptop
 *  (it was ~100; the width only existed to give the diagrams room).
 *
 *  THE SWAP. Next changes the chapter without closing the sheet: the old
 *  one fades out, the body goes back to its top while nothing is showing,
 *  and the new one rises in. Focus moves to the new title so a screen
 *  reader starts there.
 *
 *  THE TWO THINGS THAT MADE IT FEEL CHEAP, both measured:
 *
 *  1. No entrance. A sheet born open has no closed-to-open transition to
 *     run: traced at 30ms intervals it went from absent to fully opaque
 *     in one sample. So it mounts shut and opens on the next frame.
 *
 *  2. No exit. The sheet closes first, and the store lets go once the
 *     animation has actually finished.
 *
 *  One fixed height, not sized to content, so every chapter opens at the
 *  same height (owner: "the panels all start at different heights").
 * ------------------------------------------------------------------ */

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, m } from "motion/react";
import { BottomSheet, BOTTOM_SHEET_MS } from "@/components/ui/sheet";
import { EASE_OUT_SMOOTH } from "@/components/common/motion";
import { closeGuide } from "@/lib/guide-open";

export function GuideOverlay({
  slug,
  title,
  footer,
  children,
}: {
  slug: string;
  title: string;
  /** The tour's footer. Handed the sheet's own close, so Done leaves the same
   *  way the X does: the sheet falls, then the store lets go. */
  footer?: (close: () => void) => React.ReactNode;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const body = useRef<HTMLDivElement>(null);

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

  /* Runs in the gap between the old chapter leaving and the new one arriving,
     so the jump to the top is never seen. The new chapter is not mounted yet
     at this point (mode="wait" mounts it after this fires), so focus is only
     promised here and handed over once it has arrived. */
  const focusNext = useRef(false);
  const onSwapped = useCallback(() => {
    if (body.current) body.current.scrollTop = 0;
    focusNext.current = true;
  }, []);
  const onArrived = useCallback(() => {
    if (!focusNext.current) return;
    focusNext.current = false;
    body.current?.querySelector("h1")?.focus({ preventScroll: true });
  }, []);
  const close = useCallback(() => onOpenChange(false), [onOpenChange]);

  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title={
        <span
          aria-label={`Guide: ${title}`}
          className="font-sans text-[12px] font-semibold uppercase tracking-[0.1em] text-muted-foreground"
        >
          Guide
        </span>
      }
      className="h-[calc(100svh-2rem)] max-h-none"
      /* Less air under the last line when the footer carries the way on. */
      bodyClassName={footer ? "pt-3 pb-8" : "pt-3 pb-14"}
      bodyRef={body}
      footer={footer?.(close)}
    >
      <AnimatePresence mode="wait" initial={false} onExitComplete={onSwapped}>
        <m.div
          key={slug}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0, transition: { duration: 0.24, ease: EASE_OUT_SMOOTH } }}
          exit={{ opacity: 0, transition: { duration: 0.12, ease: "easeOut" } }}
          onAnimationComplete={onArrived}
        >
          {children}
        </m.div>
      </AnimatePresence>
    </BottomSheet>
  );
}
