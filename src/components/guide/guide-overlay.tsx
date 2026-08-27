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
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";

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
  const router = useRouter();
  const [open, setOpen] = useState(false);

  // Shut on the first paint, open on the next frame. Without this there is no
  // enter transition at all: see the note at the top.
  useEffect(() => {
    const frame = requestAnimationFrame(() => setOpen(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  /* Close, then navigate. router.back() is still what actually closes it, so
     the URL remains the single source of truth and the browser's own back
     button needs no special case: it simply unmounts this, which is the same
     end state by a different road. */
  const close = useCallback(() => {
    setOpen(false);
    window.setTimeout(() => router.back(), SHEET_MS);
  }, [router]);

  return (
    <Sheet open={open} onOpenChange={(next) => { if (!next) close(); }}>
      <SheetContent
        side="bottom"
        /* The primitive's close button sits absolutely in the corner and the
           chapter's diagrams would scroll under it. The sticky strip below
           does the same job without ever crossing a bar chart. */
        showCloseButton={false}
        /* data-[side=bottom]: matters. ui/sheet sets `data-[side=bottom]:h-auto`,
           and a plain `h-[86dvh]` loses to it every time: tailwind-merge keeps
           both because they are different variant groups, and the attribute
           selector then wins on specificity. Measured before this: the Catch-ups
           panel opened 1406px tall inside a 900px window, anchored to the bottom,
           so its top 500px were simply off the screen. */
        className="mx-auto flex w-full max-w-3xl flex-col gap-0 overflow-hidden rounded-t-[1.75rem] bg-card p-0 data-[side=bottom]:h-[86dvh]"
      >
        {/* The sheet's accessible name. The chapter's own <h1> says it on
            screen, so this one is for screen readers only. */}
        <SheetTitle className="sr-only">{title}</SheetTitle>

        <div className="sticky top-0 z-10 flex shrink-0 justify-end bg-card px-3 pt-3">
          <button
            type="button"
            onClick={close}
            aria-label="Close the guide"
            className="state-layer grid size-9 place-items-center rounded-full text-muted-foreground outline-none hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf"
          >
            <X className="size-[18px]" aria-hidden="true" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 pb-12 sm:px-9">
          {children}
        </div>
      </SheetContent>
    </Sheet>
  );
}
