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

  async function handleSubmit() {
    if (!content.trim()) return;
    setSubmitting(true);

    const formData = new FormData();
    formData.set("content", content);
    if (isLetter) {
      if (title.trim()) formData.set("title", title.trim());
    } else if (tag) {
      formData.set("tag", tag);
    }

    const result = await editPost(postId, formData);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(isLetter ? "Letter updated" : "Post updated");
      onClose();
    }
    setSubmitting(false);
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isLetter ? "Edit letter" : "Edit Post"}</DialogTitle>
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
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    tag === t.value
                      ? "bg-canopy/10 text-canopy ring-2 ring-canopy/50"
                      : "bg-muted text-muted-foreground hover:bg-accent"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
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
