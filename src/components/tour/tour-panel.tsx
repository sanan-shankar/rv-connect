"use client";

/* ------------------------------------------------------------------ *
 *  <TourPanel> — the docked card (bottom sheet on mobile) that carries
 *  the tour from stop to stop (walkthrough spec sec 3, 8, 9). Persistent:
 *  mounted for the whole "running" phase, its CONTENTS cross-fade
 *  between stops, the card itself never unmounts. Owns the `useHoopoe`
 *  ref and hands the controller (plus its own perch point) up to
 *  tour-provider.tsx via `registerApi`, which drives every flight/point
 *  beat from outside (the provider is the one thing that knows about
 *  navigation + the anchor registry).
 * ------------------------------------------------------------------ */

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SPRINGS } from "@/components/common/motion";
import { Hoopoe } from "@/components/mascot/hoopoe";
import { useHoopoe, type UseHoopoe } from "@/components/mascot/use-hoopoe";
import { cn } from "@/lib/utils";
import { TOUR_FINISH, type TourStop } from "./tour-steps";

export interface TourPanelApi {
  hoopoe: UseHoopoe;
  /** The live client-space point the hoopoe rests on, read fresh each call. */
  perchPoint(): { x: number; y: number };
  /** The card's current top edge in client space (read fresh each call), so the
   *  tour can keep a spotlighted target from scrolling underneath it. Falls back
   *  to the viewport height (i.e. "no reservation") if the card isn't mounted yet. */
  panelTop(): number;
}

export function TourPanel({
  registerApi,
  stop,
  index,
  total,
  onNext,
  onBack,
  onSkip,
  onFinish,
}: {
  registerApi: (api: TourPanelApi) => void;
  /** null means the Finish beat (one stop past the last real stop). */
  stop: TourStop | null;
  index: number;
  total: number;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
  onFinish: () => void;
}) {
  const h = useHoopoe();
  const perchRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [desktop, setDesktop] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia("(min-width: 640px)");
    setDesktop(mql.matches);
    const onChange = () => setDesktop(mql.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    registerApi({
      hoopoe: h,
      perchPoint: () => {
        const r = perchRef.current?.getBoundingClientRect();
        if (!r) return { x: window.innerWidth / 2, y: window.innerHeight - 160 };
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      },
      panelTop: () => cardRef.current?.getBoundingClientRect().top ?? window.innerHeight,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const size = desktop ? 116 : 84;
  const content = stop ?? { title: TOUR_FINISH.title, body: TOUR_FINISH.body, note: undefined };
  const contentKey = stop ? stop.id : "finish";

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[65] flex justify-center px-3 pb-[max(12px,env(safe-area-inset-bottom))] sm:bottom-6 sm:px-4"
      role="dialog"
      aria-label="Product tour"
    >
      <motion.div
        ref={cardRef}
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={SPRINGS.gentle}
        className="pointer-events-auto card-elevated relative w-full max-w-[440px] rounded-t-[20px] border border-border bg-[color:var(--color-paper)] pt-14 sm:rounded-[var(--radius)]"
      >
        {/* The hoopoe perches straddling the card's top edge. */}
        <div
          ref={perchRef}
          aria-hidden
          className="absolute left-1/2 -translate-x-1/2"
          style={{ top: -(size * 152) / 120 + 26, width: size }}
        >
          <Hoopoe ref={h.ref} size={size} idle={false} />
        </div>

        <div className="flex max-h-[62vh] flex-col">
          {/* Header: progress dots (stops only) + Skip. */}
          <div className="flex shrink-0 items-center justify-between gap-3 px-[var(--space-l)] pb-[var(--space-s)]">
            {stop ? (
              <div className="flex items-center gap-[var(--space-xxs)]" role="group" aria-label={`Stop ${index + 1} of ${total}`}>
                {Array.from({ length: total }).map((_, i) => (
                  <span
                    key={i}
                    className={cn(
                      "h-2 rounded-full",
                      i === index && "w-6 bg-canopy",
                      i < index && "w-2 bg-canopy/45",
                      i > index && "w-2 bg-border"
                    )}
                  />
                ))}
              </div>
            ) : (
              <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-leaf">Tour complete</span>
            )}
            {stop && (
              <button
                type="button"
                onClick={onSkip}
                // Same ghost-pill pair as the offer card's "Maybe later".
                className="flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[13px] font-medium text-muted-foreground state-layer hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 active:opacity-70"
              >
                Skip
                <X className="h-3.5 w-3.5" aria-hidden />
              </button>
            )}
          </div>

          {/* Body: cross-fades between stops, scrolls internally if tall. */}
          <div className="min-h-0 flex-1 overflow-y-auto px-[var(--space-l)] pb-[var(--space-m)]">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={contentKey}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.16 }}
              >
                <h2 className="font-heading text-xl font-bold tracking-[-0.02em] text-foreground">
                  {content.title}
                </h2>
                <div className="mt-[var(--space-xs)] space-y-[var(--space-xs)]">
                  {content.body.map((p, i) => (
                    <p key={i} className="text-[14.5px] leading-[1.65] text-foreground">
                      {p}
                    </p>
                  ))}
                </div>
                {"note" in content && content.note && (
                  <div className="mt-[var(--space-s)] rounded-[12px] border-l-2 border-leaf/60 bg-leaf/[0.06] p-[var(--space-s)]">
                    {content.note.split("\n\n").map((p, i) => (
                      <p
                        key={i}
                        className={cn("text-[13.5px] leading-[1.65] text-muted-foreground", i > 0 && "mt-[var(--space-xs)]")}
                      >
                        {p}
                      </p>
                    ))}
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Footer: Back / Next, or the single Finish CTA. */}
          <div className="flex shrink-0 items-center justify-between gap-3 border-t border-border/70 px-[var(--space-l)] py-[var(--space-s)]">
            {stop ? (
              <>
                <Button
                  variant="ghost"
                  size="lg"
                  className="min-h-11"
                  onClick={onBack}
                  disabled={index === 0}
                >
                  <ChevronLeft className="h-4 w-4" aria-hidden />
                  Back
                </Button>
                <Button variant="primary" size="lg" className="min-h-11" onClick={onNext}>
                  Next
                  <ChevronRight className="h-4 w-4" aria-hidden />
                </Button>
              </>
            ) : (
              <Button variant="primary" size="lg" className="ml-auto min-h-11" onClick={onFinish}>
                Start looking around
              </Button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
