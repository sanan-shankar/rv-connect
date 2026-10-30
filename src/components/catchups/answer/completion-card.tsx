"use client";

/* ------------------------------------------------------------------ *
 *  <CompletionCard> — the end of the deck: "That is you in this Edition. See
 *  you when it is out." No streaks, no badges, one settled hoopoe.
 *
 *  One-hoopoe rule: gated on `useSoloHoopoe()`. When another bird is
 *  already on screen, the hoopoe drops out and the heading simply leads
 *  the card instead of sitting on an empty gap above it.
 * ------------------------------------------------------------------ */

import { ResidentHoopoe } from "@/components/mascot/resident-hoopoe";
import { useSoloHoopoe } from "@/components/mascot/moments/one-hoopoe-guard";
import { Button } from "@/components/ui/button";
import { FadeRise } from "@/components/common/motion";
import { cn } from "@/lib/utils";

export function CompletionCard({
  groupName,
  answeredCount,
  onBack,
}: {
  groupName: string;
  answeredCount: number;
  /** To the first question, which is where every answer can be changed. */
  onBack: () => void;
}) {
  const solo = useSoloHoopoe();

  return (
    <FadeRise className="card-elevated relative overflow-hidden rounded-[var(--radius)] border border-border bg-card p-[var(--space-m)] text-center sm:p-[var(--space-l)]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 90% at 50% 0%, color-mix(in srgb, var(--color-leaf) 10%, transparent), transparent 60%)",
        }}
      />
      <div className="relative flex flex-col items-center">
        {solo && <ResidentHoopoe size={104} />}
        <h2
          className={cn(
            "font-heading text-2xl font-bold tracking-[-0.02em] text-foreground",
            solo && "mt-[var(--space-m)]"
          )}
        >
          {answeredCount > 0 ? "That is you in this Edition." : "Nothing from you yet."}
        </h2>
        <p className="mx-auto mt-[var(--space-xs)] max-w-sm text-[15px] leading-relaxed text-muted-foreground">
          {answeredCount > 0
            ? `See you when ${groupName}'s Catch-up is out.`
            : "You can come back any time before answers close."}
        </p>
        {/* BACK TO THE QUESTIONS, not "Back to the Catch-up". That pill was
            written when answering had a page of its own; since answering moved
            onto the Catch-up's home, it linked to the page it was drawn on,
            and the card stayed (bug audit 3, T3-05). Going back to the
            questions is the one thing left to do from here: change an answer,
            or fill in one left blank. The marks above do it too, but they are
            3px lines, and nothing says they can be pressed. */}
        <Button variant="primary" onClick={onBack} className="mt-[var(--space-l)]">
          Back to the questions
        </Button>
      </div>
    </FadeRise>
  );
}
