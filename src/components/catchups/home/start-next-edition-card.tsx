"use client";

/* ------------------------------------------------------------------ *
 *  <StartNextEditionCard> - the control nobody had.
 *
 *  He found it himself: "literally after publishing I can't start a new
 *  round?!?! I have to wait for two weeks minimum ... there's no control
 *  for that?? I have to create ANOTHER test catch up." True in the code:
 *  the next Edition opened on the clock alone and no action anywhere
 *  started one early, for anyone.
 *
 *  WHERE IT IS, and it is not a style choice. Opening an Edition cannot be
 *  undone and it notifies every member, so the accident rule governs it
 *  (architecture section 6, from N30: "many people would click it by
 *  accident ... it seems like the kind of irreversible thing"). Every
 *  one-way control lives in the RAIL, wears a small cinnamon dot, and
 *  confirms. Never in the content and never beside the primary action --
 *  which here is the Edition everyone is reading.
 *
 *  Shown only to a Keeper, only while the Catch-up is active, and only
 *  once the newest Edition has actually published. Every one of those is
 *  re-derived server-side in `startNextEditionNow`; this decides what is
 *  on screen, never what is allowed.
 *
 *  The rhythm date is the fact that makes the button mean something: "the
 *  next one opens 14 September" is what you are choosing to skip. Without
 *  it the control is just a verb.
 * ------------------------------------------------------------------ */

import { useState } from "react";
import { Sparkle } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { callAction } from "@/lib/call-action";
import { FadeRise } from "@/components/common/motion";
import { Button } from "@/components/ui/button";
import { VALLEY_TIME_ZONE } from "@/lib/utils";
import { startNextEditionNow } from "@/app/(main)/catchups/actions";

/** "14 September". No year: the rhythm never reaches one. */
function opensLine(iso: string | null): string | null {
  if (!iso) return null;
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return null;
  return at.toLocaleDateString("en-GB", {
    timeZone: VALLEY_TIME_ZONE,
    day: "numeric",
    month: "long",
  });
}

export function StartNextEditionCard({
  catchupId,
  nextOpensAt,
  onChanged,
}: {
  catchupId: string;
  /** When the rhythm would have opened it, ISO. Null on a Catch-up with none set. */
  nextOpensAt: string | null;
  onChanged: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const opens = opensLine(nextOpensAt);

  async function handleStart() {
    const result = await callAction(() => startNextEditionNow(catchupId));
    if (result && "error" in result) return result;
    toast.success("Questions are open for the next Edition.");
    onChanged();
  }

  return (
    <FadeRise delay={0.05}>
      <div className="card-elevated rounded-[var(--radius)] border border-border bg-card p-[var(--space-m)]">
        <div className="flex items-center gap-2">
          {/* The dot every one-way control wears, and the only thing that
              distinguishes this card from the reversible ones above it.

              In a 16px box rather than loose. The three rail cards above this
              lead with an h-4 w-4 lucide icon, so a bare 6px dot in the same
              `gap-2` row started its label at 30px from the card edge against
              their 40px -- a 10px step down the rail, measured. The box keeps
              the labels in one column and the dot on the same centre line
              (25.3px from the card top, the same as Published Editions). */}
          <span className="flex h-4 w-4 shrink-0 items-center justify-center">
            <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-cinnamon" />
          </span>
          <p className="font-sans text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
            The next Edition
          </p>
        </div>

        {/* Not a restatement of the heading: it is the date the button skips. */}
        <p className="mt-[var(--space-s)] font-sans text-[13px] text-muted-foreground">
          {opens ? `Opens ${opens}, on its own.` : "No date is set for the next one."}
        </p>

        <Button
          variant="outline"
          size="sm"
          className="mt-[var(--space-s)] w-full justify-center"
          onClick={() => setConfirming(true)}
        >
          <Sparkle className="h-3.5 w-3.5" />
          Start it now
        </Button>
      </div>

      <ConfirmDialog
        open={confirming}
        onClose={() => setConfirming(false)}
        // Not destructive: nothing is lost, it simply cannot be taken back.
        // The red button is for damage, and this is not damage.
        destructive={false}
        title="Start the next Edition"
        /* Two rows, not one sentence. Spec section 7: a one-way control says
           so "in its own words, on its own row", rather than through a dot and
           a footnote explaining the dot. As one string it landed on its own
           line only because the measure happened to break there. The dot on
           the card is the marker at rest; this is where the meaning is. */
        description={
          <>
            <span className="block">Questions open straight away and everyone is told.</span>
            <span className="mt-1 block font-semibold text-foreground">Cannot be undone.</span>
          </>
        }
        actionLabel="Start it now"
        onConfirm={handleStart}
      />
    </FadeRise>
  );
}
