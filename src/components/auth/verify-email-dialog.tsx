"use client";

import { useCallback, useState } from "react";
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
import { sendTimeLabel } from "./verify-email-banner";

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
    // Three states, three sentences, because each is a lie if used for the
    // others: "sent" means the provider accepted it, "imminent" means it is in
    // flight, and only "queued" - the budget genuinely spent - may mention the
    // limit, with the refill time named rather than "up to a day".
    setFlash(
      result.state === "sent"
        ? `Sent to ${result.sentTo}. Check your spam folder if it does not arrive.`
        : result.state === "queued" && result.sendingAt
          ? `We have hit today's email limit. Your link goes out ${sendTimeLabel(result.sendingAt)}.`
          : "Your link is on its way. Give it a minute, then check spam.",
    );
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* The ONE shape every confirm-email refusal takes (owner, 2026-08-18:
          "make all the confirm email alerts... look the same"): a 320px
          card, a title, ONE six-word line that says exactly what to do, and
          a pill that names what it sends. Earlier drafts here failed in both
          directions: a policy paragraph ("overcrowded"), then title+button
          alone ("send WHAT again"). The "More help" button is gone because
          it led to a page whose one function - resending - is this dialog's
          own button. The locked Get-in-touch path renders THIS component,
          so the card cannot drift apart across surfaces. */}
      <DialogContent className="sm:max-w-[320px]">
        <DialogHeader>
          <DialogTitle>Confirm your email first</DialogTitle>
          <DialogDescription>Tap the link we emailed you.</DialogDescription>
        </DialogHeader>

        <Button onClick={handleResend} disabled={busy} className="w-fit">
          {busy ? "Sending..." : "Resend the link"}
        </Button>

        {flash && (
          <p className="flex items-start gap-2 rounded-[var(--radius-md)] border border-leaf/30 bg-leaf/[0.07] px-3.5 py-2.5 text-[13px] leading-relaxed text-foreground">
            <MailCheck className="mt-0.5 h-4 w-4 shrink-0 text-leaf" aria-hidden />
            {flash}
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
