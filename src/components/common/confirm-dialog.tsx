"use client";

import { useState } from "react";
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
 *
 *  It lived under `admin/` until 2026-08-21, when the Catch-up bin needed the
 *  same "are you sure" and there was no reason for a member surface to reach
 *  into the admin folder for a dialog with nothing admin about it.
 *
 *  No caution triangle any more (2026-08-29). Apple's rule: the warning
 *  symbol marks destruction somebody did NOT choose; a member who pressed
 *  Delete chose this, and the red button and the title already carry it.
 *  The icon was one more element saying what two others said.
 *
 *  `description` went optional the same day: Carbon's test is that a
 *  description exists only if it changes which button you press. "Unblock
 *  member" needs no second line, and an empty <p> under a title is worse
 *  than none. Anti-drift: this component is THE confirmation -- the eight
 *  `window.confirm` call sites it replaced are pinned deleted by
 *  confirm-dialog.test.mjs.
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
  description?: React.ReactNode;
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
        <div className="flex flex-col gap-1 pr-8">
          <DialogTitle className="leading-tight">{title}</DialogTitle>
          {description != null && <DialogDescription>{description}</DialogDescription>}
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
