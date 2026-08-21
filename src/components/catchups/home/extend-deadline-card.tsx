"use client";

/* ------------------------------------------------------------------ *
 *  <ExtendDeadlineCard> - a Keeper buying the group more time.
 *
 *  Owner, 2026-08-05: "importantly have the ability to extend deadline.
 *  You can extend by 1 day 2 days or 4 days or a week. Both the question
 *  phase and the answer phase. The keepers should be able to."
 *
 *  Four fixed amounts, not a date picker: the question a Keeper is
 *  actually asking is "how much longer", and answering it in one tap
 *  beats a calendar. They are not a segmented control either, because
 *  nothing here is SELECTED - each is a one-shot action that moves the
 *  date and is then done, and dressing them as options would imply a
 *  current one.
 *
 *  Shown only while there is a window to move (collecting or answering),
 *  and only to a Keeper. Which window it moves is decided server-side
 *  from the Round's own fresh status; the phase passed in here is for the
 *  wording alone.
 * ------------------------------------------------------------------ */

import { useState } from "react";
import { CalendarPlus } from "lucide-react";
import { toast } from "sonner";
import { callAction } from "@/lib/call-action";
import { FadeRise } from "@/components/common/motion";
import { cn, VALLEY_TIME_ZONE } from "@/lib/utils";
import { extendDeadline } from "@/app/(main)/catchups/actions";

/**
 * The four amounts the owner named. "1 week" rather than "7 days": a week is
 * how anyone would say it, and rather than "a week", because these sit in a
 * grid where every other label starts with a numeral and "+ A week" was the
 * one that broke the column.
 */
const AMOUNTS: Array<{ days: 1 | 2 | 4 | 7; label: string }> = [
  { days: 1, label: "1 day" },
  { days: 2, label: "2 days" },
  { days: 4, label: "4 days" },
  { days: 7, label: "1 week" },
];

/** "Closes Tuesday 12 Aug", the one fact that makes the four buttons mean something. */
function closesLine(iso: string | null): string | null {
  if (!iso) return null;
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return null;
  return at.toLocaleDateString("en-GB", {
    timeZone: VALLEY_TIME_ZONE,
    weekday: "long",
    day: "numeric",
    month: "short",
  });
}

export function ExtendDeadlineCard({
  editionId,
  phase,
  closesAt,
  onChanged,
}: {
  editionId: string;
  phase: "collecting" | "answering";
  closesAt: string | null;
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState<number | null>(null);
  const closes = closesLine(closesAt);
  const noun = phase === "collecting" ? "Questions" : "Replies";

  async function handleExtend(days: 1 | 2 | 4 | 7) {
    setBusy(days);
    try {
      const result = await callAction(() => extendDeadline(editionId, days));
      if (result && "error" in result) {
        toast.error(result.error);
        return;
      }
      const amount = days === 7 ? "a week" : days === 1 ? "a day" : `${days} days`;
      toast.success(
        phase === "collecting"
          ? `Questions stay open ${amount} longer.`
          : `Replies stay open ${amount} longer.`
      );
      onChanged();
    } finally {
      // finally, not a trailing statement: a rejected call used to leave
      // every button here disabled for the rest of the session (audit B-042).
      setBusy(null);
    }
  }

  return (
    <FadeRise delay={0.05}>
      <div className="card-elevated rounded-[var(--radius)] border border-border bg-card p-[var(--space-m)]">
        <div className="flex items-center gap-2">
          <CalendarPlus className="h-4 w-4 text-cinnamon" aria-hidden />
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
            More time
          </p>
        </div>

        {/* Not a restatement of the heading: it is the date the buttons move. */}
        {closes && (
          <p className="mt-[var(--space-s)] text-[13px] text-muted-foreground">
            {noun} close {closes}.
          </p>
        )}

        <div className="mt-[var(--space-s)] grid grid-cols-2 gap-1.5">
          {AMOUNTS.map((amount) => (
            <button
              key={amount.days}
              type="button"
              disabled={busy !== null}
              onClick={() => handleExtend(amount.days)}
              className={cn(
                // `color`, not `colors`: `transition-[colors,...]` emits
                // `transition-property: colors`, which matches no CSS property,
                // so the tint would snap instead of easing.
                "rounded-full border border-border px-3 py-1.5 text-[12.5px] font-medium text-foreground transition-[color,border-color,transform] duration-150 active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                "state-layer hover:border-cinnamon/50 hover:text-cinnamon",
                busy !== null && "opacity-50",
                busy === amount.days && "border-cinnamon/50 text-cinnamon"
              )}
            >
              {busy === amount.days ? "Adding..." : `+ ${amount.label}`}
            </button>
          ))}
        </div>
      </div>
    </FadeRise>
  );
}
