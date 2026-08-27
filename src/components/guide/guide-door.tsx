"use client";

/* ------------------------------------------------------------------ *
 *  <GuideDoor> — the page title, doing a second job.
 *
 *  The brief was a control that a lost member can find and everybody
 *  else never sees. One control cannot be both, so the guide has two
 *  doors: the Guide row in the sidebar, which is the findable one, and
 *  this, which is the shortcut. A shortcut is allowed to be invisible;
 *  that is what makes it a shortcut. See docs/spec/guide.md section 4.
 *
 *  It adds no pixels to any page, because it adds nothing: the word
 *  already at the top of the page becomes the way in.
 *
 *  TWO BEHAVIOURS, ONE MARK.
 *
 *  With a mouse: nothing at rest, and the mark fades in on hover. The
 *  mark's space is reserved at rest, so the heading never moves (the
 *  owner's standing rule: hover never moves a control).
 *
 *  With a finger there is no hover, so the first tap reveals the mark
 *  and the second one goes (owner's idea, 2026-08-27). This is better
 *  than the permanent mark this file was going to carry: it keeps every
 *  page clean, it teaches what the heading does at the moment somebody
 *  pokes it, and it means a stray tap while scrolling costs a fade
 *  rather than a navigation.
 *
 *  Pointer type comes from the event, not from a media query, because
 *  a laptop with a touchscreen is both and the media query has to
 *  guess. Whichever device the person actually used is the one that
 *  decides.
 * ------------------------------------------------------------------ */

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

/** How long a revealed mark stays armed before it fades back out. */
const ARMED_MS = 4000;

export function GuideDoor({ area, children }: { area: string; children: React.ReactNode }) {
  const [armed, setArmed] = useState(false);
  const usedTouch = useRef(false);
  const ref = useRef<HTMLAnchorElement>(null);

  const disarm = useCallback(() => setArmed(false), []);

  /* An armed mark is a state nobody asked to keep. It goes on the next scroll,
     on a touch anywhere else, and on its own after a few seconds, so the page
     is never left with a stray question mark on it. */
  useEffect(() => {
    if (!armed) return;
    const timer = window.setTimeout(disarm, ARMED_MS);
    const away = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) disarm();
    };
    window.addEventListener("scroll", disarm, { passive: true });
    window.addEventListener("pointerdown", away, { passive: true });
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("scroll", disarm);
      window.removeEventListener("pointerdown", away);
    };
  }, [armed, disarm]);

  return (
    <Link
      ref={ref}
      href={`/guide/${area}`}
      /* The heading is the link, so it must not look like one until asked.
         No underline, no colour change, inherits the h1 entirely. */
      className={cn(
        "group inline-flex items-baseline rounded-lg text-inherit no-underline outline-none",
        /* A 30px line of type is a 30px finger target, which is under the 44px
           everyone agrees on. The padding buys the height and the equal
           negative margin gives it straight back to the layout, so the target
           grows and the heading does not move a pixel. */
        "py-[7px] -my-[7px]",
        "[-webkit-tap-highlight-color:transparent]",
        "focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-leaf"
      )}
      aria-label={armed ? undefined : `${typeof children === "string" ? children : "This page"}. Open the guide for this page.`}
      onPointerDown={(e) => {
        usedTouch.current = e.pointerType === "touch";
      }}
      onClick={(e) => {
        // A mouse has already seen the mark on hover, and the keyboard reports
        // no pointer type at all, so both go straight through.
        if (usedTouch.current && !armed) {
          e.preventDefault();
          setArmed(true);
        }
      }}
    >
      {children}
      {/* Zero width, overflowing on purpose.

          Reserving real space for this mark was the obvious way to stop the
          heading moving when it appears, and it was wrong: the extra width
          pushed "The Birds of the Valley" onto a second line at 390px and shoved
          the entire page down 30px. Caught by the visual suite, which is exactly
          the page nobody was looking at.

          A zero-width box that paints outside itself cannot change a line break,
          cannot change the heading's rect, and still puts the glyph after the
          last word. It only ever overhangs into the gap before the action row. */}
      <span
        aria-hidden="true"
        className={cn(
          "inline-block w-0 translate-x-[0.3em] select-none overflow-visible",
          "font-body text-[0.58em] font-semibold leading-none text-muted-foreground",
          "opacity-0 transition-opacity duration-200 ease-out motion-reduce:transition-none",
          "group-hover:opacity-100 group-focus-visible:opacity-100",
          armed && "opacity-100"
        )}
      >
        ?
      </span>
    </Link>
  );
}
