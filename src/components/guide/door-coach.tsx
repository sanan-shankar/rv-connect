"use client";

/* ------------------------------------------------------------------ *
 *  <DoorCoach> — when the first-run tour closes, a bubble under the
 *  page's own title for a few seconds: this is the way back.
 *
 *  The owner's worry from the start was that nobody would know the
 *  guide can be opened again ("make it clear that they can double tap
 *  on the title of any page"), and his note on the tour's first draft
 *  asked for a better way to say it. Telling someone about a gesture on
 *  something they cannot see yet is the weak way; pointing at the thing,
 *  once, the moment the tour has put them back on the page, is the
 *  strong one. The welcome page and the last page still say it in words.
 *
 *  It asks nothing and blocks nothing: it goes after six seconds, or at
 *  the first press, key, scroll or resize, whichever is first. A page
 *  with no title door (the tour ended by following a link somewhere
 *  that has none) gets no bubble.
 * ------------------------------------------------------------------ */

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { m } from "motion/react";
import { EASE_OUT_SMOOTH } from "@/components/common/motion";
import { useTouch } from "./tap";

const SHOWN_MS = 6000;

/** The title door on screen: a guide link that is laid out and in view. */
function findDoor(): DOMRect | null {
  for (const el of document.querySelectorAll<HTMLElement>('a[href^="/guide/"]')) {
    // The first line box, not the bounding box: the door is an inline link
    // around a title that can wrap, and the bubble points at its start.
    const line = el.getClientRects()[0];
    if (line && line.width > 0 && line.bottom > 0 && line.top < window.innerHeight) return line;
  }
  return null;
}

export function DoorCoach({ onDone }: { onDone: () => void }) {
  const touch = useTouch();
  /* Measured once, as it first renders: this component only ever renders in
     the browser (guide-layer loads it with ssr: false), after the sheet has
     gone, so the title is laid out and where it will stay. 12px under the
     title, and kept 16px inside the screen's left edge. */
  const [at] = useState(() => {
    const door = findDoor();
    return door ? { left: Math.max(16, door.left), top: door.bottom + 12 } : null;
  });
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (!at) {
      onDone();
      return;
    }
    const leave = () => setLeaving(true);
    const timer = window.setTimeout(leave, SHOWN_MS);
    const events = ["pointerdown", "keydown", "resize"] as const;
    for (const type of events) window.addEventListener(type, leave, { once: true });
    window.addEventListener("scroll", leave, { once: true, capture: true, passive: true });
    return () => {
      window.clearTimeout(timer);
      for (const type of events) window.removeEventListener(type, leave);
      window.removeEventListener("scroll", leave, { capture: true });
    };
  }, [at, onDone]);

  if (!at) return null;
  return createPortal(
    <m.div
      role="status"
      className="pointer-events-none fixed z-40 max-w-[calc(100vw-2rem)] rounded-lg bg-canopy px-3.5 py-2.5 text-sm font-medium leading-snug text-white shadow-lg"
      style={at}
      initial={{ opacity: 0, y: -4 }}
      animate={
        leaving
          ? { opacity: 0, y: -4, transition: { duration: 0.18, ease: "easeOut" } }
          : { opacity: 1, y: 0, transition: { duration: 0.28, ease: EASE_OUT_SMOOTH } }
      }
      onAnimationComplete={() => {
        if (leaving) onDone();
      }}
    >
      {/* The point, aimed up at the title's first letters. */}
      <span aria-hidden className="absolute -top-1 left-4 size-2.5 rotate-45 rounded-[2px] bg-canopy" />
      {touch ? "Tap the title twice to see this again" : "Click the title to see this again"}
    </m.div>,
    document.body,
  );
}
