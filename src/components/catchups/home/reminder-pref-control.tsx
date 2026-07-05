"use client";

/* ------------------------------------------------------------------ *
 *  <ReminderPrefControl> - a member's own reminder setting for this
 *  Catch-up (spec 5: `CatchupPref.reminderMode`, all / last only /
 *  off). Visible to every member, not just the Keeper.
 * ------------------------------------------------------------------ */

import { useState } from "react";
import { Bell } from "lucide-react";
import { motion } from "motion/react";
import { toast } from "sonner";
import { FadeRise, SPRINGS } from "@/components/common/motion";
import { cn } from "@/lib/utils";
import { setReminderPref } from "@/app/(main)/catchups/actions";
import type { ReminderMode } from "@/lib/catchups-types";

const OPTIONS: Array<{ value: ReminderMode; label: string }> = [
  { value: "all", label: "All" },
  { value: "last", label: "Last day" },
  { value: "off", label: "Off" },
];

export function ReminderPrefControl({
  catchupId,
  initialMode,
}: {
  catchupId: string;
  initialMode: ReminderMode;
}) {
  const [mode, setMode] = useState(initialMode);

  async function handlePick(value: ReminderMode) {
    if (value === mode) return;
    const previous = mode;
    setMode(value);
    const result = await setReminderPref(catchupId, value);
    if (result && "error" in result) {
      toast.error(result.error);
      setMode(previous);
    }
  }

  return (
    <FadeRise delay={0.02}>
      <div className="card-elevated rounded-[var(--radius)] border border-border bg-card p-5">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-leaf" />
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
            Reminders
          </p>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          When to nudge you about this Catch-up while answers are open.
        </p>
        <div className="relative mt-3 grid grid-cols-3 gap-1 rounded-full border border-border bg-muted/40 p-1">
          {OPTIONS.map((opt) => {
            const selected = mode === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                aria-pressed={selected}
                onClick={() => handlePick(opt.value)}
                className={cn(
                  "relative rounded-full px-2 py-1.5 text-[12px] font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                  selected ? "text-canopy" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {selected && (
                  <motion.span
                    layoutId="reminderPrefThumb"
                    className="absolute inset-0 z-0 rounded-full border border-canopy bg-canopy/10"
                    transition={SPRINGS.snappy}
                  />
                )}
                <span className="relative z-10">{opt.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </FadeRise>
  );
}
