"use client";

/* ------------------------------------------------------------------ *
 *  <PhotoAttachments> — pictures on an answer. Uploads through
 *  POST /api/upload (WebP via Sharp server-side).
 *
 *  `max` is 3 when photos ride along with a written answer, and 1 for a
 *  `photo` prompt, where the picture IS the answer: everyone adds one, and
 *  the Round prints them as a wall. That single picture gets a real plate
 *  rather than a thumbnail, since nothing else sits beside it.
 *
 *  A dumb controlled list: the parent (AnswerCard) owns the autosave call
 *  and only passes the resulting url array back in.
 * ------------------------------------------------------------------ */

import { useState } from "react";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import { ImagePlus, X } from "lucide-react";
import { toast } from "sonner";
import { SpringPress } from "@/components/common/motion";
import { AttachImageDialog } from "@/components/common/attach-image-dialog";
import { cn } from "@/lib/utils";

const MAX_BYTES = 5 * 1024 * 1024;

export function PhotoAttachments({
  images,
  onChange,
  max = 3,
}: {
  images: string[];
  onChange: (next: string[]) => void;
  max?: number;
}) {
  const [uploading, setUploading] = useState(false);
  const [attachOpen, setAttachOpen] = useState(false);
  const [listRef] = useAutoAnimate();

  const single = max === 1;
  const plateSize = single ? "h-44 w-full sm:w-72" : "h-20 w-20";

  async function handleFiles(files: File[]) {
    if (files.length === 0) return;
    const remaining = max - images.length;
    if (remaining <= 0) {
      toast.error(single ? "One photo for this question." : `Up to ${max} photos per answer.`);
      return;
    }
    const picked = files.slice(0, remaining);
    for (const file of picked) {
      if (file.size > MAX_BYTES) {
        toast.error("Each photo must be under 5MB.");
        return;
      }
    }

    setUploading(true);
    const formData = new FormData();
    picked.forEach((file) => formData.append("files", file));

    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "That photo would not upload. Try again.");
        return;
      }
      onChange([...images, ...(data.urls as string[])]);
    } catch {
      toast.error("That photo would not upload. Try again.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <AttachImageDialog
        open={attachOpen}
        onOpenChange={setAttachOpen}
        onFiles={handleFiles}
        multiple={!single}
        title={single ? "Add your photo" : "Add a photo"}
      />
      <div ref={listRef} className="flex flex-wrap items-center gap-[var(--space-s)]">
        {images.map((src, i) => (
          <div
            key={src}
            className={cn(
              "group relative shrink-0 overflow-hidden rounded-[var(--radius-md)] border border-border/70 bg-mist shadow-[0_1px_2px_rgba(30,28,22,0.06),0_10px_20px_-16px_rgba(30,28,22,0.45)]",
              plateSize
            )}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt="" className="h-full w-full object-cover" />
            <SpringPress
              as="button"
              onClick={() => onChange(images.filter((_, idx) => idx !== i))}
              className="absolute right-1.5 top-1.5 inline-grid h-6 w-6 place-items-center rounded-full bg-foreground/70 text-background opacity-0 transition-opacity duration-150 group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              {...({ type: "button", "aria-label": "Remove photo" } as object)}
            >
              <X className="h-3.5 w-3.5" />
            </SpringPress>
          </div>
        ))}
        {images.length < max && (
          <SpringPress
            as="button"
            onClick={() => setAttachOpen(true)}
            className={cn(
              "inline-flex flex-col items-center justify-center gap-1.5 rounded-[var(--radius-md)] border border-dashed border-border text-muted-foreground hover:border-leaf/50 hover:text-foreground disabled:cursor-default disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
              plateSize
            )}
            {...({ type: "button", disabled: uploading, "aria-label": "Add a photo" } as object)}
          >
            <ImagePlus className={single ? "h-5 w-5" : "h-4 w-4"} />
            <span className={single ? "text-[13px] font-semibold" : "text-[10.5px] font-semibold"}>
              {uploading ? "Adding..." : "Add a photo"}
            </span>
          </SpringPress>
        )}
      </div>
    </div>
  );
}
