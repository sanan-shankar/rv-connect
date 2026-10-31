"use client";

/* ------------------------------------------------------------------ *
 *  The guide's window, as a shape anything can wear.
 *
 *  On a laptop a window that floats clear of every edge, 1120px wide and
 *  at most 54rem tall, with a picture filling its left 44% (BottomSheet's
 *  `media`) and the writing in a column beside it; on a phone the sheet
 *  that rises from the bottom, nearly the full height of the screen.
 *  docs/spec/guide.md 2.3a has the owner's reasons.
 *
 *  Two things wear it: the guide (guide-overlay.tsx) and the announcement
 *  window over the Feed (components/announcement), which the owner asked
 *  to be the same box: "picture on one side, text on the other side. The
 *  box is a similar size [...] it's a nice way to standardize"
 *  (2026-10-29). So the measurements live here once, and the two cannot
 *  drift apart.
 * ------------------------------------------------------------------ */

import { useSyncExternalStore } from "react";

/** The panel. One fixed height, not sized to content, so every page opens at
 *  the same height (owner: "the panels all start at different heights"). On
 *  a laptop it rises 16px and fades in rather than travelling up from below
 *  the screen, and its picture runs under the rounded corners. */
export const GUIDE_WINDOW = [
  "h-[calc(100svh-2rem)] max-h-none",
  "lg:inset-y-0 lg:my-auto lg:h-[min(54rem,calc(100svh-4rem))] lg:max-w-[1120px] lg:overflow-hidden lg:rounded-2xl",
  "lg:data-starting-style:translate-y-4 lg:data-starting-style:opacity-0 lg:data-ending-style:translate-y-4 lg:data-ending-style:opacity-0",
  "overflow-hidden",
].join(" ");

/** A page's margins, not the 16px every list sheet uses ("The margins are way
 *  too tight"): 24px on a phone, 48px on a laptop. The X's glyph is 20px in a
 *  32px box, so the header stands 6px short of the margin on the right for
 *  the glyph's edge to meet the writing's. */
export const GUIDE_HEADER = "pt-5 pr-[18px] pb-4 pl-6 lg:pt-10 lg:pr-[42px] lg:pl-12";
export const GUIDE_FOOTER = "px-6 lg:px-12";

/** Where the sheet turns into picture-and-column: BottomSheet's own lg. */
const WIDE = "(min-width: 1024px)";
function subscribeWide(onChange: () => void) {
  const query = window.matchMedia(WIDE);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}
/** For what is heavy to keep in both layouts (a photograph to fetch ahead, a
 *  field of birds). Which layout SHOWS is CSS's decision alone: a window
 *  dragged across the breakpoint changes CSS in the same frame, while this
 *  answers a frame or more later. */
export function useWide() {
  return useSyncExternalStore(
    subscribeWide,
    () => window.matchMedia(WIDE).matches,
    () => false,
  );
}
