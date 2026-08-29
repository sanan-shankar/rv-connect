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
 *  that don't already have one open.
 *
 *  The Collection's contribute room does NOT embed the well component
 *  (this comment used to claim it did; it never had). The room's drop
 *  target is the whole window and its paste listener already exists, so
 *  embedding this one would double the paste delivery. What the room
 *  shares is the LOOK: `wellClass` + `WELL_PRESS` below, so both drop
 *  surfaces are one material with two sets of plumbing, each right for
 *  its room.
 * ------------------------------------------------------------------ */

import { useEffect, useRef, useState } from "react";
import { ImagePlus } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { isImageFile } from "@/lib/upload-shared";
import { SpringPress, SPRINGS } from "@/components/common/motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/* THE WELL MATERIAL. One dashed box means "photographs go in here", exactly as
   MENU_PANEL_CLASS means "this floats": the class string lives here and is
   worn by every drop surface -- this file's well and the Collection's
   invitation (src/components/collection/contribute-room.tsx) -- so the two can
   never drift apart again (they had: the Collection hand-rolled its own empty
   state, and this file's header claimed otherwise for a month).

   Dashed is the one border style reserved for this meaning plus the editable
   slots on profiles; a solid box is a card, a dashed box is an invitation.
   The drag-over state swaps to leaf because that is the same answer the
   Collection's full-viewport canopy frame gives: green means "yes, here". */
export function wellClass(dragActive: boolean) {
  return cn(
    "flex w-full flex-col items-center gap-2 rounded-[var(--radius-md)] border border-dashed text-center transition-colors",
    dragActive
      ? "border-leaf bg-leaf/10 text-foreground"
      : "border-border bg-paper/50 text-muted-foreground hover:border-leaf/50 hover:text-foreground"
  );
}

/* The press every well shares: shallow and firm. A ~360px surface at snappy's
   0.93 collapsed ~25px and wobbled on release -- the owner: "compresses a bit
   too much. that spring is too loose." Big things press less. */
export const WELL_PRESS = { whileTap: { scale: 0.985 }, transition: SPRINGS.firm } as const;

/** Does this device have a cursor to drag with and a paste this surface can
 *  hear? `hover` + `fine` is the honest test -- not width: a 1024px iPad has
 *  neither, a small laptop window has both. False on the server and the first
 *  client frame, so the copy never swaps under a reader; the safe default is
 *  the shorter sentence. (Moved here from the Collection's contribute room so
 *  both wells ask the same question the same way.) */
export function usePointerFine(): boolean {
  const [fine, setFine] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
    const sync = () => setFine(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return fine;
}

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

  const pointerFine = usePointerFine();
  /* ONE line, chosen by what the device can actually do. It used to be two
     stacked "or" clauses under a DialogDescription that said all three methods
     again -- every door named twice (owner, 2026-08-29: "make sure no
     information is repeated"). Paste still works; it is a shortcut for people
     who already paste, not a door a first-timer needs read to them. */
  const line = dragActive
    ? "Drop it in"
    : pointerFine
      ? `Drop ${multiple ? "photos" : "a photo"} here, or click to browse`
      : `Add ${multiple ? "photos" : "a photo"}`;

  return (
    <SpringPress
      as="button"
      onClick={() => inputRef.current?.click()}
      {...WELL_PRESS}
      className={cn(
        wellClass(dragActive),
        "py-10 state-layer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
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
      <span className="text-sm font-medium">{line}</span>
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
          {/* No description. It said "Browse your computer, drag a file in, or
              paste from your clipboard" -- all three of the well's doors,
              restated one line above the well that shows them. Carbon's test:
              if the title and the purpose are clear, a description is not
              needed. A DialogTitle carries the accessible name on its own. */}
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
