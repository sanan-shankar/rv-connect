"use client";

/* ------------------------------------------------------------------ *
 *  <ConsoleAnswering> - the console while a Round is answering
 *  (spec 3.3): how many people have shared, the "Answer now" pill, and
 *  the frozen question list. No answer content is readable by anyone,
 *  Keeper included, until the Round publishes.
 *
 *  Same shape as the collecting console (owner review 2026-07-25). The
 *  countdown sits beside the Catch-up name in the page heading, so the
 *  first tile aligns with the first tile in the right rail.
 *
 *  DEFERRED, flagged per the fix brief section 6: answering still hands
 *  off to /catchups/[catchupId]/answer instead of running inline here.
 *  The published Round already reads inline (console-published.tsx);
 *  moving the whole answer experience in is the larger lift and the
 *  brief says to do the published case first rather than half-do both.
 * ------------------------------------------------------------------ */

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Megaphone } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { BirdAvatar } from "@/components/common/bird-avatar";
import { FadeRise } from "@/components/common/motion";
import { closeAndPrepare, nudgeGroup } from "@/app/(main)/catchups/actions";
import type { CatchupHomeData, HomeEditionView } from "./types";

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
            {edition.prompts.length === 1 ? "question" : "questions"} in this round
          </p>
          <div className="mt-[var(--space-s)] space-y-[var(--space-xs)]">
            {edition.prompts.map((p) => (
              <div
                key={p.id}
                className="flex items-start gap-2.5 rounded-[var(--radius-md)] border border-border/70 bg-background/40 p-[var(--space-s)]"
              >
                {p.author ? (
                  <BirdAvatar user={p.author} size={28} />
                ) : (
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground">
                    ?
                  </span>
                )}
                <div className="min-w-0">
                  <p className="text-sm leading-snug text-foreground">{p.text}</p>
                  <p className="mt-1 text-[11px] font-medium text-muted-foreground">
                    {p.isOwn
                      ? "asked by you"
                      : p.author
                        ? `asked by ${p.author.name}`
                        : "asked anonymously"}
                  </p>
                </div>
              </div>
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
    const result = await nudgeGroup(editionId);
    setBusy(false);
    if (result && "error" in result) {
      toast.error(result.error);
      return;
    }
    toast.success("Nudged everyone who has not answered.");
    onChanged();
  }

  async function handleClose() {
    setBusy(true);
    const result = await closeAndPrepare(editionId);
    setBusy(false);
    if (result && "error" in result) {
      toast.error(result.error);
      return;
    }
    // The too-few-answers rule (spec 2.6) can extend the window instead of
    // closing it. Say which one happened rather than a blanket success.
    toast.success(
      "extended" in result && result.extended && "message" in result && result.message
        ? String(result.message)
        : "Closing the round. Answers are sealed until it publishes."
    );
    onChanged();
  }

  return (
    <div className="mt-[var(--space-m)] flex flex-wrap gap-[var(--space-s)] border-t border-border pt-[var(--space-m)]">
      <Button variant="outline" size="sm" disabled={busy} onClick={handleNudge}>
        <Megaphone className="h-3.5 w-3.5" />
        Nudge the group
      </Button>
      <Button variant="outline" size="sm" disabled={busy} onClick={handleClose}>
        Close answering now
        <ArrowRight className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
