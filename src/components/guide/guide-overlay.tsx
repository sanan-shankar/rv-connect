"use client";

/* ------------------------------------------------------------------ *
 *  <GuideOverlay> — the chapter, over the page you were on.
 *
 *  Built on ui/sheet, which is the edge-anchored variant of the one
 *  dialog material. The first version hand-rolled the whole thing and
 *  the protocol audit caught it: "dialogs are one material". It was
 *  also worse, because the primitive already owns the warm-ink scrim,
 *  the focus trap, escape, the aria wiring and the scroll lock, and a
 *  hand-rolled modal gets all five subtly wrong for free.
 *
 *  Not a narrow side sheet: `side="bottom"` with the reading column's
 *  own width. The chapter is made of things drawn to scale and a
 *  comparison table, and both stop being pictures at a side sheet's
 *  404px.
 *
 *  Open state IS the URL. Closing is router.back(), never a state
 *  flip, which is what makes the close control, the escape key, the
 *  browser's back button and the Android back gesture all do the same
 *  thing without any of them knowing about each other.
 * ------------------------------------------------------------------ */

import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";

export function GuideOverlay({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const router = useRouter();

  return (
    <Sheet open onOpenChange={(next) => { if (!next) router.back(); }}>
      <SheetContent
        side="bottom"
        /* The primitive's own close button sits absolutely in the corner, and
           the chapter's diagrams would scroll underneath it. The sticky strip
           below does the same job without ever overlapping a bar chart. */
        showCloseButton={false}
        className="mx-auto max-h-[calc(100dvh-1.75rem)] w-full max-w-3xl gap-0 overflow-hidden rounded-t-[1.75rem] bg-card p-0"
      >
        {/* The accessible name for the sheet. Visually the chapter's own <h1>
            says it, so this one is for screen readers only. */}
        <SheetTitle className="sr-only">{title}</SheetTitle>

        <div className="sticky top-0 z-10 flex justify-end bg-card px-3 pt-3">
          <button
            type="button"
            onClick={() => router.back()}
            aria-label="Close the guide"
            className="state-layer grid size-9 place-items-center rounded-full text-muted-foreground outline-none hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf"
          >
            <X className="size-[18px]" aria-hidden="true" />
          </button>
        </div>

        <div className="overflow-y-auto overscroll-contain px-6 pb-12 sm:px-9">{children}</div>
      </SheetContent>
    </Sheet>
  );
}
