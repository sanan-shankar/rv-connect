"use client";

/* ------------------------------------------------------------------ *
 *  <KeeperSettingsDialog> - cadence, Pause/Resume, End (spec 3.3
 *  Keeper settings). Cadence options are a local literal (not imported
 *  from `@/lib/catchups`) so this client component never pulls that
 *  module's lazy-loaded Prisma/notify code paths into the browser
 *  bundle - see the ownership note in `home/types.ts`.
 * ------------------------------------------------------------------ */

import { useState } from "react";
import { PauseCircle, PlayCircle, Settings2, XOctagon } from "lucide-react";
import { toast } from "sonner";
import { motion } from "motion/react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { SPRINGS } from "@/components/common/motion";
import { cn } from "@/lib/utils";
import { endCatchup, pauseCatchup, resumeCatchup, updateCatchupCadence } from "@/app/(main)/catchups/actions";
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
  onChanged,
}: {
  catchupId: string;
  cadence: Cadence;
  catchupStatus: CatchupStatus;
  onChanged: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [localCadence, setLocalCadence] = useState(cadence);

  async function handleCadence(value: Cadence) {
    if (value === localCadence) return;
    setLocalCadence(value);
    const result = await updateCatchupCadence(catchupId, value);
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
    const result =
      catchupStatus === "paused" ? await resumeCatchup(catchupId) : await pauseCatchup(catchupId);
    setBusy(false);
    if (result && "error" in result) {
      toast.error(result.error);
      return;
    }
    toast.success(catchupStatus === "paused" ? "Catch-up resumed." : "Catch-up paused.");
    onChanged();
    setOpen(false);
  }

  async function handleEnd() {
    if (!confirm("End this Catch-up? Past Rounds stay readable, but no new one will open.")) return;
    setBusy(true);
    const result = await endCatchup(catchupId);
    setBusy(false);
    if (result && "error" in result) {
      toast.error(result.error);
      return;
    }
    toast.success("Catch-up ended.");
    onChanged();
    setOpen(false);
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
          <DialogDescription>Change the rhythm, or pause / end this Catch-up.</DialogDescription>
        </DialogHeader>

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
                    "relative rounded-full px-2 py-1.5 text-[12.5px] font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-50",
                    selected ? "text-canopy" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {selected && (
                    <motion.span
                      layoutId="catchupCadenceThumb"
                      className="absolute inset-0 z-0 rounded-full border border-canopy bg-canopy/10"
                      transition={SPRINGS.snappy}
                    />
                  )}
                  <span className="relative z-10">{opt.label}</span>
                </button>
              );
            })}
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground">You can change this anytime.</p>
        </div>

        {catchupStatus !== "ended" && (
          <div className="border-t border-border pt-4">
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
          </div>
        )}

        {catchupStatus !== "ended" && (
          <div className="border-t border-border pt-4">
            <Button
              variant="destructive"
              className="w-full justify-center"
              disabled={busy}
              onClick={handleEnd}
            >
              <XOctagon className="h-4 w-4" />
              End this Catch-up
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
