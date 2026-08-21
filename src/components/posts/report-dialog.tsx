"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
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
import { callAction } from "@/lib/call-action";
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
    try {
      const fullReason = details ? `${reason}: ${details}` : reason;
      const result = await callAction(() => reportPost(postId, fullReason));
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Report submitted. Thank you.");
        onClose();
      }
    } finally {
      // finally, not a trailing statement: a rejected call used to leave
      // "Submit report" disabled for the rest of the session (audit B-042).
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Report post</DialogTitle>
          <DialogDescription>
            Help us keep the community safe. Tell us why you&apos;re reporting
            this post.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
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
              {submitting ? "Submitting..." : "Submit report"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
