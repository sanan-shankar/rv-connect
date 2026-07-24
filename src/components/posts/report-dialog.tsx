"use client";

import { useState } from "react";
import { ReportModal } from "@/components/common/report-modal";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { reportPost } from "./report-action";

export function ReportDialog({
  postId,
  open,
  onClose,
}: {
  postId: string;
  open: boolean;
  onClose: () => void;
}) {
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!reason) {
      toast.error("Please select a reason");
      return;
    }
    setSubmitting(true);
    const fullReason = details ? `${reason}: ${details}` : reason;
    const result = await reportPost(postId, fullReason);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Report submitted. Thank you.");
      onClose();
    }
    setSubmitting(false);
  }

  return (
    <ReportModal
      open={open}
      onClose={onClose}
      labelledBy="report-post-title"
      describedBy="report-post-description"
    >
      <div className="flex flex-col gap-2">
        <h2 id="report-post-title" className="font-heading text-base font-medium leading-none">
          Report Post
        </h2>
        <p id="report-post-description" className="text-sm text-muted-foreground">
          Help us keep the community safe. Tell us why you&apos;re reporting
          this post.
        </p>
      </div>
      <div className="mt-4 space-y-4">
        <Select value={reason} onValueChange={(v) => setReason(v ?? "")}>
          <SelectTrigger>
            <SelectValue placeholder="Select a reason" />
          </SelectTrigger>
          {/* The shared Select's popup defaults to `w-(--anchor-width)` (matches the
              trigger's own width) with a 144px floor. The trigger here is only ever
              as wide as its placeholder/current value, which is narrower than the
              longest reason ("Inappropriate content") -- so that text was overflowing
              its item's right-side padding (reserved for the check icon), landing
              almost flush against the popup's edge while the left padding stayed
              intact. `w-max` sizes the popup to its widest item instead, and
              `min-w-(--anchor-width)` keeps it from ever rendering narrower than the
              trigger once a long reason is selected. Paired with `pl-8` (matching the
              existing `pr-8` reserved for the check icon) on every item below, so the
              left/right padding around the text reads even instead of the check-icon
              gutter only existing on one side. Scoped to this dialog via className,
              not a change to the shared primitive. */}
          <SelectContent className="w-max min-w-(--anchor-width)">
            <SelectItem value="Inappropriate content" className="pl-8">
              Inappropriate content
            </SelectItem>
            <SelectItem value="Spam" className="pl-8">Spam</SelectItem>
            <SelectItem value="Harassment" className="pl-8">Harassment</SelectItem>
            <SelectItem value="Other" className="pl-8">Other</SelectItem>
          </SelectContent>
        </Select>

        <Textarea
          placeholder="Additional details (optional)"
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          maxLength={500}
          rows={3}
        />

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!reason || submitting}
            variant="primary"
          >
            {submitting ? "Submitting..." : "Submit Report"}
          </Button>
        </div>
      </div>
    </ReportModal>
  );
}
