"use client";

/* A small, honest "where the monthly bill goes" bar. Not a fundraiser and not a
   goal to fill toward (this page deliberately has neither). It just draws in the
   composition of the real recurring cost when it scrolls into view, so the
   breakdown above gets a calm visual summary. transform/opacity only. */

import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { SPRINGS } from "@/components/common/motion";

const SEGMENTS = [
  { label: "Server", value: 600, color: "#1F8A4C" },
  { label: "Database", value: 550, color: "#3F7CA6" },
  { label: "Everything else", value: 300, color: "#C2622F" },
];
const TOTAL = SEGMENTS.reduce((sum, s) => sum + s.value, 0);

export function CostBar() {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            setShown(true);
            io.disconnect();
          }
        });
      },
      { threshold: 0.4 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className="mt-[var(--space-m)]">
      <div className="flex items-baseline justify-between gap-[var(--space-m)]">
        <p className="text-sm font-medium text-foreground">Where the monthly bill goes</p>
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
