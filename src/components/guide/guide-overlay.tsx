"use client";

/* ------------------------------------------------------------------ *
 *  <GuideOverlay> — the chapter, floating over the page you were on.
 *
 *  Not a narrow sheet. The chapter is made of things drawn to scale and
 *  a comparison table, and both stop being pictures at 404px, so this
 *  gets the full reading column and the page dims behind it.
 *
 *  Closing is router.back(), never a state flip, because the URL is the
 *  open/closed state. That is what makes the browser's own back button,
 *  the Android back gesture and the close control all do the same thing
 *  without any of them knowing about each other.
 *
 *  The scroll lock is the fiddly part and it is the whole difference
 *  between this feeling native and feeling like a web page. See the
 *  comment on it below.
 * ------------------------------------------------------------------ */

import { useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { m } from "motion/react";
import { X } from "lucide-react";
import { EASE_OUT_SMOOTH } from "@/components/common/motion";
import { takeGuideReturn } from "@/lib/guide-scroll";

export function GuideOverlay({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const panel = useRef<HTMLDivElement>(null);
  const close = useCallback(() => router.back(), [router]);

  /* Lock the page behind, and give back the exact same pixel on the way out.
     `overflow: hidden` alone is not enough: iOS Safari happily scrolls the
     body underneath anyway, and the moment the overlay closes the reader is
     at the top of a feed they were forty posts into. Pinning the body with a
     negative top and restoring scrollTo on teardown is the one approach that
     survives both.

     The padding compensates for the scrollbar the lock removes on desktop,
     which would otherwise shove the whole page 15px sideways as the overlay
     opens: a visible flinch on exactly the frame that should be calm. */
  useEffect(() => {
    /* Not window.scrollY: by the time this runs the navigation has already
       happened and the router may have moved the page under us. The door
       recorded the real number on the way out. See src/lib/guide-scroll.ts. */
    const y = takeGuideReturn();
    const { body } = document;
    const gap = window.innerWidth - document.documentElement.clientWidth;
    const before = {
      position: body.style.position,
      top: body.style.top,
      width: body.style.width,
      overflow: body.style.overflow,
      paddingRight: body.style.paddingRight,
    };
    body.style.position = "fixed";
    body.style.top = `-${y}px`;
    body.style.width = "100%";
    body.style.overflow = "hidden";
    if (gap > 0) body.style.paddingRight = `${gap}px`;
    return () => {
      Object.assign(body.style, before);
      window.scrollTo(0, y);
    };
  }, []);

  /* Escape closes, and focus starts inside so a keyboard reader is not left
     tabbing through the dimmed page behind. */
  useEffect(() => {
    panel.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close]);

  return (
    /* motion, not Tailwind animation utilities: this project has no
       tailwindcss-animate plugin, so `animate-in` and friends are inert class
       names that quietly do nothing. Only transform and opacity animate, which
       is the house rule and also the only pair that stays on the compositor. */
    <div className="fixed inset-0 z-50 flex justify-center" role="dialog" aria-modal="true" aria-label={title}>
      <m.button
        type="button"
        aria-label="Close the guide"
        onClick={close}
        className="absolute inset-0 cursor-default bg-foreground/35"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2, ease: "linear" }}
      />
      <m.div
        ref={panel}
        tabIndex={-1}
        className="relative mt-7 flex w-full max-w-3xl flex-col overflow-hidden rounded-t-[1.75rem] border border-border bg-background shadow-[0_-14px_50px_-22px_rgba(20,26,20,0.6)] outline-none sm:mt-10"
        initial={{ opacity: 0, transform: "translateY(18px)" }}
        animate={{ opacity: 1, transform: "translateY(0px)" }}
        transition={{ duration: 0.32, ease: EASE_OUT_SMOOTH }}
      >
        {/* Sticky rather than floating: the chapter's diagrams scroll past
            here, and a close button hovering over a bar chart looks broken. */}
        <div className="sticky top-0 z-10 flex justify-end bg-background px-3 pt-3">
          <button
            type="button"
            onClick={close}
            aria-label="Close the guide"
            className="state-layer grid size-9 place-items-center rounded-full text-muted-foreground outline-none hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf"
          >
            <X className="size-[18px]" aria-hidden="true" />
          </button>
        </div>
        <div className="overflow-y-auto overscroll-contain px-6 pb-12 sm:px-9">{children}</div>
      </m.div>
    </div>
  );
}
