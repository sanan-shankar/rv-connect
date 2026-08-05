"use client";

/* The two cost visuals on /support.

   CostBar is the colorful, animated breakdown of the recurring monthly bill.
   This replaces what used to be a stark, ledger-style table -- the owner liked
   the color, hated the seriousness, so the color visual leads and the numbers
   ride along with it. The domain is billed monthly (₹250) like everything else,
   so all three costs sit inside the one bar, which also keeps all three brand
   colours represented.

   The one-time build-fund progress is this card's SECOND SECTION: a sibling
   of the monthly breakdown, with the same heading register and the same left
   edge. It was briefly a recessed mist note nested inside the monthly
   section, but the owner overruled that (2026-07-30): the build cost is not
   a subset of where the monthly bill goes, so it does not sit inside that
   section's box. (It also once lived as a card-elevated peer CARD, which
   forced a full-bar/empty-bar twin comparison; one card, two sections,
   avoids both failure modes.)

   Its indicator is the same bar recipe as the monthly one, not the old
   track-and-knob slider: one canopy fill in a mist pill trough, where the
   fill's MINIMUM width equals the fill's height. At ₹0 that minimum is all
   there is, so the fill renders as a single circle resting at the left end:
   progress that has visibly started, never a dial thumb bigger than its rail.

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
   come back so far. Still a figure the owner edits by hand, but no longer
   because nothing tracks contributions: since Razorpay replaced the UPI QR
   (2026-08-05) every paid contribution is a Contribution row, so this can
   become SUM(amount) WHERE status = 'paid' whenever the owner wants it live
   rather than curated. */
const BUILD_COST = 400000;
const BUILD_RECOVERED = 0;

/* Both bars use a 20px track with a 4px inset, leaving a 12px fill. The fund
   fill's minimum width matches that fill height so its zero-state remains a
   circle rather than a larger knob. */
const FUND_FILL_H = 12;

/* Counts a figure up from 0 the first time the card scrolls into view, paired
   with the bar fill so the number and the bar land together. A rAF ease-out
   cubic over ~950ms, seeded from the first frame timestamp (not a render-scope
   clock). Plays regardless of the OS reduced-motion setting; only a hidden tab
   pauses the in-flight count (battery courtesy), resuming from where it left
   off rather than jumping. A target of 0 (e.g. the build fund before its first
   rupee arrives) has nowhere to count up from or to, so it skips the
   animation entirely and shows the static value instead. */
function useCountUpOnView(target: number) {
  const ref = useRef<HTMLDivElement>(null);
  const raf = useRef<number | null>(null);
  const { paused } = useMotionGovernor();
  const pausedRef = useRef(paused);
  // Assigned after commit rather than during render. The reader is the rAF
  // loop below, which only ever ticks after a commit.
  useEffect(() => {
    pausedRef.current = paused;
  });
  const [shown, setShown] = useState(false);
  const [value, setValue] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    function runCount() {
      if (target === 0) {
        setValue(0);
        return;
      }
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
  // Only the on-view flag is wanted here now; there is no figure left to count.
  const { ref: fundRef, shown: fundShown } = useCountUpOnView(BUILD_RECOVERED);

  const fundPct = Math.min(100, (BUILD_RECOVERED / BUILD_COST) * 100);

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

      <p className="mt-[var(--space-m)] text-sm leading-relaxed text-muted-foreground">
        A few people chipping in comfortably covers the whole month.
      </p>

      {/* The one-time build fund: the card's second section, a sibling of
          the monthly breakdown above with the same heading register and the
          same left edge, never inset inside it (owner, 2026-07-30: "it's
          not a subset of where the monthly bill goes"). --space-l of air
          marks the section break; no rule between them, because a divider
          here would be a border neither box has earned. */}
      <div ref={fundRef} className="mt-[var(--space-l)]">
        <div className="flex flex-wrap items-baseline justify-between gap-x-[var(--space-m)] gap-y-[var(--space-xxs)]">
          {/* No figures in this section any more (owner, 2026-08-04): the bar
              shows that there is a cost being recovered and roughly how far
              along it is, without putting a number on either end. */}
          <p className="font-heading text-base font-bold text-foreground">
            Recovering what it cost to build
          </p>
        </div>

        {/* The monthly bar's own trough recipe: a 20px mist pill with a 4px
            inset, producing the same 12px fill thickness. The max() keeps
            the fill's width from ever dropping below its height, so at 0% it
            is a perfect canopy circle at the left end and later progress
            stretches that same circle into a pill. Width is set statically rather than
            animated with scaleX like the bar above: a transform scale would
            squash the 0% circle into an ellipse, and width itself may not
            animate (transform/opacity only), so the on-view reveal is an
            opacity fade instead. */}
        <div
          className="relative mt-[var(--space-m)] h-5 w-full overflow-hidden rounded-full bg-mist p-1"
          role="progressbar"
          // Percentages, not amounts: with the figures off the page, a screen
          // reader announcing "0 of 400000" would be reading out the one thing
          // this section no longer says.
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(fundPct)}
          aria-label="Progress towards recovering the one-time cost of building the site"
        >
          <motion.div
            className="h-full rounded-full bg-canopy"
            style={{ width: `max(${fundPct}%, ${FUND_FILL_H}px)` }}
            initial={{ opacity: 0 }}
            animate={{ opacity: fundShown ? 1 : 0 }}
            transition={SPRINGS.gentle}
          />
        </div>

      </div>
    </div>
  );
}
