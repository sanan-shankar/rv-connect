"use client";

import { useState } from "react";
import { Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { reportUser } from "@/components/posts/report-action";

const REASONS = [
  "This person isn't who they claim to be",
  "Not a Rishi Valley alumnus or teacher",
  "Impersonation",
  "Other",
];

export function FlagPersonDialog({ userId, name }: { userId: string; name: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState(REASONS[0]);
  const [detail, setDetail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    setSubmitting(true);
    const full = detail.trim() ? `${reason}: ${detail.trim()}` : reason;
    const result = await reportUser(userId, full);
    setSubmitting(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Thank you. An admin will take a look.");
    setOpen(false);
    setDetail("");
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        // Hover stays the semantic red ink (no neutral state layer under a
        // colour that is already saying something). It was missing a press
        // answer entirely, hence the active sink.
        className="inline-flex items-center gap-1.5 rounded-full border border-border py-1.5 pl-2.5 pr-3 text-[13px] font-medium text-muted-foreground transition-[colors,transform] duration-150 hover:text-destructive active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <Flag className="h-3.5 w-3.5" />
        Flag
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Flag {name}</DialogTitle>
            <DialogDescription>
              For identity concerns only. An admin reviews every flag.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
          <div className="space-y-1.5">
            {REASONS.map((r) => (
              <label key={r} className="flex items-center gap-2.5 text-sm text-foreground">
                <input
                  type="radio"
                  name="flag-reason"
                  checked={reason === r}
                  onChange={() => setReason(r)}
                  className="accent-leaf"
                />
                {r}
              </label>
            ))}
          </div>
            <Textarea
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
              placeholder="Anything else that helps (optional)"
              rows={3}
              maxLength={400}
            />
            {/* The material's one footer shape: a right-aligned Cancel + action
                row. Destructive variant is this dialog's semantics, not a
                different template. */}
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={submitting} variant="destructive">
                {submitting ? "Sending..." : "Send flag"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
