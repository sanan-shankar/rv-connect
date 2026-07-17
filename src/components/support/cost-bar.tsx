"use client";

/* The fun centerpiece of the costs section: a colorful, animated bar showing
   where the monthly bill goes, with the yearly domain renewal called out
   alongside it as its own small pill. This replaces what used to be a stark,
   ledger-style table -- the owner liked the color, hated the seriousness, so
   the color visual now leads and the numbers ride along with it.
   transform/opacity only. Rupees throughout, no vendor names. */

import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { IndianRupee } from "lucide-react";
import { SPRINGS, useMotionGovernor } from "@/components/common/motion";

const SEGMENTS = [
  { label: "Hosting", value: 1700, color: "var(--color-canopy)" },
  { label: "Photos", value: 90, color: "var(--color-sky)" },
];
const MONTHLY_TOTAL = SEGMENTS.reduce((sum, s) => sum + s.value, 0);

export function CostBar() {
  const ref = useRef<HTMLDivElement>(null);
  const raf = useRef<number | null>(null);
  // Plays regardless of the OS reduced-motion setting; only a hidden tab
  // pauses the in-flight count (battery courtesy), resuming from where it
  // left off rather than jumping.
  const { paused } = useMotionGovernor();
  const pausedRef = useRef(paused);
  pausedRef.current = paused;
  const [shown, setShown] = useState(false);
  // The figure counts up from 0 to MONTHLY_TOTAL paired with the bar fill, on
  // the same scroll-into-view trigger, so the count and the bar land together.
  const [amount, setAmount] = useState(0);

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
        setAmount(Math.round(MONTHLY_TOTAL * e));
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
    <div
      ref={ref}
      className="card-elevated mt-[var(--space-m)] rounded-[var(--radius-lg)] border border-border bg-card p-[var(--space-l)]"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-[var(--space-m)] gap-y-[var(--space-xxs)]">
        <p className="font-heading text-base font-bold text-foreground">
          Where the monthly bill goes
        </p>
        <p className="inline-flex items-center gap-0.5 text-lg font-semibold tabular-nums text-canopy">
          <IndianRupee className="h-4 w-4" strokeWidth={2.5} aria-hidden />
          {amount.toLocaleString("en-IN")}
          <span className="ml-1 text-sm font-medium text-muted-foreground">/month</span>
        </p>
      </div>

      <div className="mt-[var(--space-m)] flex h-5 w-full gap-1 overflow-hidden rounded-full bg-mist p-1">
        <motion.div
          className="flex h-full w-full origin-left gap-1"
          initial={{ scaleX: 0 }}
          animate={shown ? { scaleX: 1 } : { scaleX: 0 }}
          transition={SPRINGS.gentle}
        >
          {SEGMENTS.map((s) => (
            <div
              key={s.label}
              style={{ width: `${(s.value / MONTHLY_TOTAL) * 100}%`, background: s.color }}
              className="h-full rounded-full"
            />
          ))}
        </motion.div>
      </div>

      <div className="mt-[var(--space-m)] flex flex-wrap gap-[var(--space-xs)]">
        {SEGMENTS.map((s) => (
          <span
            key={s.label}
            className="inline-flex items-center gap-[var(--space-xxs)] rounded-full border border-border bg-mist px-[var(--space-s)] py-[var(--space-xxs)] text-xs font-medium text-foreground"
          >
            <span className="inline-block h-2 w-2 rounded-full" style={{ background: s.color }} />
            {s.label}
            <span className="text-muted-foreground">
              {s.value < 100 ? `under ₹100` : `~₹${s.value.toLocaleString("en-IN")}`}
            </span>
          </span>
        ))}
        {/* Domain renews yearly, not monthly, so it rides alongside the bar
            rather than inside it, in cinnamon to keep all three brand colors
            represented in the one visual. */}
        <span className="inline-flex items-center gap-[var(--space-xxs)] rounded-full border border-cinnamon/30 bg-cinnamon/10 px-[var(--space-s)] py-[var(--space-xxs)] text-xs font-medium text-cinnamon">
          <span className="inline-block h-2 w-2 rounded-full bg-cinnamon" />
          Domain
          <span className="opacity-80">~₹2,500 / year</span>
        </span>
      </div>
    </div>
  );
}
