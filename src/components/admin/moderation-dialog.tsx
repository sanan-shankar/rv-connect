"use client";

import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { ReportModal } from "@/components/common/report-modal";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

/**
 * Shared admin removal dialog for posts, letters, comments, and Collection
 * photos: one card/row affordance, one confirm flow. The optional note is
 * relayed to the author as a Notification (type "admin_note") that opens the
 * dedicated /notice/[id] page -- see adminRemovePost / adminRemoveComment /
 * adminRemovePhoto. Kept deliberately plain: no shaming tone, no destructive
 * red chrome (this is a moderation tool, not a punishment screen).
 */
export function ModerationDialog({
  open,
  onClose,
  itemLabel,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  /** e.g. "post", "letter", "comment", "photo" -- used in the copy. */
  itemLabel: string;
  onConfirm: (note: string) => Promise<{ error?: string } | void>;
}) {
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleConfirm() {
    setSubmitting(true);
    const result = await onConfirm(note.trim());
    setSubmitting(false);
    if (result && "error" in result && result.error) {
      toast.error(result.error);
      return;
    }
    toast.success(`Removed that ${itemLabel}.`);
    setNote("");
    onClose();
  }

  function handleClose() {
    if (submitting) return;
    setNote("");
    onClose();
  }

  return (
    <ReportModal
      open={open}
      onClose={handleClose}
      labelledBy="moderation-dialog-title"
      describedBy="moderation-dialog-description"
    >
      <div className="flex items-start gap-2.5">
        {/* Sky: the cool administrative register (colour protocol's chip trio;
            the old canopy/10 grey-sage pairing is dead). */}
        <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full border border-sky/35 bg-sky/[0.10] text-sky">
          <ShieldCheck className="size-4" strokeWidth={1.9} />
        </span>
        <div className="flex flex-col gap-1">
          <h2
            id="moderation-dialog-title"
            className="font-heading text-base font-medium leading-tight"
          >
            Remove this {itemLabel}
          </h2>
          <p id="moderation-dialog-description" className="text-sm text-muted-foreground">
            It comes down for everyone right away. You can let the author know why, warmly --
            this is optional.
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-4">
        <Textarea
          placeholder="Add a short note to the author (optional) -- e.g. asking them not to share that type of content again"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={500}
          rows={3}
        />

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={handleClose} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleConfirm} disabled={submitting}>
            {submitting ? "Removing..." : `Remove ${itemLabel}`}
          </Button>
        </div>
      </div>
    </ReportModal>
  );
}
