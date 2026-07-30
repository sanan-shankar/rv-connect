"use client";

/* The two cost visuals on /support.

   CostBar is the colorful, animated breakdown of the recurring monthly bill.
   This replaces what used to be a stark, ledger-style table -- the owner liked
   the color, hated the seriousness, so the color visual leads and the numbers
   ride along with it. The domain is billed monthly (₹250) like everything else,
   so all three costs sit inside the one bar, which also keeps all three brand
   colours represented.

   The one-time build-fund progress lives nested inside this same card, as a
   smaller, recessed note (bg-mist, rounded-md/12px inside the card's own
   rounded-lg/16px -- the project's own box-in-a-box nesting rule). It used to
   be its own card-elevated peer sitting directly under the monthly bill's
   card, which forced a full-bar/empty-bar comparison the one-off always lost.
   Demoting it to a subordinate note fixes that.

   The progress indicator itself is a track with a solid circular knob, not a
   fill bar: at ₹0 the knob simply sits at the start of the track, so the page
   reads as "a thing at its beginning" rather than an empty, illegible bar
   (bg-mist on bg-card was 1.09:1; the rail here is bg-muted-foreground, which
   clears 3:1 against both bg-card and bg-mist).

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

/* The knob's own diameter (h-4 w-4). Its resting x is offset by half of this so
   the knob's CENTRE, not its left edge, marks the current position -- at 0%
   that centre sits exactly on the track's start. */
const KNOB_SIZE = 16;
const KNOB_RADIUS = KNOB_SIZE / 2;

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
  pausedRef.current = paused;
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

/* Measures the track's rendered pixel width so the knob's transform-based
   travel (translateX in px) lines up exactly with the fill's transform-based
   width (scaleX, resolution-independent). Re-measures on resize/reflow. */
function useTrackWidth() {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setWidth(el.getBoundingClientRect().width);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return { ref, width };
}

export function CostBar() {
  const { ref, shown, value } = useCountUpOnView(MONTHLY_TOTAL);
  const { ref: fundRef, shown: fundShown, value: fundValue } = useCountUpOnView(BUILD_RECOVERED);
  const { ref: trackRef, width: trackWidth } = useTrackWidth();

  const fundPct = Math.min(100, (BUILD_RECOVERED / BUILD_COST) * 100);
  const knobX = (fundPct / 100) * trackWidth - KNOB_RADIUS;

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

      {/* The one-time build fund: a smaller, recessed note (rounded-md/12px)
          nested inside this card (rounded-lg/16px), never a peer card of its
          own -- see the nesting rule in DESIGN-SYSTEM.md. */}
      <div ref={fundRef} className="mt-[var(--space-m)] rounded-md bg-mist p-[var(--space-m)]">
        <div className="flex flex-wrap items-baseline justify-between gap-x-[var(--space-m)] gap-y-[var(--space-xxs)]">
          <p className="text-sm font-semibold text-foreground">
            Recovering what it cost to build
          </p>
          <p className="inline-flex items-center gap-0.5 text-sm font-semibold tabular-nums text-canopy">
            <IndianRupee className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />
            {fundValue.toLocaleString("en-IN")}
            <span className="ml-1 text-xs font-medium text-muted-foreground">
              of ₹{BUILD_COST.toLocaleString("en-IN")}
            </span>
          </p>
        </div>

        <div
          ref={trackRef}
          className="relative mt-[var(--space-m)] h-1.5 w-full rounded-full bg-muted-foreground"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={BUILD_COST}
          aria-valuenow={BUILD_RECOVERED}
          aria-label="Progress towards recovering the one-time cost of building the site"
        >
          <motion.div
            className="absolute inset-y-0 left-0 h-full w-full origin-left rounded-full bg-canopy"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: fundShown ? fundPct / 100 : 0 }}
            transition={SPRINGS.gentle}
          />
          <motion.div
            className="absolute left-0 top-1/2 h-4 w-4 rounded-full bg-canopy shadow-[0_2px_6px_-2px_rgba(35,92,73,0.55)] ring-2 ring-mist"
            initial={{ x: -KNOB_RADIUS, y: "-50%" }}
            animate={{ x: fundShown ? knobX : -KNOB_RADIUS, y: "-50%" }}
            transition={SPRINGS.gentle}
          />
        </div>

        <div className="mt-[var(--space-xs)] flex items-center justify-between text-xs tabular-nums text-muted-foreground">
          <span>₹0</span>
          <span>₹{BUILD_COST.toLocaleString("en-IN")}</span>
        </div>
      </div>
    </div>
  );
}
