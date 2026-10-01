"use client";

/* The costs card on /support: the layout the owner kept.
 *
 * This is the shipped CostBar's shape, restored after a redesign detour he
 * rejected ("that was at least an efficient design"): the card leads with
 * "Where the monthly bill goes" and the counted-up total on one line, then
 * the colourful segmented bar, then the three costs as pill chips. The only
 * copy that stayed cut is the filler he struck ("a few people chipping
 * in..."); the only upgrade on the pills is exact rupees instead of the old
 * "~₹1,950" and "under ₹100" hedges.
 *
 * The second section keeps its exact old title, "Recovering what it cost to
 * build" (a longer rewrite was rejected), the same 20px bar recipe as the
 * monthly one above so the two read as siblings, and no figures at either
 * end: the build cost is published nowhere on this page. Its fill is LIVE,
 * summed server-side from paid contributions on every view, and a successful
 * payment refreshes the page, so the bar advances the moment real money
 * lands. The fill's minimum width equals its height, so at zero it reads as
 * a circle resting at the start: progress that has begun, never a dial knob. */

import { useEffect, useRef, useState } from "react";
import { m } from "motion/react";
import { IndianRupee } from "lucide-react";
import { SPRINGS, useMotionGovernor } from "@/components/common/motion";

const SEGMENTS = [
  { label: "Hosting", value: 1950, color: "var(--color-canopy)" },
  { label: "Photos", value: 90, color: "var(--color-cinnamon)" },
  { label: "Domain", value: 250, color: "var(--color-sky)" },
];
const MONTHLY_TOTAL = SEGMENTS.reduce((sum, s) => sum + s.value, 0);

/* One-time, to design and build the site. The denominator of the recovery
   bar and nothing else; never printed. */
const BUILD_COST_PAISE = 500000 * 100;

/* Both bars use a 20px track with a 4px inset, leaving a 12px fill; the fund
   fill's minimum width matches that fill height so its zero state stays a
   circle rather than a larger knob. */
const FUND_FILL_H = 12;

/* Counts the total up from 0 the first time the card scrolls into view: a
   rAF ease-out cubic over ~950ms, paused only by a hidden tab (battery
   courtesy), never by the OS reduced-motion setting, per the standing motion
   decision. */
function useCountUpOnView(target: number) {
  const ref = useRef<HTMLDivElement>(null);
  const raf = useRef<number | null>(null);
  const { paused } = useMotionGovernor();
  const pausedRef = useRef(paused);
  useEffect(() => {
    pausedRef.current = paused;
  });
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
        if (!pausedRef.current) elapsed += now - lastNow;
        lastNow = now;
        const t = Math.min(1, elapsed / dur);
        setValue(Math.round(target * (1 - Math.pow(1 - t, 3))));
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

export function CostsCard({ recoveredPaise }: { recoveredPaise: number }) {
  const { ref, shown, value } = useCountUpOnView(MONTHLY_TOTAL);

  const fundPct = Math.min(100, (recoveredPaise / BUILD_COST_PAISE) * 100);

  return (
    <div ref={ref}>
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
        <m.div
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
        </m.div>
      </div>

      <SegmentChips />

      {/* The one-time build fund: the card's second section, a sibling of the
          monthly breakdown with the same heading register and the same left
          edge, never inset inside it (owner, 2026-07-30: "it's not a subset
          of where the monthly bill goes"). */}
      <div className="mt-[var(--space-l)]">
        <p className="font-heading text-base font-bold text-foreground">
          Recovering what it cost to build
        </p>
        <div
          className="relative mt-[var(--space-m)] h-5 w-full overflow-hidden rounded-full bg-mist p-1"
          role="progressbar"
          // Percentages, not amounts: with the figures off the page, a screen
          // reader announcing "0 of 500000" would be reading out the one
          // thing this section deliberately does not say.
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(fundPct)}
          aria-label="Progress towards recovering the one-time cost of building the site"
        >
          {/* Width set statically rather than animated with scaleX: a
              transform scale would squash the zero-state circle into an
              ellipse, and width itself may not animate (transform/opacity
              only), so the on-view reveal is an opacity fade instead. */}
          <m.div
            className="h-full rounded-full bg-canopy"
            style={{ width: `max(${fundPct}%, ${FUND_FILL_H}px)` }}
            initial={{ opacity: 0 }}
            animate={{ opacity: shown ? 1 : 0 }}
            transition={SPRINGS.gentle}
          />
        </div>
      </div>
    </div>
  );
}

/* The three lines of the bill, in words. Fixed, so the card's placeholder
   draws them as they are. */
function SegmentChips() {
  return (
    <div className="mt-[var(--space-m)] flex flex-wrap gap-[var(--space-xs)]">
      {SEGMENTS.map((s) => (
        <span
          key={s.label}
          className="inline-flex items-center gap-[var(--space-xxs)] rounded-full border border-border bg-mist px-[var(--space-s)] py-[var(--space-xxs)] text-xs font-medium text-foreground"
        >
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: s.color }} />
          {s.label}
          <span className="tabular-nums text-muted-foreground">
            ₹{s.value.toLocaleString("en-IN")}
          </span>
        </span>
      ))}
    </div>
  );
}

/**
 * The card before the page arrives: its words as they are, and a placeholder
 * for each part that moves -- the total that counts up, and the two bars that
 * grow and fade in. They play their entrances when the real card lands, so the
 * placeholder must not play them first (a count that ran here would run a
 * second time from zero on arrival). Same boxes, same gaps.
 */
export function CostsCardSkeleton() {
  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-x-[var(--space-m)] gap-y-[var(--space-xxs)]">
        <p className="font-heading text-base font-bold text-foreground">
          Where the monthly bill goes
        </p>
        <p className="relative inline-flex items-center gap-0.5 text-lg font-semibold tabular-nums">
          <span className="size-4" />
          <span className="invisible">
            {MONTHLY_TOTAL.toLocaleString("en-IN")}
            <span className="ml-1 text-sm font-medium">/month</span>
          </span>
          <span className="skeleton-warm absolute inset-x-0 top-1/2 h-3.5 -translate-y-1/2 rounded-md" />
        </p>
      </div>

      <div className="mt-[var(--space-m)] h-5 w-full rounded-full bg-mist" />

      <SegmentChips />

      <div className="mt-[var(--space-l)]">
        <p className="font-heading text-base font-bold text-foreground">
          Recovering what it cost to build
        </p>
        <div className="mt-[var(--space-m)] h-5 w-full rounded-full bg-mist" />
      </div>
    </div>
  );
}
