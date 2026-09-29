"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { callAction } from "@/lib/call-action";
import { changeUnconfirmedEmail } from "./change-email-actions";
import { resendVerification } from "./email-actions";

/* ------------------------------------------------------------------ *
 *  "Use another email": opened from the banner when a confirmation
 *  bounced (docs/spec/email.md Rule 4).
 *
 *  The new address and the password, nothing else. The password is what
 *  authorises it, the same as confirming a deletion: a signed-in device
 *  on its own must not be enough to move an account to someone else's
 *  inbox. Standard bordered inputs, not the auth pages' mist fields,
 *  because this is a dialog like every other dialog.
 * ------------------------------------------------------------------ */

/** What the banner needs to switch state without a reload. Both actions
 *  answer in this shape. */
export type NewLinkState = {
  state?: "sent" | "imminent" | "queued";
  sentTo?: string;
  sendingAt?: string;
  open?: boolean;
};

export function ChangeEmailDialog({
  open,
  onOpenChange,
  retryTo,
  onDone,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The masked old address, when trying it again could work: a FULL mailbox
   *  can be emptied. Absent for an address that refused outright, where a
   *  second try only costs a slot of the day's hundred. */
  retryTo?: string;
  /** `moved` is true when the account now has a new address. */
  onDone: (result: NewLinkState, moved: boolean) => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState<null | "move" | "retry">(null);
  const [error, setError] = useState<string | null>(null);

  async function handleMove(e: React.FormEvent) {
    e.preventDefault();
    if (busy || !email || !password) return;
    setBusy("move");
    setError(null);
    const fd = new FormData();
    fd.set("email", email);
    fd.set("password", password);
    try {
      // callAction: a rejected call must not leave the button on "Sending..."
      // for good (audit B-042).
      const result = await callAction(() => changeUnconfirmedEmail(fd));
      if (!("ok" in result) || !result.ok) {
        setError(result.error ?? "That did not work. Try again in a minute.");
        return;
      }
      setEmail("");
      setPassword("");
      onDone(result, true);
    } finally {
      setBusy(null);
    }
  }

  async function handleRetry() {
    if (busy) return;
    setBusy("retry");
    setError(null);
    try {
      const result = await callAction(() => resendVerification());
      if (!("ok" in result) || !result.ok) {
        setError(result.error ?? "That did not work. Try again in a minute.");
        return;
      }
      onDone(result, false);
    } finally {
      setBusy(null);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          setPassword("");
          setError(null);
        }
        onOpenChange(o);
      }}
    >
      <DialogContent className="sm:max-w-[360px]">
        <DialogHeader>
          <DialogTitle>Use another email</DialogTitle>
          <DialogDescription>
            We&apos;ll send your confirmation link there, and you&apos;ll sign in
            with it from now on.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleMove} className="space-y-[var(--space-s)]">
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            placeholder="New email address"
            aria-label="New email address"
          />
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            placeholder="Your password"
            aria-label="Your password"
          />
          {error && (
            <p role="alert" className="text-[13px] leading-snug text-heart">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy !== null || !email || !password}>
              {busy === "move" ? "Sending..." : "Send the link there"}
            </Button>
          </div>
        </form>

        {retryTo && (
          <p className="text-[13px] leading-snug text-muted-foreground">
            Cleared some space?{" "}
            <button
              type="button"
              onClick={handleRetry}
              disabled={busy !== null}
              className="state-layer rounded-sm font-medium text-foreground underline underline-offset-2 transition-opacity duration-150 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              {busy === "retry" ? "Sending..." : `Send it to ${retryTo} again`}
            </button>
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
