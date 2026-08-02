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
import { EASE_SEGMENT_GLIDE, FadeRise, SEGMENT_GLIDE_SECONDS } from "@/components/common/motion";
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
      <div className="card-elevated rounded-[var(--radius)] border border-border bg-card p-[var(--space-m)]">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-leaf" />
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
            Reminders
          </p>
        </div>
        {/* All / Last day / Off need no sub-copy: the three labels are the
            explanation (owner review, 2026-07-25). */}
        <div className="relative mt-[var(--space-s)] grid grid-cols-3 gap-1 rounded-full border border-border bg-muted/40 p-1">
          {OPTIONS.map((opt) => {
            const selected = mode === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                aria-pressed={selected}
                onClick={() => handlePick(opt.value)}
                className={cn(
                  // `color`, not `colors`: `transition-[colors,...]` emits
                  // `transition-property: colors` which matches no CSS property,
                  // so the hover tint would snap instead of easing.
                  "relative rounded-full px-2 py-1.5 text-[12px] font-medium transition-[color,transform] duration-150 active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                  selected ? "text-canopy" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {selected && (
                  <motion.span
                    layoutId="reminderPrefThumb"
                    className="absolute inset-0 z-0 rounded-full border border-canopy bg-canopy/10"
                    // Not SegmentedPills: this thumb is the canopy-tint OUTLINE
                    // treatment (border + text-canopy), not the fill/white-text
                    // look the shared component draws, and the owner's
                    // 2026-08-02 note only asked to defill the *outline*
                    // controls (directory, signup), not to fill this one too.
                    // Same no-bounce curve regardless, so it doesn't stand out
                    // as the control that still bounces.
                    transition={{ duration: SEGMENT_GLIDE_SECONDS, ease: EASE_SEGMENT_GLIDE }}
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
