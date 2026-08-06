"use client";

/* ------------------------------------------------------------------ *
 *  <AttachImageWell> / <AttachImageDialog> -- the one way to give the
 *  app a picture, everywhere a picture can be attached (post/letter
 *  composer, catch-up answers, avatar, the Collection, admin support
 *  messages). Three doors into the same room: click to browse, drag a
 *  file in, or paste straight from the clipboard. Before this, every
 *  one of those sites hand-rolled its own hidden `<input type="file">`
 *  with neither drag/drop nor paste wired up (owner, 2026-08-06: a
 *  popup that shows "the dialog box for attaching a file... but also
 *  drag and drop and... paste").
 *
 *  <AttachImageWell> is the actual pick surface -- drop target, hidden
 *  input, paste listener -- with no opinion about how it's presented,
 *  and no opinion about size/format limits (every call site already has
 *  its own validation right after the file leaves here; duplicating
 *  that here would just let the two drift). <AttachImageDialog> wraps
 *  it in THE dialog material (`src/components/ui/dialog.tsx`) for sites
 *  that don't already have one open. The Collection's contribute dialog
 *  IS already a dialog, so it embeds `<AttachImageWell>` directly rather
 *  than nesting a modal inside a modal.
 * ------------------------------------------------------------------ */

import { useEffect, useRef, useState } from "react";
import { ImagePlus } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { isImageFile } from "@/lib/upload-shared";
import { SpringPress } from "@/components/common/motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

/* `.items` (not `.files`) on purpose: a `ClipboardEvent`'s `clipboardData` is
   a `DataTransfer` too, so the same walk covers both a drop and a paste, and
   `.items` is the one of the two that paste has reliably populated across
   browsers. */
function imagesFromDataTransfer(data: DataTransfer): File[] {
  const files: File[] = [];
  for (const item of data.items) {
    if (item.kind === "file" && isImageFile(item)) {
      const file = item.getAsFile();
      if (file) files.push(file);
    }
  }
  return files;
}

export function AttachImageWell({
  onFiles,
  multiple = true,
  active,
  className,
}: {
  onFiles: (files: File[]) => void;
  multiple?: boolean;
  /** Paste only fires while this well is actually the thing in front of the
   *  person -- an open dialog, a mounted section -- so a well sitting
   *  further down the page never steals a paste meant for a text field.
   *  Required, not defaulted to true: the safe behaviour has to be the one
   *  a future call site gets for free if it forgets to pass this. */
  active: boolean;
  className?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  function deliver(files: File[]) {
    if (files.length === 0) {
      toast.error("That doesn't look like a photo. Try a JPG, PNG, or WebP.");
      return;
    }
    if (!multiple && files.length > 1) toast.info("Using just the first photo.");
    onFiles(multiple ? files : files.slice(0, 1));
  }

  // `deliver` closes over `onFiles`/`multiple`, and every call site hands
  // those in as fresh closures each render -- a ref keeps the listener
  // itself attached for the whole time the well is active, rather than
  // tearing it down and re-adding it on every unrelated re-render. The ref
  // write happens in its own effect (no deps, so it runs after every render)
  // rather than inline during render, which React treats as an impure read.
  const deliverRef = useRef(deliver);
  useEffect(() => {
    deliverRef.current = deliver;
  });

  useEffect(() => {
    if (!active) return;
    function onPaste(e: ClipboardEvent) {
      if (!e.clipboardData) return;
      const files = imagesFromDataTransfer(e.clipboardData);
      if (files.length === 0) return;
      e.preventDefault();
      deliverRef.current(files);
    }
    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
  }, [active]);

  return (
    <SpringPress
      as="button"
      onClick={() => inputRef.current?.click()}
      className={cn(
        "flex w-full flex-col items-center gap-2 rounded-[var(--radius-md)] border border-dashed py-10 text-center text-muted-foreground transition-colors state-layer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        dragActive
          ? "border-leaf bg-leaf/10 text-foreground"
          : "border-border bg-paper/50 hover:border-leaf/50 hover:text-foreground",
        className
      )}
      {...({
        type: "button",
        onDragOver: (e: React.DragEvent) => {
          e.preventDefault();
          setDragActive(true);
        },
        onDragLeave: () => setDragActive(false),
        onDrop: (e: React.DragEvent) => {
          e.preventDefault();
          setDragActive(false);
          deliver(imagesFromDataTransfer(e.dataTransfer));
        },
      } as object)}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple={multiple}
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) deliver(Array.from(e.target.files));
          e.target.value = ""; // so picking the same file twice still fires onChange
        }}
      />
      <ImagePlus className="h-7 w-7" />
      <span className="text-sm font-medium">
        {dragActive ? "Drop it in" : `Drop ${multiple ? "photos" : "a photo"} here, or click to browse`}
      </span>
      <span className="text-xs text-muted-foreground/80">or paste from your clipboard</span>
    </SpringPress>
  );
}

export function AttachImageDialog({
  open,
  onOpenChange,
  onFiles,
  multiple = true,
  title,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onFiles: (files: File[]) => void;
  multiple?: boolean;
  title?: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{title ?? (multiple ? "Add photos" : "Add a photo")}</DialogTitle>
          <DialogDescription>
            Browse your computer, drag a file in, or paste from your clipboard.
          </DialogDescription>
        </DialogHeader>
        <AttachImageWell
          active={open}
          multiple={multiple}
          onFiles={(files) => {
            onFiles(files);
            onOpenChange(false);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
