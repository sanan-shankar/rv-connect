"use client";

/* ------------------------------------------------------------------ *
 *  Making an Edition a time capsule, and what a writer sees after.
 *
 *  The row sits in the settings panel he signed off (spec 10.3), under
 *  This Edition, and unfolds where it stands the way Rhythm does. The
 *  server's rule is `setEditionTimeCapsule`: collecting only, Keepers on
 *  a people Catch-up, anyone in a batch.
 * ------------------------------------------------------------------ */

import { useState } from "react";
import { CalendarClock, CalendarRange, Check, PenLine } from "lucide-react";
import { CaretDown } from "@phosphor-icons/react";
import { capsuleOpensAt } from "@/lib/catchups-core";
import { cn, formatDisplayDateLong } from "@/lib/utils";

export type MarkPreset = "keeper" | "batch" | "answering";

export const MARK_PRESETS: Array<{ key: MarkPreset; label: string }> = [
  { key: "keeper", label: "A Keeper, taking questions" },
  { key: "batch", label: "Anyone in a batch" },
  { key: "answering", label: "Answering has opened" },
];

/** Answers close 21 September 2026, so it would open on the 21st next year. */
const WOULD_OPEN = formatDisplayDateLong(capsuleOpensAt(new Date("2026-09-21T01:30:00Z")));

const ROW = "flex w-full items-start gap-3 rounded-[10px] px-3 py-2.5 text-left";

function Row({
  icon: Icon,
  label,
  line,
  oneWay,
  onPress,
  caret,
  open,
}: {
  icon: typeof PenLine;
  label: string;
  line: string;
  oneWay?: boolean;
  onPress?: () => void;
  caret?: boolean;
  open?: boolean;
}) {
  const body = (
    <>
      <Icon className={cn("mt-[2px] h-[18px] w-[18px] shrink-0", onPress ? "text-muted-foreground" : "text-muted-foreground/55")} strokeWidth={1.8} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] text-foreground">{label}</span>
        <span className="mt-[3px] block text-[13.5px] text-muted-foreground">{line}</span>
        {oneWay && <span className="mt-[3px] block text-[12.5px] text-cinnamon">Cannot be undone</span>}
      </span>
      {caret && (
        <CaretDown
          size={13}
          weight="bold"
          className={cn("mt-[5px] shrink-0 text-muted-foreground/70 transition-transform duration-200", open && "rotate-180")}
        />
      )}
    </>
  );
  return onPress ? (
    <button
      type="button"
      onClick={onPress}
      aria-expanded={caret ? open : undefined}
      className={cn(ROW, "state-layer active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring")}
    >
      {body}
    </button>
  ) : (
    <div className={ROW}>{body}</div>
  );
}

function Choice({ on, label, line, onPick }: { on: boolean; label: string; line: string; onPick: () => void }) {
  return (
    <button
      type="button"
      onClick={onPick}
      aria-pressed={on}
      className="state-layer flex w-full items-start gap-3 rounded-[10px] py-2 pl-[42px] pr-3 text-left active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring"
    >
      <span className="min-w-0 flex-1">
        <span className="block text-[14.5px] text-foreground">{label}</span>
        <span className="mt-[2px] block text-[13px] text-muted-foreground">{line}</span>
      </span>
      <Check className={cn("mt-[3px] h-4 w-4 shrink-0 text-canopy", on ? "opacity-100" : "opacity-0")} strokeWidth={2.4} />
    </button>
  );
}

export function MarkPanel({ preset }: { preset: MarkPreset }) {
  const [capsule, setCapsule] = useState(preset === "answering");
  const [open, setOpen] = useState(false);
  const frozen = preset === "answering";
  const line = capsule ? `A time capsule, opens ${WOULD_OPEN}` : "An ordinary Edition";

  return (
    <section>
      <h3 className="mb-2 font-sans text-[15px] font-medium text-foreground">This Edition</h3>
      <div className="rounded-[14px] border border-border p-1">
        {preset === "keeper" && (
          <Row icon={PenLine} label="Open answering" line="Stop taking questions, start writing" oneWay onPress={() => {}} />
        )}
        {preset !== "batch" && (
          <Row
            icon={CalendarClock}
            label="Give everyone longer"
            line={frozen ? "Answers close 21 September" : "Push the deadline back"}
            onPress={() => {}}
          />
        )}
        <Row
          icon={CalendarRange}
          label="Time capsule"
          line={frozen ? `${line}. Fixed now answering has opened` : line}
          caret={!frozen}
          open={open}
          onPress={frozen ? undefined : () => setOpen((v) => !v)}
        />
        {open && !frozen && (
          <div className="pb-1">
            <Choice on={!capsule} label="An ordinary Edition" line="Out when answers close" onPick={() => setCapsule(false)} />
            <Choice
              on={capsule}
              label="A time capsule"
              line={`Out a year later, on ${WOULD_OPEN}. Nobody can read it before then`}
              onPick={() => setCapsule(true)}
            />
          </div>
        )}
      </div>
    </section>
  );
}

/** The answering card, as a writer meets it in a capsule. */
export function CapsuleAnswerCard() {
  return (
    <article className="card-elevated rounded-[var(--radius)] border border-border bg-card p-4 md:p-5">
      <p className="flex items-start gap-2.5 font-sans text-[13.5px] leading-[1.5] text-muted-foreground">
        <span aria-hidden className="mt-[2px] h-[17px] w-[2px] shrink-0 rounded-full bg-cinnamon" />
        <span>A time capsule. Nobody reads this, you included, until {WOULD_OPEN}.</span>
      </p>
      <h3 className="mt-4 break-words font-heading text-[22px] leading-[1.25] tracking-[-0.015em] text-foreground">
        What do you hope your life looks like a year from now?
      </h3>
      <div className="mt-4 min-h-[112px] rounded-[var(--radius-md)] border border-border bg-background/40 px-3.5 py-3 text-[15.5px] text-muted-foreground">
        Your answer
      </div>
    </article>
  );
}
