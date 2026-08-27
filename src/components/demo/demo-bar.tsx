"use client";

/* ------------------------------------------------------------------ *
 *  The one piece of chrome the demo adds to the product.
 *
 *  Design brief, in order of priority:
 *   1. Say what this is, so nobody wonders whether the people are real.
 *      A visitor who suspects they are reading someone's actual private
 *      feed stops enjoying it immediately. The pill carries that on its
 *      face ("You are in a demo") rather than needing to be opened.
 *   2. Get out of the way. This sits over a design the whole point of
 *      the exercise is to show off, so it is a small pill in a corner,
 *      not a banner across the top. It never covers content and never
 *      shifts layout.
 *   3. Look like it belongs. Canopy border, full pill, the project's own
 *      easing curves. A demo notice in default Tailwind grey would
 *      undercut the exact thing it is sitting on top of.
 *
 *  Both surfaces are SOLID --card, not the `.glass` utility, even though
 *  glass is the house treatment for floating chrome. Glass is 78% of
 *  --card, which reads beautifully on the sticky nav it was built for
 *  (pinned to an edge, blurring a page that scrolls under it) and badly
 *  here: this thing floats over arbitrary feed copy, and at 390px wide
 *  it landed squarely on a post with the sentence showing through it.
 *
 *  It is NOT a modal, and it does not open itself. An interstitial
 *  between a hiring manager and the work is the worst possible first
 *  frame.
 * ------------------------------------------------------------------ */

import { useEffect, useState } from "react";
import { AnimatePresence, m } from "motion/react";
import { Info, X } from "lucide-react";
import { EASE_SPRING, SPRINGS } from "@/components/common/motion";
import { markOnboardingSeen } from "@/lib/onboarding-local";
import { cn } from "@/lib/utils";

export function DemoBar({ userId }: { userId: string }) {
  // Starts closed, always. Nothing should stand between a visitor and the
  // design this deployment exists to show off, so the pill says its one
  // essential thing and waits to be asked for the rest.
  //
  // The hoopoe tour used to auto-offer itself here and was the demo's real
  // introduction; it was removed on 2026-08-27 along with the rest of the
  // tour. If the demo turns out to need an opening move again, this default
  // is the place to reconsider, not a new interstitial.
  const [expanded, setExpanded] = useState(false);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    // Kept after the tour's removal, because this flag is not only the
    // tour's. `hasSeenOnboarding` also gates the onboarding flow itself
    // (onboarding-flow.tsx), and the demo's persona arrives with a complete
    // account on a deployment where /onboarding is closed. Marking it seen
    // is what keeps a first-run flow from ambushing a visitor who has
    // nothing to fill in.
    markOnboardingSeen(userId);
  }, [userId]);

  function collapse() {
    setExpanded(false);
  }

  async function reset() {
    if (resetting) return;
    setResetting(true);
    try {
      await fetch("/api/demo/reset", { method: "POST" });
      // A hard reload rather than router.refresh(): the reset rewrites every
      // table the page is built from, and a full navigation is the only way
      // to be certain nothing stale survives in a client cache.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- the hard reload IS the point; see above.
      window.location.href = "/feed";
    } catch {
      setResetting(false);
    }
  }

  return (
    <div
      className={cn(
        // Above the mobile tab bar (AppShell reserves pb-16 for it), and clear
        // of the desktop content column's right edge.
        "pointer-events-none fixed right-4 bottom-20 z-50 flex justify-end md:right-6 md:bottom-6",
      )}
    >
      <AnimatePresence initial={false} mode="popLayout">
        {expanded ? (
          <m.div
            key="note"
            initial={{ opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.97 }}
            transition={{ ...SPRINGS.gentle }}
            className="pointer-events-auto max-w-[19rem] rounded-2xl border border-canopy/15 bg-card p-4 shadow-[0_1px_2px_rgba(35,92,73,0.08),0_8px_24px_-8px_rgba(35,92,73,0.28)]"
          >
            <div className="flex items-start gap-3">
              {/* Sky, not canopy: DESIGN-SYSTEM colour rule 4 retires the
                  bg-canopy/10 + text-canopy icon bubble. Sky is the approved
                  informational tint of the trio, and rule 4 asks the tints be
                  rotated so one screen never repeats one -- this card's border
                  and shadow are already canopy, so a cool pop is the reading
                  that separates the notice from its own frame. */}
              <span
                aria-hidden
                className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full border border-sky/35 bg-sky/[0.10] text-sky"
              >
                <Info className="size-4" />
              </span>
              <div className="min-w-0">
                <p className="font-serif text-[0.95rem] leading-snug font-semibold tracking-[-0.01em]">
                  This is a live demo
                </p>
                <p className="mt-1 text-[0.82rem] leading-[1.6] text-muted-foreground">
                  Everyone here is invented, and you are signed in as one of them.
                  Post, comment, love things, answer the Catch-up. Nothing you do
                  reaches a real person.
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={collapse}
                    className="rounded-full bg-canopy px-3.5 py-1.5 text-[0.8rem] font-medium text-white transition-transform duration-150 hover:scale-[1.03] focus-visible:ring-2 focus-visible:ring-canopy/50 focus-visible:ring-offset-2 focus-visible:outline-none active:scale-[0.97]"
                  >
                    Have a look around
                  </button>
                  <button
                    type="button"
                    onClick={reset}
                    disabled={resetting}
                    className="rounded-full px-3 py-1.5 text-[0.8rem] text-muted-foreground transition-transform duration-150 hover:scale-[1.03] hover:text-foreground focus-visible:ring-2 focus-visible:ring-canopy/40 focus-visible:outline-none active:scale-[0.97] disabled:opacity-60"
                  >
                    {resetting ? "Resetting" : "Reset"}
                  </button>
                </div>
              </div>
              <button
                type="button"
                onClick={collapse}
                aria-label="Hide this note"
                className="-mt-1 -mr-1 grid size-7 shrink-0 place-items-center rounded-full text-muted-foreground transition-transform duration-150 hover:scale-110 hover:text-foreground focus-visible:ring-2 focus-visible:ring-canopy/40 focus-visible:outline-none active:scale-95"
              >
                <X className="size-3.5" />
              </button>
            </div>
          </m.div>
        ) : (
          <m.button
            key="pill"
            type="button"
            onClick={() => setExpanded(true)}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.22, ease: EASE_SPRING }}
            className="pointer-events-auto flex items-center gap-2 rounded-full border border-canopy/15 bg-card py-2 pr-3.5 pl-3 text-[0.8rem] font-medium text-canopy shadow-[0_1px_2px_rgba(35,92,73,0.08),0_6px_18px_-8px_rgba(35,92,73,0.26)] transition-transform duration-150 hover:scale-[1.04] focus-visible:ring-2 focus-visible:ring-canopy/50 focus-visible:ring-offset-2 focus-visible:outline-none active:scale-[0.97]"
          >
            <span aria-hidden className="size-1.5 rounded-full bg-leaf" />
            You are in a demo
          </m.button>
        )}
      </AnimatePresence>
    </div>
  );
}
