"use client";

/* ------------------------------------------------------------------ *
 *  <PhotoAttachments> — "Add a photo" (spec 3.4): reuses POST /api/upload
 *  (WebP via Sharp server-side), up to 3 images per answer, shown as small
 *  framed plates. A dumb controlled list: the parent (AnswerCard) owns the
 *  autosave call and only passes the resulting url array back in.
 * ------------------------------------------------------------------ */

import { useRef, useState } from "react";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import { ImagePlus, X } from "lucide-react";
import { toast } from "sonner";
import { SpringPress } from "@/components/common/motion";

const MAX_PHOTOS = 3;
const MAX_BYTES = 5 * 1024 * 1024;

export function PhotoAttachments({
  images,
  onChange,
}: {
  images: string[];
  onChange: (next: string[]) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [listRef] = useAutoAnimate();

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const remaining = MAX_PHOTOS - images.length;
    if (remaining <= 0) {
      toast.error("Up to 3 photos per answer.");
      return;
    }
    const picked = Array.from(files).slice(0, remaining);
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
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <div ref={listRef} className="flex flex-wrap items-center gap-[var(--space-s)]">
        {images.map((src, i) => (
          <div
            key={src}
            className="group relative h-20 w-20 shrink-0 overflow-hidden rounded-[var(--radius-md)] border border-border/70 bg-mist shadow-[0_1px_2px_rgba(30,28,22,0.06),0_10px_20px_-16px_rgba(30,28,22,0.45)]"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt="" className="h-full w-full object-cover" />
            <SpringPress
              as="button"
              onClick={() => onChange(images.filter((_, idx) => idx !== i))}
              className="absolute right-1 top-1 inline-grid h-5 w-5 place-items-center rounded-full bg-foreground/70 text-background opacity-0 transition-opacity duration-150 group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
              {...({ type: "button", "aria-label": "Remove photo" } as object)}
            >
              <X className="h-3 w-3" />
            </SpringPress>
          </div>
        ))}
        {images.length < MAX_PHOTOS && (
          <SpringPress
            as="button"
            onClick={() => inputRef.current?.click()}
            className="inline-flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-[var(--radius-md)] border border-dashed border-border text-muted-foreground hover:border-leaf/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:cursor-default disabled:opacity-50"
            {...({ type: "button", disabled: uploading, "aria-label": "Add a photo" } as object)}
          >
            <ImagePlus className="h-4 w-4" />
            <span className="text-[10.5px] font-semibold">
              {uploading ? "Adding..." : "Add a photo"}
            </span>
          </SpringPress>
        )}
      </div>
    </div>
  );
}
