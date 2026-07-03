"use client";

import { useState } from "react";
import { Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ReportModal } from "@/components/common/report-modal";
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
        className="inline-flex items-center gap-1.5 rounded-full border border-border py-1.5 pl-2.5 pr-3 text-[13px] font-medium text-muted-foreground transition-colors hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
      >
        <Flag className="h-3.5 w-3.5" />
        Flag
      </button>

      <ReportModal
        open={open}
        onClose={() => setOpen(false)}
        labelledBy="flag-person-title"
        describedBy="flag-person-description"
      >
        <div className="flex flex-col gap-2">
          <h2 id="flag-person-title" className="font-heading text-xl font-medium leading-none">
            Flag {name}
          </h2>
          <p id="flag-person-description" className="text-sm text-muted-foreground">
            For identity concerns only. An admin reviews every flag.
          </p>
        </div>
        <div className="mt-4 space-y-3">
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
          <textarea
            value={detail}
            onChange={(e) => setDetail(e.target.value)}
            placeholder="Anything else that helps (optional)"
            rows={3}
            maxLength={400}
            className="w-full resize-none rounded-lg border border-border bg-paper px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          />
          <Button onClick={handleSubmit} disabled={submitting} variant="destructive" className="w-full">
            {submitting ? "Sending..." : "Send flag"}
          </Button>
        </div>
      </ReportModal>
    </>
  );
}
