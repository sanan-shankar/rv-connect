"use client";

/* The two cost visuals on /support.

   CostBar is the colorful, animated breakdown of the recurring monthly bill.
   This replaces what used to be a stark, ledger-style table -- the owner liked
   the color, hated the seriousness, so the color visual leads and the numbers
   ride along with it. The domain is billed monthly (₹250) like everything else,
   so all three costs sit inside the one bar, which also keeps all three brand
   colours represented.

   BuildFundBar is the fundraiser-style bar underneath it, tracking how much of
   the one-time cost of designing and building the site has been recovered.

   transform/opacity only. Rupees throughout, no vendor names. */

import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { IndianRupee } from "lucide-react";
import { SPRINGS, useMotionGovernor } from "@/components/common/motion";

const SEGMENTS = [
  { label: "Hosting", value: 1950, color: "var(--color-canopy)" },
  { label: "Photos", value: 90, color: "var(--color-sky)" },
  { label: "Domain", value: 250, color: "var(--color-cinnamon)" },
];
const MONTHLY_TOTAL = SEGMENTS.reduce((sum, s) => sum + s.value, 0);

/* The one-time cost of designing and building the site, and how much of it has
   come back so far. Nothing tracks contributions automatically (there is no
   payment processor, just UPI), so RECOVERED is a figure the owner edits by
   hand as money actually arrives. */
const BUILD_COST = 400000;
const BUILD_RECOVERED = 0;

/* Counts a figure up from 0 the first time the card scrolls into view, paired
   with the bar fill so the number and the bar land together. A rAF ease-out
   cubic over ~950ms, seeded from the first frame timestamp (not a render-scope
   clock). Plays regardless of the OS reduced-motion setting; only a hidden tab
   pauses the in-flight count (battery courtesy), resuming from where it left
   off rather than jumping. */
function useCountUpOnView(target: number) {
  const ref = useRef<HTMLDivElement>(null);
  const raf = useRef<number | null>(null);
  const { paused } = useMotionGovernor();
  const pausedRef = useRef(paused);
  pausedRef.current = paused;
  const [shown, setShown] = useState(false);
  const [value, setValue] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
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
        setValue(Math.round(target * e));
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
  }, [target]);

  return { ref, shown, value };
}

export function CostBar() {
  const { ref, shown, value } = useCountUpOnView(MONTHLY_TOTAL);

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
          {value.toLocaleString("en-IN")}
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
      </div>
    </div>
  );
}

export function BuildFundBar() {
  const { ref, shown, value } = useCountUpOnView(BUILD_RECOVERED);
  const pct = Math.min(100, (BUILD_RECOVERED / BUILD_COST) * 100);

  return (
    <div
      ref={ref}
      className="card-elevated mt-[var(--space-m)] rounded-[var(--radius-lg)] border border-border bg-card p-[var(--space-l)]"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-[var(--space-m)] gap-y-[var(--space-xxs)]">
        <p className="font-heading text-base font-bold text-foreground">
          Recovering what it cost to build
        </p>
        <p className="inline-flex items-center gap-0.5 text-lg font-semibold tabular-nums text-canopy">
          <IndianRupee className="h-4 w-4" strokeWidth={2.5} aria-hidden />
          {value.toLocaleString("en-IN")}
          <span className="ml-1 text-sm font-medium text-muted-foreground">
            of ₹{BUILD_COST.toLocaleString("en-IN")}
          </span>
        </p>
      </div>

      <div
        className="mt-[var(--space-m)] h-5 w-full overflow-hidden rounded-full bg-mist p-1"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={BUILD_COST}
        aria-valuenow={BUILD_RECOVERED}
        aria-label="Progress towards recovering the one-time cost of building the site"
      >
        <motion.div
          className="h-full origin-left rounded-full bg-leaf"
          initial={{ scaleX: 0 }}
          animate={shown ? { scaleX: pct / 100 } : { scaleX: 0 }}
          transition={SPRINGS.gentle}
          style={{ width: "100%" }}
        />
      </div>

      <p className="mt-[var(--space-m)] text-sm leading-relaxed text-muted-foreground">
        This one is a goal, not an expectation. It is the one-time cost of
        designing and building the site, shown here simply because it is the
        honest number. Nothing about the site changes if it never fills up.
      </p>
    </div>
  );
}
