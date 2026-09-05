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
 *  NO MARK. There was a small `?` here that faded in on hover and, on a
 *  phone, on the first tap. The owner took it off every title: "ditch the
 *  question marks when you click on page titles. on desktop I can say just
 *  click the title for the guide. and on phone let it work the same just
 *  remove the question mark" (2026-09-02). Telling people the title is the
 *  door is a sentence he can say once; a glyph on every heading is a mark
 *  every reader carries forever.
 *
 *  THE TWO-STEP ON TOUCH SURVIVES IT. With a finger there is no hover, so
 *  a single tap on a 30px heading somebody is scrolling past would open the
 *  guide by accident. The first tap still only arms; the second one goes.
 *  Nothing is drawn either way -- the arming is now invisible, which is
 *  what "let it work the same" asks for.
 *
 *  Pointer type comes from the event, not from a media query, because
 *  a laptop with a touchscreen is both and the media query has to
 *  guess. Whichever device the person actually used is the one that
 *  decides.
 * ------------------------------------------------------------------ */

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { openGuide } from "@/lib/guide-open";

/** How long a first tap stays armed before the two-step resets. */
const ARMED_MS = 4000;

export function GuideDoor({ area, children }: { area: string; children: React.ReactNode }) {
  const [armed, setArmed] = useState(false);
  const usedTouch = useRef(false);
  const ref = useRef<HTMLAnchorElement>(null);

  const disarm = useCallback(() => setArmed(false), []);

  /* Being armed is a state nobody asked to keep, and an invisible one is
     worth expiring MORE carefully than a visible one was: nothing on screen
     says a second tap will navigate. It resets on the next scroll, on a touch
     anywhere else, and on its own after a few seconds, so a tap now and a tap
     a minute later are two first taps. */
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
    <a
      ref={ref}
      /* A real href, so it stays a real link: middle-click, "copy link address"
         and open-in-new-tab all land on the standalone chapter. The press
         itself does not navigate, because a navigation cost 404-444ms before
         the sheet even existed to animate. See src/lib/guide-open.ts. */
      href={`/guide/${area}`}
      className={cn(
        /* `inline`, not `inline-flex` or `inline-block`: the title wraps on a
           phone (every "Collection" at 390px) and only plain inline flow lets
           a wrapped heading keep its own line boxes. A block-level box here
           would make the whole title one unbreakable rect. */
        "inline rounded-lg text-inherit no-underline outline-none",
        /* A 30px line of type is a 30px finger target, under the 44px everyone
           agrees on. The padding buys the height and the equal negative margin
           gives it straight back to the layout, so the target grows and the
           heading does not move a pixel. (Margin is a no-op on an inline
           element -- kept anyway so this reads the same if display ever
           changes back.) */
        "py-[7px] -my-[7px]",
        "[-webkit-tap-highlight-color:transparent]",
        "focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-leaf"
      )}
      /* Warm the sheet before the press. The overlay and the chapters are one
         lazy chunk (see guide-layer.tsx), and a hover or a tab-stop is as much
         intent as this needs: by the time a click lands the module is in
         cache and the entrance animates from its first frame. Idempotent --
         the second call gets the same resolved promise. A finger gets it too:
         `pointerenter` fires on touch just before `pointerdown`, and the
         two-step below means a tap has to land twice anyway. */
      onPointerEnter={() => void import("./guide-body")}
      onFocus={() => void import("./guide-body")}
      onPointerDown={(e) => {
        usedTouch.current = e.pointerType === "touch";
      }}
      onClick={(e) => {
        /* Modified clicks belong to the browser: cmd, ctrl, shift and alt all
           mean "open this somewhere else", and taking those over is rude. */
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        e.preventDefault();
        /* A mouse and a keyboard open on the first press: a click is aimed
           and a keypress is deliberate. A finger gets the two-step, because a
           tap on a heading is as often a scroll that started badly: this press
           only arms, the next one opens. */
        if (usedTouch.current && !armed) {
          setArmed(true);
          return;
        }
        openGuide(area);
      }}
    >
      {children}
    </a>
  );
}
