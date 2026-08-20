"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BadgeCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { requestVerification } from "./verification-actions";

/* ------------------------------------------------------------------ *
 *  What a confirmed-but-unverified account sees when it tries to post
 *  or open someone's contact details: the second gate's card, sibling
 *  to verify-email-dialog.tsx and deliberately the same shape (320px,
 *  a title, one short line, a pill that names what it does). The rule
 *  is enforced on the server (src/lib/member-gate.ts); this makes the
 *  refusal legible and carries the one button that moves it along.
 * ------------------------------------------------------------------ */

export function MemberVerifyDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState("");

  async function handleAsk() {
    if (busy) return;
    setBusy(true);
    setFlash("");
    const result = await requestVerification();
    setBusy(false);

    if (!result.ok) {
      setFlash(result.error);
      return;
    }
    // Two honest outcomes: the roster (or an admin) has already said yes, or
    // the request is now sitting in front of one.
    setFlash(
      result.state === "verified"
        ? "You're verified. Try that again and it will go through."
        : "Done. The admin checks each request personally, so give it a little while."
    );
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[320px]">
        <DialogHeader>
          <DialogTitle>One check left</DialogTitle>
          <DialogDescription>We confirm each member went to Rishi Valley.</DialogDescription>
        </DialogHeader>

        <Button onClick={handleAsk} disabled={busy} className="w-fit">
          {busy ? "Asking..." : "Ask to be verified"}
        </Button>

        {flash && (
          <p className="flex items-start gap-2 rounded-[var(--radius-md)] border border-leaf/30 bg-leaf/[0.07] px-3.5 py-2.5 text-[13px] leading-relaxed text-foreground">
            <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-leaf" aria-hidden />
            {flash}
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
