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
import { editPost, publishDraft, deleteDraft } from "@/app/(main)/feed/actions";

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
  isDraft = false,
  onChanged,
}: {
  postId: string;
  kind?: string;
  initialContent: string;
  initialTitle?: string | null;
  initialTag: string | null;
  open: boolean;
  onClose: () => void;
  /** True when this is a letter draft (status "draft"): swaps the single
   *  "Save" button for "Save as draft" / "Publish letter", and offers a
   *  "Delete draft" action. Content/title editing itself is unchanged --
   *  this reuses the same fields and the same `editPost` action. */
  isDraft?: boolean;
  /** Called after a successful save, publish, or delete, so a caller showing
   *  a list of drafts (the letters page's "Your drafts" strip) can refresh
   *  its own server data. */
  onChanged?: () => void;
}) {
  const isLetter = kind === "letter";
  const [content, setContent] = useState(initialContent);
  const [title, setTitle] = useState(initialTitle ?? "");
  const [tag, setTag] = useState(initialTag);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const busy = submitting || deleting;

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

  /** One save path for all three affordances: they differ only in the
   *  success toast and whether the draft is also published after saving. */
  async function save(successToast: string, alsoPublish = false) {
    if (!content.trim()) return;
    setSubmitting(true);
    try {
      const saveResult = await editPost(postId, buildFormData());
      if (saveResult.error) {
        toast.error(saveResult.error);
        return;
      }
      if (alsoPublish) {
        const publishResult = await publishDraft(postId);
        if (publishResult.error) {
          toast.error(publishResult.error);
          return;
        }
      }
      toast.success(successToast);
      onChanged?.();
      onClose();
    } finally {
      setSubmitting(false);
    }
  }

  const handleSubmit = () => save(isLetter ? "Letter updated" : "Post updated");
  const handleSaveDraft = () => save("Draft saved");
  const handlePublish = () => save("Your letter is published", true);

  async function handleDeleteDraft() {
    setDeleting(true);
    const result = await deleteDraft(postId);
    if (result.error) {
      toast.error(result.error);
      setDeleting(false);
      return;
    }
    toast.success("Draft deleted");
    onChanged?.();
    onClose();
    setDeleting(false);
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isDraft ? "Continue your letter" : isLetter ? "Edit letter" : "Edit Post"}
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

          <div className="flex flex-wrap items-center justify-between gap-2">
            {isDraft ? (
              <button
                type="button"
                onClick={handleDeleteDraft}
                disabled={busy}
                className="rounded-sm text-sm font-medium text-destructive hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50"
              >
                {deleting ? "Deleting..." : "Delete draft"}
              </button>
            ) : (
              <span />
            )}
            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="outline" onClick={onClose} disabled={busy}>
                Cancel
              </Button>
              {isDraft ? (
                <>
                  <Button
                    variant="outline"
                    onClick={handleSaveDraft}
                    disabled={!content.trim() || busy}
                  >
                    {submitting ? "Saving..." : "Save as draft"}
                  </Button>
                  <Button
                    onClick={handlePublish}
                    disabled={!content.trim() || busy}
                    variant="primary"
                  >
                    {submitting ? "Publishing..." : "Publish letter"}
                  </Button>
                </>
              ) : (
                <Button
                  onClick={handleSubmit}
                  disabled={!content.trim() || submitting}
                  variant="primary"
                >
                  {submitting ? "Saving..." : "Save"}
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
