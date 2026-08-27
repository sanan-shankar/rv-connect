"use client";

/* ------------------------------------------------------------------ *
 *  <GuideOverlay> — the chapter, over the page you were on.
 *
 *  Built on ui/sheet, the edge-anchored variant of the one dialog
 *  material. The first version hand-rolled the whole thing and the
 *  protocol audit was right to fail it: the primitive already owns the
 *  warm-ink scrim, the focus trap, escape and the aria wiring.
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
 *     the sheet closes first, and the navigation follows once the
 *     animation has actually finished.
 *
 *  One fixed height, not h-auto. Sized to content, every chapter opened
 *  at a different height and the thing had no shape of its own (owner:
 *  "the panels all start at different heights").
 * ------------------------------------------------------------------ */

import { useCallback, useEffect, useState } from "react";
import { X } from "lucide-react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { closeGuide } from "@/lib/guide-open";

/** Matches ui/sheet's own transition. Kept as a named constant because two
 *  things depend on it agreeing: the exit animation and the navigation. */
const SHEET_MS = 200;

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

  /* Close, then put the address back. The browser's own back button needs no
     special case: it fires popstate, the store syncs, and this unmounts. Same
     end state by a different road. */
  const close = useCallback(() => {
    setOpen(false);
    // The address goes back only once the sheet has finished leaving, so the
    // exit gets its frames instead of being unmounted mid-flight.
    window.setTimeout(closeGuide, SHEET_MS);
  }, []);

  return (
    <Sheet open={open} onOpenChange={(next) => { if (!next) close(); }}>
      <SheetContent
        side="bottom"
        /* The primitive's close button sits absolutely in the corner and the
           chapter's diagrams would scroll under it. The sticky strip below
           does the same job without ever crossing a bar chart. */
        showCloseButton={false}
        /* data-[side=bottom]: matters. ui/sheet sets `data-[side=bottom]:h-auto`,
           and a plain height loses to it every time: tailwind-merge keeps both
           because they are different variant groups, and the attribute selector
           then wins on specificity. Measured before this was fixed: the
           Catch-ups panel opened 1406px tall inside a 900px window.

           svh, not dvh. On iOS the dynamic viewport unit changes as the browser
           toolbar shows and hides, so a dvh-tall sheet resizes underneath the
           finger that is scrolling it. svh is the stable one.

           The sheet IS the scroller. It used to be a flex column with a
           separate `flex-1 min-h-0 overflow-y-auto` child, which is a shape
           with several ways to end up zero-height, and one of them is somebody
           reporting they cannot scroll. One element, one scrollbar, nothing to
           get wrong. */
        className="mx-auto w-full max-w-3xl overflow-y-auto overscroll-contain rounded-t-[1.75rem] bg-card p-0 data-[side=bottom]:h-[calc(100svh-2rem)] data-[side=bottom]:duration-300 ease-out-smooth"
      >
        {/* The sheet's accessible name. The chapter's own <h1> says it on
            screen, so this one is for screen readers only. */}
        <SheetTitle className="sr-only">{title}</SheetTitle>

        {/* Sticky in a zero-height row, so the button floats at the top right
            without pushing the chapter down. A sticky strip that occupied its
            own height put about 50px of nothing above every chapter title
            (owner: "why so much padding above Feed"). It carries its own
            backing so a diagram scrolling under it stays legible. */}
        <div className="sticky top-0 z-10 h-0">
          <button
            type="button"
            onClick={close}
            aria-label="Close the guide"
            className="absolute end-3 top-3 grid size-9 place-items-center rounded-full bg-card/85 text-muted-foreground backdrop-blur-sm outline-none transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf"
          >
            <X className="size-[18px]" aria-hidden="true" />
          </button>
        </div>

        <div className="px-6 pb-14 pt-5 sm:px-9">{children}</div>
      </SheetContent>
    </Sheet>
  );
}
