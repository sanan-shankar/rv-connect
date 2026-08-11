"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EMAIL_UNVERIFIED } from "@/lib/email-gate-message";
import { resendVerification } from "./email-actions";

/* ------------------------------------------------------------------ *
 *  What an unconfirmed account sees when it tries to post.
 *
 *  The rule is enforced on the server (src/lib/email-verification.ts);
 *  this only makes the refusal legible. It replaces the toast that
 *  would otherwise carry the sentence, because a toast is the wrong
 *  shape for something with a next step in it: it slides away while you
 *  are still reading, and it has nowhere to put the button that fixes
 *  the problem.
 * ------------------------------------------------------------------ */

/**
 * Wraps every gated action's failure path.
 *
 *     const gate = useEmailGate();
 *     ...
 *     if (result.error) {
 *       if (gate.handled(result.error)) return;   // dialog opens, no toast
 *       toast.error(result.error);
 *     }
 *     ...
 *     {gate.dialog}
 *
 * `handled` matches the EXACT sentinel string rather than sniffing for a
 * keyword, so an unrelated error that happens to mention email can never open
 * this by accident.
 */
export function useEmailGate() {
  const [open, setOpen] = useState(false);

  const handled = useCallback((error: string | undefined | null): boolean => {
    if (error !== EMAIL_UNVERIFIED) return false;
    setOpen(true);
    return true;
  }, []);

  return {
    handled,
    dialog: <VerifyEmailDialog open={open} onOpenChange={setOpen} />,
  };
}

export function VerifyEmailDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState("");

  async function handleResend() {
    if (busy) return;
    setBusy(true);
    setFlash("");
    const result = await resendVerification();
    setBusy(false);

    if (!result.ok) {
      setFlash(result.error ?? "That did not work. Try again in a minute.");
      return;
    }
    // The two states get different sentences, because one of them is a lie if
    // you use it for the other: on a day when the queue is backed up there is
    // nothing in their inbox to go and look at yet.
    setFlash(
      result.state === "sent"
        ? `Sent to ${result.sentTo}. Look in spam if it is not there in a minute.`
        : "Written down. We send these in batches, so it may take up to a day to arrive.",
    );
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Confirm your email first</DialogTitle>
          <DialogDescription>
            One click on the link we sent you, and this opens for good.
          </DialogDescription>
        </DialogHeader>

        <p className="text-[13.5px] leading-relaxed text-muted-foreground">
          We ask before anyone posts, uploads a photograph, or looks up how to
          reach somebody. It is what keeps this a room full of people who
          actually went to Rishi Valley, and it is the only way we can get you
          back in if you ever forget your password.
        </p>

        {flash && (
          <p className="flex items-start gap-2 rounded-[var(--radius-md)] border border-leaf/30 bg-leaf/[0.07] px-3.5 py-2.5 text-[13px] leading-relaxed text-foreground">
            <MailCheck className="mt-0.5 h-4 w-4 shrink-0 text-leaf" aria-hidden />
            {flash}
          </p>
        )}

        {/* The material's one footer shape: a right-aligned action row. */}
        <div className="flex justify-end gap-2 pt-1">
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href="/verify-email" />}
          >
            More help
          </Button>
          <Button onClick={handleResend} disabled={busy}>
            {busy ? "Sending..." : "Send it again"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
