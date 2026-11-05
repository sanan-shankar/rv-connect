"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";

/**
 * The feed rail's pinned box: it pins by its BOTTOM edge whenever it is
 * taller than the window, and by its top edge only when it fits.
 *
 * It used to be `sticky top-7`, which pins the top edge no matter what. That
 * is right for a rail shorter than the window and wrong for a taller one: the
 * box stops moving while its foot is still below the fold, and since it is
 * deliberately not a scroll container, whatever sits down there can never be
 * reached until the feed itself runs out. Measured 2026-11-05 with three
 * modules: the pinned rail ran from 28px to 910px at every window height, so
 * "This week in Letters" lost 10px at 1440x900, 110px at 1440x800 and all of
 * itself at 1280x720 (owner, the same day: "I can't access it").
 *
 * The fix is the offset, not the scrolling. `top` is the smaller of the
 * page's 28px margin and "window minus rail minus 28px". A rail that fits
 * gets 28px, exactly as before. A taller one gets a negative top, so it
 * travels up with the feed until its last card sits 28px off the bottom of
 * the window, and stops there. CSS cannot know the box's own height, so this
 * measures it, and keeps measuring: the Collection's photograph and a module
 * that appears or hides change it after the first paint. Until then the
 * fallback height of 0 gives the old 28px top, so the server render and a
 * page without JavaScript behave as they always did.
 *
 * 1.75rem is the shell's own sm:p-7 padding, so the gap matches the page's
 * margin at either end.
 */
export function StickyRail({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const box = ref.current;
    if (!box) return;
    const measure = () => box.style.setProperty("--rail-h", `${box.offsetHeight}px`);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(box);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      data-feed-rail
      className="sticky space-y-4"
      style={{ top: "min(1.75rem, calc(100dvh - var(--rail-h, 0px) - 1.75rem))" }}
    >
      {children}
    </div>
  );
}
