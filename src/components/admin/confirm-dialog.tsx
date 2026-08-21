"use client";

import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { callAction } from "@/lib/call-action";

/* ------------------------------------------------------------------ *
 *  The one confirmation in the panel.
 *
 *  It exists because the old panel asked `window.confirm("Delete this user
 *  permanently?")` in two places. That is the browser's chrome, not the
 *  app's: no warm scrim, no radius ladder, no focus ring, and no way to say
 *  WHICH user, which is the one thing a confirmation for an irreversible act
 *  has to say.
 *
 *  It follows the dialog material exactly (ui/dialog owns the backdrop, the
 *  panel and the one footer shape). `confirmWord` adds a typed confirmation
 *  where a mis-click cannot be undone; where it is merely inconvenient, a
 *  plain button is enough and asking somebody to type is theatre.
 * ------------------------------------------------------------------ */

export function ConfirmDialog({
  open,
  onClose,
  title,
  description,
  actionLabel,
  confirmWord,
  destructive = true,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description: React.ReactNode;
  actionLabel: string;
  /** Require this to be typed before the action unlocks. Irreversible only. */
  confirmWord?: string;
  destructive?: boolean;
  onConfirm: () => Promise<{ error?: string } | void>;
}) {
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);

  const unlocked = !confirmWord || typed.trim() === confirmWord;

  function close() {
    if (busy) return;
    setTyped("");
    onClose();
  }

  async function run() {
    if (!unlocked) return;
    setBusy(true);
    try {
      // callAction: several admin actions passed in as `onConfirm` REJECT
      // rather than returning { error } (audit M65) -- without this, that
      // threw straight out of here and left the dialog stuck on "Working..."
      // forever, with no error shown and no way to close it (audit B-042).
      const result = await callAction(() => onConfirm());
      if (result && "error" in result && result.error) {
        toast.error(result.error);
        return;
      }
      setTyped("");
      onClose();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent>
        <div className="flex items-start gap-2.5">
          <span
            className={
              destructive
                ? "mt-0.5 grid size-7 shrink-0 place-items-center rounded-full border border-destructive/35 bg-destructive/[0.10] text-destructive"
                : "mt-0.5 grid size-7 shrink-0 place-items-center rounded-full border border-sky/35 bg-sky/[0.10] text-sky"
            }
          >
            <AlertTriangle className="size-4" strokeWidth={1.9} />
          </span>
          <div className="flex flex-col gap-1">
            <DialogTitle className="leading-tight">{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </div>
        </div>

        <div className="space-y-4">
          {confirmWord && (
            <div className="space-y-1.5">
              <label
                htmlFor="confirm-word"
                className="block text-[12.5px] text-muted-foreground"
              >
                Type <span className="font-semibold text-foreground">{confirmWord}</span> to
                confirm
              </label>
              <Input
                id="confirm-word"
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                autoComplete="off"
                spellCheck={false}
              />
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={close} disabled={busy}>
              Cancel
            </Button>
            <Button
              variant={destructive ? "destructive" : "primary"}
              onClick={run}
              disabled={busy || !unlocked}
            >
              {busy ? "Working..." : actionLabel}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
