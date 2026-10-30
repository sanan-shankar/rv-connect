"use client";

/* ------------------------------------------------------------------ *
 *  <PhotoAttachments> — pictures on an answer. Uploads through
 *  POST /api/upload (WebP via Sharp server-side).
 *
 *  Up to MAX_IMAGES on every answer, a photo-wall question's included: his
 *  cap, 2026-09-09, "cap photo wall also at 3 each", which made the wall's
 *  answering half this same strip, unchanged. A `photo` prompt used to pass
 *  `max={1}` and get one large plate, from before that ruling, so the run
 *  in the Edition could never show three photographs from one person (bug
 *  audit 3, T3-21). There is no `max` to pass any more: the cap is the one
 *  `submitEntry` holds the server to.
 *
 *  A dumb controlled list: the parent (AnswerCard) owns the autosave call
 *  and only passes the resulting url array back in.
 * ------------------------------------------------------------------ */

import { useEffect, useRef, useState } from "react";
import { shrinkForUpload } from "@/lib/image-downscale";
import { postImages } from "@/lib/upload-client";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import { ImagePlus, X } from "lucide-react";
import { toast } from "sonner";
import { SpringPress } from "@/components/common/motion";
import { AttachImageDialog } from "@/components/common/attach-image-dialog";
import { PhotoAimButton } from "@/components/common/photo-aim";
import type { PhotoFacts } from "@/lib/photo-layout";
import { MAX_IMAGES } from "@/lib/upload-ownership-rule";

export function PhotoAttachments({
  images,
  onChange,
}: {
  images: string[];
  onChange: (next: string[]) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [attachOpen, setAttachOpen] = useState(false);
  const [listRef] = useAutoAnimate();
  /* The freshest `images`, for the one place that reads it AFTER an await.
     `handleFiles` closes over the prop as it was when the picker returned, and
     an upload is long enough on a phone to remove a photo mid-flight: the
     removal reached the parent, then the upload landed and spread the stale
     list back over it, resurrecting the photo the member had just taken off
     (audit C-182). The Remove button stays live during an upload on purpose --
     waiting for someone else's photo to finish before you can undo your own is
     the worse answer. */
  /** What the server measured about each stored url, for the crop handle. */
  const [facts, setFacts] = useState<Record<string, PhotoFacts>>({});

  const imagesRef = useRef(images);
  useEffect(() => {
    imagesRef.current = images;
  }, [images]);

  async function handleFiles(files: File[]) {
    if (files.length === 0) return;
    const remaining = MAX_IMAGES - images.length;
    if (remaining <= 0) {
      toast.error(`Up to ${MAX_IMAGES} photos per answer.`);
      return;
    }
    const picked = files.slice(0, remaining);

    setUploading(true);
    /* Shrunk here, not on the server: three 5MB photos are 15MB on the wire and
       Vercel refuses a body over about 4.5MB before /api/upload ever runs
       (bug audit B-030). There is no per-file ceiling in front of this any
       more. There used to be a 5MB one, which refused an ordinary phone
       photograph on this page and nowhere else -- the shrinker exists to make
       exactly that file uploadable, and it already refuses what it cannot
       shrink, by name (an animated GIF, a HEIC). */
    const ready = await shrinkForUpload(picked);
    if (!ready.ok) {
      setUploading(false);
      toast.error(ready.error);
      return;
    }

    try {
      const { urls, facts: measured } = await postImages(ready.files);
      setFacts((prev) => ({ ...prev, ...measured }));
      onChange([...imagesRef.current, ...urls]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "That photo did not upload. Try again.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <AttachImageDialog open={attachOpen} onOpenChange={setAttachOpen} onFiles={handleFiles} title="Add a photo" />
      <div ref={listRef} className="flex flex-wrap items-center gap-[var(--space-s)]">
        {images.map((src, i) => (
          <div
            key={src}
            className="group relative h-20 w-20 shrink-0 overflow-hidden rounded-[var(--radius-md)] border border-border/70 bg-mist shadow-[0_1px_2px_rgba(30,28,22,0.06),0_10px_20px_-16px_rgba(30,28,22,0.45)]"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt="" className="h-full w-full object-cover" />
            {/* Only where the answer card is going to cut this photograph.
                This is the surface the owner complained about by name --
                "all of their faces are cropped out and you can't see them" --
                so it is the one that most wants a person deciding. */}
            <PhotoAimButton
              src={src}
              facts={facts[src]}
              className="absolute bottom-1.5 left-1.5 h-6 w-6"
            />
            {/* ALWAYS THERE ON A PHONE. It was `opacity-0 group-hover:opacity-100`,
                and Tailwind puts every hover variant inside `@media (hover: hover)`,
                so on a touch screen the only way to take a wrong photograph off an
                answer was an invisible target in its corner (bug audit 3, T3-19).
                The People door's form: hidden until hover only where hovering
                exists. It brightens on hover rather than taking the state layer,
                for the composer's reason: an ink disc barely moves under more ink. */}
            <SpringPress
              as="button"
              onClick={() => onChange(images.filter((_, idx) => idx !== i))}
              className="absolute right-1.5 top-1.5 inline-grid h-6 w-6 place-items-center rounded-full bg-foreground/70 text-background transition-opacity duration-150 hover:brightness-150 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 [@media(hover:hover)]:focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              {...({ type: "button", "aria-label": "Remove photo" } as object)}
            >
              <X className="h-3.5 w-3.5" />
            </SpringPress>
          </div>
        ))}
        {images.length < MAX_IMAGES && (
          <SpringPress
            as="button"
            onClick={() => setAttachOpen(true)}
            className="inline-flex h-20 w-20 flex-col items-center justify-center gap-1.5 rounded-[var(--radius-md)] border border-dashed border-border text-muted-foreground hover:border-leaf/50 hover:text-foreground disabled:cursor-default disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            {...({ type: "button", disabled: uploading, "aria-label": "Add a photo" } as object)}
          >
            <ImagePlus className="h-4 w-4" />
            <span className="text-[10.5px] font-semibold">{uploading ? "Adding..." : "Add a photo"}</span>
          </SpringPress>
        )}
      </div>
    </div>
  );
}
