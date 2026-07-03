"use client";

/* A small, honest "where the monthly bill goes" bar. Not a fundraiser and not a
   goal to fill toward (this page deliberately has neither). It just draws in the
   composition of the real recurring cost when it scrolls into view, so the
   breakdown above gets a calm visual summary. transform/opacity only. */

import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { SPRINGS, useMotionGovernor } from "@/components/common/motion";

const SEGMENTS = [
  { label: "Hosting", value: 600, color: "#1F8A4C" },
  { label: "Database", value: 550, color: "#3F7CA6" },
  { label: "Everything else", value: 300, color: "#C2622F" },
];
const TOTAL = SEGMENTS.reduce((sum, s) => sum + s.value, 0);

export function CostBar() {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);
  // The figure counts up from 0 to TOTAL paired with the bar fill, on the same
  // scroll-into-view trigger, so the count and the bar land together.
  const [amount, setAmount] = useState(0);
  const raf = useRef<number | null>(null);
  // Plays regardless of the OS reduced-motion setting; only a hidden tab
  // pauses the in-flight count (battery courtesy), resuming from where it
  // left off rather than jumping.
  const { paused } = useMotionGovernor();
  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Count the figure up on the same trigger as the bar: a rAF ease-out cubic
    // over ~950ms, seeded from the first frame timestamp (not a render-scope clock).
    function runCount() {
      if (raf.current) cancelAnimationFrame(raf.current);
      const dur = 950;
      let start: number | null = null;
      let elapsed = 0;
      let lastNow = 0;
      const tick = (now: number) => {
        if (start === null) {
          start = now;
          lastNow = now;
        }
        if (!pausedRef.current) {
          elapsed += now - lastNow;
        }
        lastNow = now;
        const t = Math.min(1, elapsed / dur);
        const e = 1 - Math.pow(1 - t, 3);
        setAmount(Math.round(TOTAL * e));
        if (t < 1) raf.current = requestAnimationFrame(tick);
      };
      raf.current = requestAnimationFrame(tick);
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            setShown(true);
            runCount();
            io.disconnect();
          }
        });
      },
      { threshold: 0.4 }
    );
    io.observe(el);
    return () => {
      io.disconnect();
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, []);

  return (
    <div ref={ref} className="mt-[var(--space-m)]">
      <div className="flex items-baseline justify-between gap-[var(--space-m)]">
        <p className="text-sm font-medium text-foreground">
          Where the monthly bill goes
          <span className="ml-[var(--space-xs)] text-sm font-semibold tabular-nums text-foreground">
            ${amount.toLocaleString()}
          </span>
        </p>
        <p className="text-xs text-muted-foreground">a rough split, not exact</p>
      </div>
      <div className="mt-[var(--space-s)] h-3 w-full overflow-hidden rounded-full bg-mist">
        <motion.div
          className="flex h-full w-full origin-left"
          initial={{ scaleX: 0 }}
          animate={shown ? { scaleX: 1 } : { scaleX: 0 }}
          transition={SPRINGS.gentle}
        >
          {SEGMENTS.map((s) => (
            <div
              key={s.label}
              style={{ width: `${(s.value / TOTAL) * 100}%`, background: s.color }}
              className="h-full"
            />
          ))}
        </motion.div>
      </div>
      <div className="mt-[var(--space-s)] flex flex-wrap gap-x-[var(--space-m)] gap-y-[var(--space-xxs)] text-xs text-muted-foreground">
        {SEGMENTS.map((s) => (
          <span key={s.label} className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full" style={{ background: s.color }} />
            {s.label}
          </span>
        ))}
      </div>
    </div>
  );
}
