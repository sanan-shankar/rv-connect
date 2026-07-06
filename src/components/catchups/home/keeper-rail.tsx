"use client";

/* ------------------------------------------------------------------ *
 *  <KeeperRail> - the right-rail Keeper controls (spec 3.3, Keeper or
 *  group admin only): the status-appropriate early transition, "Nudge
 *  the group", a quick "add from library", and Settings (cadence,
 *  Pause/Resume/End). Rendered whenever the viewer is the effective
 *  Keeper, independent of the live console (so Settings stays reachable
 *  even while paused or ended).
 * ------------------------------------------------------------------ */

import { useState } from "react";
import { Megaphone, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FadeRise } from "@/components/common/motion";
import {
  closeAndPrepare,
  nudgeGroup,
  openAnswering,
  publishNow,
  submitPrompt,
} from "@/app/(main)/catchups/actions";
import type { PromptCategory } from "@/lib/catchups-types";
import { LibraryPickerDialog } from "./library-picker-dialog";
import { KeeperSettingsDialog } from "./keeper-settings-dialog";
import type { CatchupHomeData, HomeEditionView } from "./types";

export function KeeperRail({
  data,
  edition,
  onChanged,
}: {
  data: CatchupHomeData;
  edition: HomeEditionView | null;
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const live = data.catchupStatus === "active" && edition;

  async function run<T extends { error?: string }>(action: () => Promise<T>, success: string) {
    setBusy(true);
    const result = await action();
    setBusy(false);
    if (result && "error" in result && result.error) {
      toast.error(result.error);
      return;
    }
    toast.success(success);
    onChanged();
  }

  async function handleAddFromLibrary(text: string, category: string) {
    if (!edition) return;
    const result = await submitPrompt({
      editionId: edition.id,
      text,
      category: category as PromptCategory,
      showAsker: true,
    });
    if (result && "error" in result) {
      toast.error(result.error);
      return;
    }
    toast.success("Added to the Round.");
    onChanged();
  }

  return (
    <FadeRise>
      <div className="card-elevated rounded-[var(--radius)] border border-border bg-card p-5">
        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
          Keeper controls
        </p>

        <div className="mt-3 space-y-2">
          {live && edition.status === "collecting" && (
            <>
              <Button
                variant="primary"
                className="w-full justify-center"
                disabled={busy}
                onClick={() => run(() => openAnswering(edition.id), "Answering is open.")}
              >
                Open answering now
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
              <LibraryPickerDialog
                sets={data.promptLibrary}
                onPick={handleAddFromLibrary}
                triggerLabel="Add a question from the library"
                triggerVariant="outline"
                triggerSize="default"
              />
            </>
          )}

          {live && edition.status === "answering" && (
            <>
              <Button
                variant="outline"
                className="w-full justify-center border-canopy/50 text-canopy hover:bg-canopy/10"
                disabled={busy}
                onClick={() => run(() => closeAndPrepare(edition.id), "Closing and preparing the Round.")}
              >
                Close and prepare now
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="outline"
                className="w-full justify-center"
                disabled={busy}
                onClick={() => run(() => nudgeGroup(edition.id), "Nudged everyone who hasn't answered.")}
              >
                <Megaphone className="h-3.5 w-3.5" />
                Nudge the group
              </Button>
            </>
          )}

          {live && edition.status === "preparing" && (
            <Button
              variant="primary"
              className="w-full justify-center"
              disabled={busy}
              onClick={() => run(() => publishNow(edition.id), "Round published.")}
            >
              Publish now
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          )}

          {live && edition.status === "published" && (
            <p className="text-xs leading-relaxed text-muted-foreground">
              This Round is live. The next one opens on its own rhythm.
            </p>
          )}

          {!live && (
            <p className="text-xs leading-relaxed text-muted-foreground">
              {data.catchupStatus === "ended"
                ? "This Catch-up has ended."
                : "This Catch-up is paused. Resume it above to pick the rhythm back up."}
            </p>
          )}
        </div>

        <div className="mt-4 border-t border-border pt-4">
          <KeeperSettingsDialog
            catchupId={data.catchupId}
            cadence={data.cadence}
            catchupStatus={data.catchupStatus}
            onChanged={onChanged}
          />
        </div>
      </div>
    </FadeRise>
  );
}
