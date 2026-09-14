"use client";

/* ------------------------------------------------------------------ *
 *  Casting a vote, in the answering card on the home.
 *
 *  The card's own parts are AnswerCard's (answer/answer-card.tsx): the
 *  question at its size, "asked by" with the asker's bird, Back beside
 *  Next and no rule above them. What is new is that the choices ARE the
 *  control. A picked choice is a solid canopy row with white type, which
 *  is the design system's one selection state, not a decoration.
 *
 *  Nothing here shows how the vote is going. Nothing in an Edition is
 *  readable before it is published (spec 3.13), and a running count is a
 *  reading.
 * ------------------------------------------------------------------ */

import { useState } from "react";
import { m } from "motion/react";
import { Check, ChevronLeft } from "lucide-react";
import { BirdAvatar } from "@/components/common/bird-avatar";
import { EASE_OUT_SMOOTH, SPRINGS } from "@/components/common/motion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { VoteCase } from "./_cases";

export type BallotPreset = "none" | "picked" | "line" | "six";

export const BALLOT_PRESETS: Array<{ key: BallotPreset; label: string }> = [
  { key: "none", label: "Nothing picked" },
  { key: "picked", label: "Picked" },
  { key: "line", label: "With a line" },
  { key: "six", label: "Six choices" },
];

const RING = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

export function Ballot({ vc, preset }: { vc: VoteCase; preset: BallotPreset }) {
  const [picked, setPicked] = useState<string | null>(
    preset === "none" ? null : preset === "six" ? vc.choices[5]?.id ?? null : vc.choices[0]?.id ?? null
  );
  const [line, setLine] = useState(
    preset === "line" ? "Nobody else would argue about hover states for this long." : ""
  );

  return (
    <div className="rounded-[var(--radius)] border border-border bg-card p-4 sm:p-5">
      <h3 className="max-w-lg font-heading text-[1.35rem] font-bold leading-[1.25] tracking-[-0.02em] text-foreground [overflow-wrap:anywhere] sm:text-[1.55rem]">
        {vc.question}
      </h3>
      <div className="mt-[var(--space-s)] flex items-center gap-2">
        <BirdAvatar user={{ id: `vote-${vc.asker}`, name: vc.asker, photoUrl: null }} size={22} />
        <span className="text-xs font-medium text-muted-foreground">asked by {vc.asker}</span>
      </div>

      <div role="radiogroup" aria-label="Choices" className="mt-[var(--space-m)] space-y-2">
        {vc.choices.map((c) => {
          const on = picked === c.id;
          return (
            <m.button
              key={c.id}
              type="button"
              whileTap={{ scale: 0.985 }}
              transition={SPRINGS.snappy}
              role="radio"
              aria-checked={on}
              onClick={() => setPicked(c.id)}
              className={cn(
                "flex w-full min-w-0 items-center gap-3 rounded-[var(--radius-md)] border px-4 py-3 text-left transition-colors duration-150",
                RING,
                on
                  ? "border-transparent bg-canopy text-white shadow-[0_6px_16px_-12px_var(--color-canopy)]"
                  : "state-layer border-border bg-card text-foreground"
              )}
            >
              <span
                aria-hidden
                className={cn(
                  "grid h-5 w-5 shrink-0 place-items-center rounded-full border-2",
                  on ? "border-current" : "border-border"
                )}
              >
                {on && <Check className="h-3 w-3" strokeWidth={3.2} />}
              </span>
              <span className="min-w-0 flex-1 break-words font-heading text-[16px] leading-snug [overflow-wrap:anywhere]">
                {c.text}
              </span>
            </m.button>
          );
        })}
      </div>

      {picked && (
        <m.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, ease: EASE_OUT_SMOOTH }}
        >
          <Textarea
            value={line}
            onChange={(e) => setLine(e.target.value)}
            aria-label="Add a line, if you like"
            placeholder="Add a line, if you like"
            className="mt-3 min-h-[3rem] bg-background/60 font-heading text-[16px] [overflow-wrap:anywhere]"
          />
        </m.div>
      )}

      <div className="mt-2.5 flex min-h-8 flex-wrap items-center gap-x-3 gap-y-1">
        <p className="text-[12.5px] text-muted-foreground">Everyone sees who picked what once it is out.</p>
        {picked && (
          <button
            type="button"
            onClick={() => {
              setPicked(null);
              setLine("");
            }}
            className={cn(
              "ml-auto rounded-sm text-[12.5px] font-medium text-muted-foreground transition-colors duration-150 hover:text-foreground hover:underline active:opacity-70",
              RING
            )}
          >
            Take my vote back
          </button>
        )}
      </div>

      <div className="mt-[var(--space-m)] flex items-center justify-end gap-1.5">
        <Button type="button" variant="ghost" size="sm">
          <ChevronLeft className="h-4 w-4" />
          Back
        </Button>
        <Button type="button" variant="primary" size="sm">
          Next
        </Button>
      </div>
    </div>
  );
}
