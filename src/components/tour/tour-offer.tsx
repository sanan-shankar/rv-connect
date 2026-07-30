"use client";

/* ------------------------------------------------------------------ *
 *  <TourOffer> — the small "want a tour?" card shown on first `/feed`
 *  arrival (walkthrough spec sec 3-4). A lighter sibling of tour-panel:
 *  no dots, no Back/Next, just the hoopoe flying in, a wave, and two
 *  buttons. Self-contained: it owns its own hoopoe and its own entrance
 *  choreography, and gates its own visibility on the one-hoopoe rule
 *  (retrying shortly if another bird is already up), so tour-provider.tsx
 *  only has to decide WHETHER to mount it, never how it behaves.
 * ------------------------------------------------------------------ */

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { SPRINGS } from "@/components/common/motion";
import { Hoopoe } from "@/components/mascot/hoopoe";
import { useHoopoe } from "@/components/mascot/use-hoopoe";
import { anotherHoopoeOnScreen } from "@/components/mascot/moments/one-hoopoe-guard";
import { TOUR_OFFER } from "./tour-steps";

// Same retry cadence as sidebar-hoopoe.tsx's BLOCKED_RETRY_MS: the visitor
// hasn't done anything new, just wait for whatever else owns the bird.
const BLOCKED_RETRY_MS = 4_000;

export function TourOffer({ onStart, onMaybeLater }: { onStart: () => void; onMaybeLater: () => void }) {
  const h = useHoopoe();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    function tryShow() {
      if (cancelled) return;
      if (anotherHoopoeOnScreen()) {
        timer = setTimeout(tryShow, BLOCKED_RETRY_MS);
        return;
      }
      setVisible(true);
    }
    tryShow();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[65] flex justify-center px-3 pb-[max(12px,env(safe-area-inset-bottom))] sm:bottom-6 sm:px-4"
      role="dialog"
      aria-label="Take a tour?"
    >
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={SPRINGS.gentle}
        className="pointer-events-auto card-elevated relative w-full max-w-[400px] rounded-t-[20px] border border-border bg-[color:var(--color-paper)] px-[var(--space-l)] pb-[var(--space-m)] pt-14 sm:rounded-[var(--radius)]"
      >
        <div className="absolute left-1/2 top-3 -translate-x-1/2 -translate-y-full" style={{ width: 84 }}>
          <Hoopoe
            // h.ref is the ref OBJECT returned by useHoopoe, handed straight to
            // the child. Nothing reads .current here; the rule cannot see
            // through the hook's return type.
            // eslint-disable-next-line react-hooks/refs
            ref={h.ref}
            size={84}
            idle={false}
            onReady={(api) => {
              void (async () => {
                await api.flyIn("top");
                await api.wave();
                await api.express("curious");
              })();
            }}
          />
        </div>

        <h2 className="font-heading text-xl font-bold tracking-[-0.02em] text-foreground">{TOUR_OFFER.title}</h2>
        <div className="mt-[var(--space-xs)] space-y-[var(--space-xs)]">
          {TOUR_OFFER.body.map((p, i) => (
            <p key={i} className="text-[14.5px] leading-[1.65] text-foreground">
              {p}
            </p>
          ))}
        </div>

        <div className="mt-[var(--space-m)] flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onMaybeLater}
            className="flex h-11 items-center rounded-full px-4 text-[14px] font-medium text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 active:opacity-70"
          >
            Maybe later
          </button>
          <Button variant="primary" size="lg" className="min-h-11" onClick={onStart}>
            Show me around
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
