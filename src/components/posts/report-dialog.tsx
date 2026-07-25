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
          {/* Fit the popup to its widest item so "Inappropriate content" never
              truncates against the trigger's narrow width, but no wider: `w-fit`
              plus the shared 144px floor. Standard item padding (same as every
              other Select in the app), so it stays compact, not sprawling. */}
          <SelectContent className="w-fit">
            <SelectItem value="Inappropriate content">Inappropriate content</SelectItem>
            <SelectItem value="Spam">Spam</SelectItem>
            <SelectItem value="Harassment">Harassment</SelectItem>
            <SelectItem value="Other">Other</SelectItem>
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
