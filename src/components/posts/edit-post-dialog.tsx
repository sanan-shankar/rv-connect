"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RichTextArea } from "@/components/common/rich-text-area";
import { toast } from "sonner";
import { callAction } from "@/lib/call-action";
import { editPost } from "@/app/(main)/feed/actions";

/* The QUICK edit: a short interaction for a published post or letter's text.
 * Drafts are letters mid-write and go to the whole-page desk at
 * /letters/[id]/edit instead (owner, 2026-07-30: the dialog register is for
 * things that take seconds, never for writing). */
export function EditPostDialog({
  postId,
  kind = "post",
  initialContent,
  initialTitle,
  open,
  onClose,
  onSaved,
}: {
  postId: string;
  kind?: string;
  initialContent: string;
  initialTitle?: string | null;
  open: boolean;
  onClose: () => void;
  /** What was saved, handed back so the card on screen can show it. The lists
   *  that render PostCard hold their posts in client state, so revalidatePath
   *  alone leaves the old words up until the member navigates away and back
   *  (bug audit B-041). */
  onSaved?: (next: { content: string; title: string | null }) => void;
}) {
  const isLetter = kind === "letter";
  const [content, setContent] = useState(initialContent);
  const [title, setTitle] = useState(initialTitle ?? "");
  const [submitting, setSubmitting] = useState(false);

  function buildFormData() {
    const formData = new FormData();
    formData.set("content", content);
    if (isLetter && title.trim()) formData.set("title", title.trim());
    return formData;
  }

  async function handleSubmit() {
    if (!content.trim()) return;
    setSubmitting(true);
    try {
      const saveResult = await callAction(() => editPost(postId, buildFormData()));
      if (saveResult.error) {
        toast.error(saveResult.error);
        return;
      }
      toast.success(isLetter ? "Letter updated" : "Post updated");
      // A plain post's title column is not written by editPost, so mirroring
      // null here would blank something the server kept.
      onSaved?.({ content, title: isLetter ? title.trim() || null : (initialTitle ?? null) });
      onClose();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isLetter ? "Edit letter" : "Edit post"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {isLetter && (
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Title your letter"
              maxLength={160}
              className="w-full bg-transparent font-heading text-xl font-bold tracking-[-0.01em] text-foreground placeholder:font-normal placeholder:text-muted-foreground focus:outline-none"
            />
          )}
          {/* The same live-formatting surface as the composer that wrote the
              post: editing used to reopen a plain textarea, which put the raw
              **markers** in front of exactly the person who typed them as
              Bold. Remounts per open so a reopened dialog starts from the
              post's current text. */}
          <RichTextArea
            key={open ? postId : `${postId}-closed`}
            initialValue={initialContent}
            onChange={setContent}
            ariaLabel={isLetter ? "Edit your letter" : "Edit your post"}
            className="rounded-[var(--radius-input)] border border-border bg-card px-3.5 py-3 text-base leading-[1.7]"
            minHeight={isLetter ? 240 : 120}
          />

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!content.trim() || submitting}
              variant="primary"
            >
              {submitting ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
