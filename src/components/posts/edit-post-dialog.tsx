"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { editPost } from "@/app/(main)/feed/actions";

const TAGS = [
  { value: "campus-memory", label: "Campus Memory" },
  { value: "life-update", label: "Life Update" },
  { value: "looking-for-connections", label: "Looking for Connections" },
  { value: "photo", label: "Photo" },
  { value: "general", label: "General" },
];

/* The QUICK edit: a short interaction for a published post or letter's text.
 * Drafts are letters mid-write and go to the whole-page desk at
 * /letters/[id]/edit instead (owner, 2026-07-30: the dialog register is for
 * things that take seconds, never for writing). */
export function EditPostDialog({
  postId,
  kind = "post",
  initialContent,
  initialTitle,
  initialTag,
  open,
  onClose,
}: {
  postId: string;
  kind?: string;
  initialContent: string;
  initialTitle?: string | null;
  initialTag: string | null;
  open: boolean;
  onClose: () => void;
}) {
  const isLetter = kind === "letter";
  const [content, setContent] = useState(initialContent);
  const [title, setTitle] = useState(initialTitle ?? "");
  const [tag, setTag] = useState(initialTag);
  const [submitting, setSubmitting] = useState(false);

  function buildFormData() {
    const formData = new FormData();
    formData.set("content", content);
    if (isLetter) {
      if (title.trim()) formData.set("title", title.trim());
    } else if (tag) {
      formData.set("tag", tag);
    }
    return formData;
  }

  async function handleSubmit() {
    if (!content.trim()) return;
    setSubmitting(true);
    try {
      const saveResult = await editPost(postId, buildFormData());
      if (saveResult.error) {
        toast.error(saveResult.error);
        return;
      }
      toast.success(isLetter ? "Letter updated" : "Post updated");
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
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            maxLength={isLetter ? 20000 : 5000}
            rows={isLetter ? 10 : 5}
          />

          {!isLetter && (
            <div className="flex flex-wrap gap-2">
              {TAGS.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setTag(tag === t.value ? null : t.value)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 active:scale-95 ${
                    tag === t.value
                      ? /* The one sanctioned green selection wash (protocol
                           colour rule 4); the old ring-2 double-outline cut
                           against the pill's own edge. */
                        "border-canopy/35 bg-canopy/[0.08] text-canopy"
                      : "border-border bg-card text-muted-foreground hover:bg-accent hover:text-foreground"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          )}

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
