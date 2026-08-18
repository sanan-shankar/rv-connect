"use client";

/* The Costs card on /support.
 *
 * Three failed shapes taught this one its rules. Two 20px bars in a 250px card
 * left most of the card empty. A right-aligned ledger list put "Hosting" 500px
 * from its "₹1,950" with nothing connecting them. And a 44px bar carrying its
 * own label made hosting a fat green pill next to two mute blobs, with the
 * total stranded below in a size nothing else on the site uses.
 *
 * So: the number leads. ₹2,290 a month is the one fact this card exists to
 * state, and it opens the card at the type scale's h2, counting up as it
 * scrolls into view (the old card's one delight, kept). Under it a thin
 * segmented strip shows the split without trying to be a labelled chart, and
 * under that a receipt: one line per cost, a dotted leader carrying the eye
 * from name to amount the way a school bill would set it. The dots are the
 * fix for the 500px gap; they make the width an asset instead of a void.
 *
 * The build-cost section keeps its live fill (the server sums paid
 * contributions on every view) and keeps its figures OFF: what it costs to
 * build is published nowhere on the page, so the bar says "underway", not
 * "x of y". */

import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { IndianRupee } from "lucide-react";
import { SPRINGS, useMotionGovernor } from "@/components/common/motion";

export const SEGMENTS = [
  { label: "Hosting", value: 1950, color: "var(--color-canopy)" },
  { label: "Domain", value: 250, color: "var(--color-cinnamon)" },
  { label: "Photos", value: 90, color: "var(--color-sky)" },
];

export const MONTHLY = SEGMENTS.reduce((sum, s) => sum + s.value, 0); // 2290

/* One-time, to design and build the site. Never printed; the denominator of
   the recovery bar and nothing else. */
const BUILD_COST_PAISE = 400000 * 100;

const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;

/* Counts the headline up from 0 the first time the card scrolls into view,
   ported from the retired cost-bar.tsx: a rAF ease-out cubic over ~950ms,
   paused only by a hidden tab (battery courtesy), never by the OS
   reduced-motion setting, per the standing motion decision. */
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
  const { ref, shown, value } = useCountUpOnView(MONTHLY);

  // Live: the server sums paid, live-mode contributions on every view and the
  // bar advances on its own as money arrives. The fill's minimum width equals
  // its height, so before the first rupee it reads as a circle resting at the
  // start, progress that has begun, never a dial knob.
  const fundPct = Math.min(100, (recoveredPaise / BUILD_COST_PAISE) * 100);

  return (
    <div ref={ref}>
      {/* The one fact, at the site's h2 (1.5rem, heading face). */}
      <p className="mt-[var(--space-m)] flex items-baseline gap-[var(--space-xs)]">
        <span className="inline-flex items-baseline font-heading text-2xl tracking-[-0.02em] text-canopy">
          <IndianRupee className="h-[18px] w-[18px] self-center" strokeWidth={2.25} aria-hidden />
          <span className="tabular-nums">{value.toLocaleString("en-IN")}</span>
        </span>
        <span className="text-sm text-muted-foreground">a month keeps it up</span>
      </p>

      {/* The split, as a strip rather than a chart: 8px, no labels of its own,
          because the receipt right below is the labelling. */}
      <div className="mt-[var(--space-s)] flex h-2 w-full gap-[3px] overflow-hidden rounded-full">
        <motion.div
          className="flex h-full w-full origin-left gap-[3px]"
          initial={{ scaleX: 0 }}
          animate={shown ? { scaleX: 1 } : { scaleX: 0 }}
          transition={SPRINGS.gentle}
        >
          {SEGMENTS.map((s) => (
            <div
              key={s.label}
              style={{ width: `${(s.value / MONTHLY) * 100}%`, background: s.color }}
              className="h-full rounded-full"
            />
          ))}
        </motion.div>
      </div>

      {/* The receipt. The leader is a dotted border on a flex spacer, sitting
          on the text baseline, so however wide the card is the eye never has
          to jump a void between a name and its number. */}
      <ul className="mt-[var(--space-m)] flex flex-col gap-[var(--space-s)]">
        {SEGMENTS.map((s) => (
          <li key={s.label} className="flex items-baseline gap-[var(--space-s)]">
            <span className="flex items-baseline gap-[var(--space-s)] text-[15px] text-foreground">
              <span
                className="inline-block h-2.5 w-2.5 shrink-0 translate-y-[-0.06em] self-center rounded-full"
                style={{ background: s.color }}
                aria-hidden
              />
              {s.label}
            </span>
            <span
              className="mx-[var(--space-xxs)] flex-1 border-b border-dotted border-border"
              aria-hidden
            />
            <span className="text-[15px] tabular-nums text-muted-foreground">{inr(s.value)}</span>
          </li>
        ))}
      </ul>

      {/* The one-time build cost coming back, live figure, no denominators. */}
      <div className="mt-[var(--space-l)] flex flex-wrap items-baseline justify-between gap-x-[var(--space-m)] gap-y-[var(--space-xxs)]">
        <p className="text-[15px] font-semibold text-foreground">
          Recovering the one-time cost of building it
        </p>
      </div>
      <div
        className="mt-[var(--space-s)] flex h-5 w-full overflow-hidden rounded-full bg-mist p-1"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(fundPct)}
        aria-label="Progress towards recovering the one-time cost of building the site"
      >
        <motion.div
          className="h-full rounded-full bg-canopy"
          style={{ width: `max(${fundPct}%, 12px)` }}
          initial={{ opacity: 0 }}
          animate={{ opacity: shown ? 1 : 0 }}
          transition={SPRINGS.gentle}
        />
      </div>
    </div>
  );
}
