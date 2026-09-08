"use client";

/* ------------------------------------------------------------------ *
 *  <KeeperSettingsDialog> - cadence, Pause/Resume, End (spec 3.3
 *  Keeper settings). Cadence options are a local literal (not imported
 *  from `@/lib/catchups`) so this client component never pulls that
 *  module's lazy-loaded Prisma/notify code paths into the browser
 *  bundle - see the ownership note in `home/types.ts`.
 * ------------------------------------------------------------------ */

import { useState } from "react";
import { ChevronRight, PauseCircle, PlayCircle, Settings2, XOctagon } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { callAction } from "@/lib/call-action";
import { m } from "motion/react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { EASE_SEGMENT_GLIDE, SEGMENT_GLIDE_SECONDS } from "@/components/common/motion";
import { cn } from "@/lib/utils";
import { endCatchup, pauseCatchup, resumeCatchup, updateCatchupCadence } from "@/app/(main)/catchups/actions";
import { PicturePickerDialog } from "./picture-picker-dialog";
import type { Cadence, CatchupStatus } from "@/lib/catchups-types";

const CADENCE_OPTIONS: Array<{ value: Cadence; label: string }> = [
  { value: "biweekly", label: "Biweekly" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
];

export function KeeperSettingsDialog({
  catchupId,
  cadence,
  catchupStatus,
  picture,
  isKeeper,
  canChangePicture,
  onChanged,
}: {
  catchupId: string;
  cadence: Cadence;
  catchupStatus: CatchupStatus;
  picture: { src: string; focus: string };
  /** Holds the Keeper's controls: the rhythm, pause, end. */
  isKeeper: boolean;
  /** Wider than `isKeeper`, and deliberately: on a batch Catch-up anyone in
   *  the batch may replace the picture (his answer to owner question 18),
   *  because it is reversible and nobody keeps one. Batch Catch-ups arrive in
   *  build phase 4, so today the two are the same boolean; this is what stops
   *  that phase having to come back and unpick this component. */
  canChangePicture: boolean;
  onChanged: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [pickingPicture, setPickingPicture] = useState(false);
  const [busy, setBusy] = useState(false);
  const [localCadence, setLocalCadence] = useState(cadence);

  async function handleCadence(value: Cadence) {
    if (value === localCadence) return;
    setLocalCadence(value);
    const result = await callAction(() => updateCatchupCadence(catchupId, value));
    if (result && "error" in result) {
      toast.error(result.error);
      setLocalCadence(cadence);
      return;
    }
    toast.success("Rhythm updated.");
    onChanged();
  }

  async function handlePauseResume() {
    setBusy(true);
    try {
      const result = await callAction(() =>
        catchupStatus === "paused" ? resumeCatchup(catchupId) : pauseCatchup(catchupId)
      );
      if (result && "error" in result) {
        toast.error(result.error);
        return;
      }
      toast.success(catchupStatus === "paused" ? "Catch-up resumed." : "Catch-up paused.");
      onChanged();
      setOpen(false);
    } finally {
      // finally, not a trailing statement: a rejected call used to leave
      // this button disabled for the rest of the session (audit B-042).
      setBusy(false);
    }
  }

  const [confirmingEnd, setConfirmingEnd] = useState(false);

  async function handleEnd() {
    setBusy(true);
    try {
      const result = await callAction(() => endCatchup(catchupId));
      if (result && "error" in result) {
        toast.error(result.error);
        return;
      }
      toast.success("Catch-up ended.");
      onChanged();
      setOpen(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="ghost" size="sm" className="w-full justify-center" />}>
        <Settings2 className="h-3.5 w-3.5" />
        Settings
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-heading tracking-tight">Catch-up settings</DialogTitle>
          <DialogDescription>
            {isKeeper
              ? "Change the picture or the rhythm, or pause / end this Catch-up."
              : "Change this Catch-up's picture."}
          </DialogDescription>
        </DialogHeader>

        {/* The picture, first, because it is the only row here that is not a
            decision about the clock -- and on a batch Catch-up it is the only
            row at all. The thumbnail IS the value: a settings row whose value
            is a photograph shows the photograph. */}
        {canChangePicture && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              Picture
            </p>
            <button
              type="button"
              onClick={() => setPickingPicture(true)}
              className="group relative mt-2 block w-full overflow-hidden rounded-[var(--radius)] bg-mist transition-[box-shadow] duration-150 hover:shadow-[0_0_0_2px_var(--color-canopy)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              style={{ aspectRatio: "5 / 2" }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- a public
                  path or an R2 url interchangeably, drawn once in a dialog. */}
              <img
                src={picture.src}
                alt=""
                className="h-full w-full object-cover"
                style={{ objectPosition: picture.focus }}
              />
              <span className="absolute bottom-2 right-2 flex items-center gap-0.5 rounded-full bg-foreground/60 py-1 pl-2.5 pr-1.5 text-xs font-medium text-background backdrop-blur-sm">
                Change
                <ChevronRight className="h-3.5 w-3.5" strokeWidth={2} />
              </span>
            </button>
            <p className="mt-1.5 text-xs text-muted-foreground">
              Pick one of ours, or use your own.
            </p>
          </div>
        )}

        {isKeeper && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Rhythm
          </p>
          <div className="relative mt-2 grid grid-cols-3 gap-1 rounded-full border border-border bg-muted/40 p-1">
            {CADENCE_OPTIONS.map((opt) => {
              const selected = localCadence === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  aria-pressed={selected}
                  disabled={catchupStatus === "ended"}
                  onClick={() => handleCadence(opt.value)}
                  className={cn(
                    "relative rounded-full px-2 py-1.5 text-[12.5px] font-medium transition-colors duration-150 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                    selected ? "text-canopy" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {selected && (
                    <m.span
                      layoutId="catchupCadenceThumb"
                      className="absolute inset-0 z-0 rounded-full border border-canopy bg-canopy/10"
                      // Not SegmentedPills: same canopy-tint OUTLINE treatment as
                      // reminder-pref-control.tsx, not the fill look the shared
                      // component draws, and out of the owner's 2026-08-02 scope.
                      // Same no-bounce curve regardless.
                      transition={{ duration: SEGMENT_GLIDE_SECONDS, ease: EASE_SEGMENT_GLIDE }}
                    />
                  )}
                  <span className="relative z-10">{opt.label}</span>
                </button>
              );
            })}
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground">You can change this anytime.</p>
        </div>
        )}

        {/* The two actions are one group, and whitespace is what says so.
            The menu rule -- destructive last, under a DropdownMenuSeparator --
            exists because menu rows are flush: there the hairline IS the gap
            it calls the warning (DESIGN-SYSTEM.md, the item level). A dialog
            row already has 16px around it and these two rows are outlined
            pills, so the line was a third horizontal edge between two button
            borders. Gap instead: 24px above the group, 12px inside it. */}
        {isKeeper && catchupStatus !== "ended" && (
          <div className="mt-2 flex flex-col gap-3">
            <Button
              variant="outline"
              className="w-full justify-center"
              disabled={busy}
              onClick={handlePauseResume}
            >
              {catchupStatus === "paused" ? (
                <>
                  <PlayCircle className="h-4 w-4" />
                  Resume this Catch-up
                </>
              ) : (
                <>
                  <PauseCircle className="h-4 w-4" />
                  Pause this Catch-up
                </>
              )}
            </Button>
            <Button
              variant="destructive"
              className="w-full justify-center"
              disabled={busy}
              onClick={() => setConfirmingEnd(true)}
            >
              <XOctagon className="h-4 w-4" />
              End this Catch-up
            </Button>
          </div>
        )}
      </DialogContent>

      <PicturePickerDialog
        open={pickingPicture}
        onOpenChange={setPickingPicture}
        catchupId={catchupId}
        picture={picture}
        onChanged={onChanged}
      />

      <ConfirmDialog
        open={confirmingEnd}
        onClose={() => setConfirmingEnd(false)}
        title="End catch-up"
        description="Past Editions stay readable, but no new one will open."
        actionLabel="End catch-up"
        onConfirm={handleEnd}
      />
    </Dialog>
  );
}
