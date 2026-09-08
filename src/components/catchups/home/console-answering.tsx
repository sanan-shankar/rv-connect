"use client";

/* ------------------------------------------------------------------ *
 *  <ConsoleAnswering> - the console while an Edition is answering
 *  (spec 3.3): how many people have shared, the "Answer now" pill, and
 *  the frozen question list. No answer content is readable by anyone,
 *  Keeper included, until the Edition publishes.
 *
 *  Same shape as the collecting console (owner review 2026-07-25). The
 *  countdown sits beside the Catch-up name in the page heading, so the
 *  first tile aligns with the first tile in the right rail.
 *
 *  DEFERRED, flagged per the fix brief section 6: answering still hands
 *  off to /catchups/[catchupId]/answer instead of running inline here.
 *  The published Edition already reads inline (console-published.tsx);
 *  moving the whole answer experience in is the larger lift and the
 *  brief says to do the published case first rather than half-do both.
 * ------------------------------------------------------------------ */

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Megaphone } from "lucide-react";
import { toast } from "sonner";
import { callAction } from "@/lib/call-action";
import { Button } from "@/components/ui/button";
import { FadeRise } from "@/components/common/motion";
import { closeAndPublish, nudgeGroup } from "@/app/(main)/catchups/actions";
import type { CatchupHomeData, HomeEditionView } from "./types";
import { QuestionRow } from "./question-row";

/** Same tile shape as the rest of the Catch-up home: one token, all four sides. */
const TILE = "card-elevated rounded-[var(--radius)] border border-border bg-card p-[var(--space-m)]";

export function ConsoleAnswering({
  data,
  edition,
  onChanged,
}: {
  data: CatchupHomeData;
  edition: HomeEditionView;
  onChanged: () => void;
}) {
  return (
    <div className="space-y-[var(--space-m)]">
      <FadeRise>
        <div className={TILE}>
          <div className="flex flex-wrap items-center justify-between gap-[var(--space-m)]">
            {/* The progress count and the avatar cluster that used to sit here
                moved into the rail's people panel (2026-08-05), where the same
                faces are shown at every status instead of appearing only
                during answering. Printing "N of M have shared" in both places
                is the duplication the 2026-07-25 review deleted a tile for. */}
            <p className="min-w-0 text-sm font-semibold text-foreground">
              Answers are open.
            </p>
            <Link href={`/catchups/${data.catchupId}/answer`}>
              <Button variant="primary" size="lg">
                Answer now
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>

          {data.viewer.isKeeper && (
            <KeeperAnsweringActions editionId={edition.id} onChanged={onChanged} />
          )}
        </div>
      </FadeRise>

      <FadeRise delay={0.04}>
        <div className={TILE}>
          <p className="text-sm font-semibold text-foreground">
            {edition.prompts.length}{" "}
            {edition.prompts.length === 1 ? "question" : "questions"} in this Edition
          </p>
          <div className="mt-[var(--space-s)] space-y-[var(--space-xs)]">
            {edition.prompts.map((p) => (
              <QuestionRow key={p.id} prompt={p} />
            ))}
          </div>
        </div>
      </FadeRise>
    </div>
  );
}

/** The Keeper's two answering-window actions, kept in the console rather than
 *  in a box of their own (owner review 2026-07-25). */
function KeeperAnsweringActions({
  editionId,
  onChanged,
}: {
  editionId: string;
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState(false);

  async function handleNudge() {
    setBusy(true);
    try {
      const result = await callAction(() => nudgeGroup(editionId));
      if (result && "error" in result) {
        toast.error(result.error);
        return;
      }
      toast.success("Nudged everyone who has not answered.");
      onChanged();
    } finally {
      // finally, not a trailing statement: a rejected call used to leave
      // both buttons here disabled for the rest of the session (audit B-042).
      setBusy(false);
    }
  }

  async function handleClose() {
    setBusy(true);
    try {
      const result = await callAction(() => closeAndPublish(editionId));
      if (result && "error" in result) {
        toast.error(result.error);
        return;
      }
      // The too-few-answers rule (spec 2.6) can extend the window instead of
      // closing it. Say which one happened rather than a blanket success.
      toast.success(
        "extended" in result && result.extended && "message" in result && result.message
          ? String(result.message)
          : "The Edition is out. Everyone has been told."
      );
      onChanged();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-[var(--space-m)] flex flex-wrap gap-[var(--space-s)] border-t border-border pt-[var(--space-m)]">
      <Button variant="outline" size="sm" disabled={busy} onClick={handleNudge}>
        <Megaphone className="h-3.5 w-3.5" />
        Nudge the group
      </Button>
      <Button variant="outline" size="sm" disabled={busy} onClick={handleClose}>
        Close and publish now
        <ArrowRight className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
