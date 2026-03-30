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
  initialContent,
  initialTag,
  open,
  onClose,
}: {
  postId: string;
  initialContent: string;
  initialTag: string | null;
  open: boolean;
  onClose: () => void;
}) {
  const [content, setContent] = useState(initialContent);
  const [tag, setTag] = useState(initialTag);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!content.trim()) return;
    setSubmitting(true);

    const formData = new FormData();
    formData.set("content", content);
    if (tag) formData.set("tag", tag);

    const result = await editPost(postId, formData);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Post updated");
      onClose();
    }
    setSubmitting(false);
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Post</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            maxLength={5000}
            rows={5}
          />

          <div className="flex flex-wrap gap-2">
            {TAGS.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setTag(tag === t.value ? null : t.value)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-all ${
                  tag === t.value
                    ? "bg-leaf/10 text-leaf ring-2 ring-ring"
                    : "bg-muted text-muted-foreground hover:bg-accent"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!content.trim() || submitting}
              variant="leaf"
            >
              {submitting ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
