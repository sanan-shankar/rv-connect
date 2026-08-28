"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { downscaleImage } from "@/lib/image-downscale";
import { directUploadPut } from "@/lib/upload-client";
import { MAX_UPLOAD_BYTES } from "@/lib/upload-shared";
import type { PhotoFacts } from "@/lib/photo-layout";
import { myImageFacts } from "@/app/(main)/image-aim";

/* ------------------------------------------------------------------ *
 *  The composer's photograph pipeline, lifted out of create-post-form
 *  whole (audit feed-posts-02).
 *
 *  Its only contract with the editor is the values it hands back --
 *  `images` (the stored urls a submit sends), `previews` (what the writer
 *  looks at), `facts` (what the server measured, for the crop handle),
 *  `uploading` and `uploadProgress` (what the Post button and the Photo label
 *  read). That narrow seam is why this half comes out cleanly while the editor
 *  body, which closes over twenty pieces of state, stays where it is.
 * ------------------------------------------------------------------ */

const UPLOAD_TIMEOUT_MS = 60_000;

/** One photograph in the composer. `preview` is what is on screen from the
 *  first frame (a local object url, or a resumed draft's stored url); `url`
 *  arrives when the bytes are in, and its absence IS the uploading state. */
type Shot = { preview: string; url?: string };

/**
 * Release the `blob:` previews this composer minted, leaving stored urls alone.
 *
 * `URL.createObjectURL` pins the whole file in memory for the document's life
 * unless it is revoked, and only `removeImage` revoked -- so every photograph
 * actually POSTED stayed pinned, and so did every preview on an unmount that
 * was not a post (navigating away from the letters desk). A resumed draft's
 * previews are R2 urls, which own nothing and revoke to nothing (audit C-183).
 */
function revokeBlobPreviews(urls: string[]): void {
  for (const u of urls) {
    if (u.startsWith("blob:")) URL.revokeObjectURL(u);
  }
}

export function useComposerUploads({
  initialImages,
  onEmptied,
}: {
  /** A resumed draft's images are already-public URLs, so they serve as their
   *  own previews; fresh uploads append object URLs as before. */
  initialImages?: string[];
  /** Called when the last photograph is taken out; the composer unticks
   *  "Also add to the Collection" on it. See removeImage. */
  onEmptied?: () => void;
}) {
  /* ONE list, in the order the writer added them, rather than two arrays that
     had to be kept in step.
     The reason is not tidiness: `previews` used to be appended only AFTER the
     upload came back, so choosing a photograph showed nothing at all for
     however long the network took -- a spinner in the toolbar, an unchanged
     composer -- and then the whole row of thumbnails appeared at once and shoved
     the controls down. The photograph is on the device the moment it is chosen,
     so it goes on screen the moment it is chosen, and the upload is something
     that happens TO a thumbnail that is already there (owner, 2026-08-28: "make
     sure the composer expanding when the photo is added is done very smoothly
     ... it's very rough now"). */
  const [shots, setShots] = useState<Shot[]>(
    () => (initialImages ?? []).map((url) => ({ preview: url, url }))
  );
  /* What submit sends: the STORED urls, so a photograph still climbing to R2
     cannot be posted as a blob: url nobody else could ever read. Post is gated
     on `uploading` as well, which is what stops the half-uploaded case. */
  const images = useMemo(() => shots.filter((s) => s.url).map((s) => s.url as string), [shots]);
  const previews = useMemo(() => shots.map((s) => s.preview), [shots]);
  /** Per thumbnail, index-aligned with `previews`: the stored url once it
   *  lands, and undefined until then. `urls` rather than `images` is what the
   *  crop handle has to read -- `images` skips the ones still climbing, so its
   *  indices stop matching the thumbnails the moment anything is pending. */
  const urls = useMemo(() => shots.map((s) => s.url), [shots]);
  const pending = useMemo(() => shots.map((s) => !s.url), [shots]);
  /* What the server measured about each stored url, keyed by it. Both upload
     routes have returned this since spec §2 and both callers threw it away.
     The crop handle needs the machine's own aim as its starting position --
     without it every photograph opens at dead centre, which is not where the
     card is going to draw it. Keyed rather than parallel to `images`, because
     `removeImage` splices that list and a second list would have to be spliced
     in step for ever. */
  const [facts, setFacts] = useState<Record<string, PhotoFacts>>({});
  const uploading = shots.some((s) => !s.url);
  // Determinate-feeling progress for the "Photo" button label while a batch
  // uploads one file at a time (no byte-level progress events on a plain
  // fetch, but "uploading 2 of 3" reads as real progress).
  const [uploadProgress, setUploadProgress] = useState<{ done: number; total: number } | null>(null);

  /* The freshest preview list, for the two places that must read it OUTSIDE a
     render: the post-success revoke and the unmount cleanup, neither of which
     can close over state and be right. */
  const previewsRef = useRef<string[]>([]);
  useEffect(() => {
    previewsRef.current = previews;
  }, [previews]);
  useEffect(
    () => () => {
      revokeBlobPreviews(previewsRef.current);
    },
    []
  );

  /** Keep whatever measurements a response carried. Both routes answer
   *  `{ urls, images }`, and an `images` shorter than `urls` is a supported
   *  state: an image sharp could not measure still uploads and still posts, it
   *  simply gets no crop handle. */
  function keep(images: unknown) {
    if (!Array.isArray(images)) return;
    setFacts((prev) => {
      const next = { ...prev };
      for (const f of images as ({ url?: string } & PhotoFacts)[]) {
        if (f?.url) next[f.url] = f;
      }
      return next;
    });
  }

  /* A resumed draft arrives holding urls and nothing else, so its
     photographs would open the crop handle at dead centre while the card
     draws the machine's aim -- a first frame nobody has ever seen, which is
     the one thing that dialog must not do. One query, once, for the drafts
     that have photographs at all. */
  useEffect(() => {
    const resumed = initialImages ?? [];
    if (resumed.length === 0) return;
    let gone = false;
    void myImageFacts(resumed).then((known) => {
      if (!gone) setFacts((prev) => ({ ...known, ...prev }));
    });
    return () => {
      gone = true;
    };
    // Mount only: `initialImages` is the draft this composer opened on, and a
    // fresh array identity each render would re-query for ever.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Preferred upload path: presigned PUT straight to R2 (the shared
   * `directUploadPut` helper), then a finalize call that turns the staged
   * FULL-RESOLUTION original into the display WebP server-side. No bytes
   * pass through a serverless function, so Vercel's ~4.5MB request cap
   * never applies and nothing needs shrinking in the browser (owner,
   * 2026-07-30: client-side downscaling defeats the point of a 20MB limit).
   *
   * Falls back to the classic proxied POST when the direct path is
   * unavailable; only that fallback still browser-downscales, since it is
   * the path the platform cap can actually bite.
   */
  async function uploadViaPresign(original: File): Promise<string> {
    const staged = await directUploadPut(original, "post");
    if (staged) {
      const fin = await fetch("/api/upload/finalize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keys: [staged.key] }),
      });
      const data = await fin.json().catch(() => ({}));
      if (fin.ok && data.urls?.[0]) {
        // Same as the classic path below: anything the server changed about
        // the file is said out loud (audit M15/C-073).
        for (const notice of (data.notices ?? []) as string[]) toast.info(notice);
        keep(data.images);
        return data.urls[0] as string;
      }
      throw new Error(data.error || `"${original.name}" failed to upload`);
    }
    const shrunk = await downscaleImage(original);
    return uploadOneFile(shrunk);
  }

  async function uploadOneFile(file: File): Promise<string> {
    const formData = new FormData();
    formData.append("files", file);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), UPLOAD_TIMEOUT_MS);
    let res: Response;
    try {
      res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
        signal: controller.signal,
      });
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        throw new Error(`"${file.name}" timed out. Check your connection and try again.`);
      }
      throw new Error(`"${file.name}" failed to upload. Check your connection and try again.`);
    } finally {
      clearTimeout(timeout);
    }

    if (!res.ok) {
      const data = await res.json().catch(() => ({ error: null }));
      throw new Error(data.error || `"${file.name}" failed to upload`);
    }

    const { urls, images, notices } = await res.json();
    keep(images);
    // Anything the server changed about the file, said out loud (audit M15).
    // A toast rather than inline copy: it is information about one upload that
    // has already succeeded, not a condition to fix before carrying on.
    for (const notice of (notices ?? []) as string[]) toast.info(notice);
    return urls[0] as string;
  }

  async function handleImageFiles(files: File[]) {
    if (files.length === 0) return;

    // Against the THUMBNAILS on screen, not the uploaded urls: a photograph
    // still climbing already occupies one of the three places.
    const remaining = 3 - shots.length;
    if (files.length > remaining) {
      toast.error(`You can add ${remaining} more image${remaining !== 1 ? "s" : ""}`);
      return;
    }

    // Validate the ORIGINAL size up front (skip oversized files individually
    // rather than aborting the whole batch on the first one). 20MB is the
    // real ceiling now that the direct path PUTs originals straight to
    // storage; only the proxied fallback still shrinks in the browser.
    const candidates = files.slice(0, remaining);
    const valid: File[] = [];
    for (const file of candidates) {
      if (file.size > MAX_UPLOAD_BYTES) {
        toast.error(`"${file.name}" is over the 20MB limit`);
        continue;
      }
      valid.push(file);
    }
    if (valid.length === 0) return;

    /* On screen FIRST, all of them, from the local file. Preview from the
       original rather than the re-encode: higher quality, and it is only ever
       shown in this composer. The blob url doubles as each shot's identity for
       the rest of this function, so a removal mid-upload cannot land a url on
       whatever happens to be at that index by then. */
    const staged: Shot[] = valid.map((f) => ({ preview: URL.createObjectURL(f) }));
    setShots((prev) => [...prev, ...staged]);

    // One file at a time (sequential): gives a real "uploading N of M"
    // state and means one bad file doesn't sink the others.
    for (let i = 0; i < valid.length; i++) {
      const original = valid[i];
      const key = staged[i].preview;
      setUploadProgress({ done: i, total: valid.length });
      try {
        const url = await uploadViaPresign(original);
        setShots((prev) => prev.map((s) => (s.preview === key ? { ...s, url } : s)));
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Upload failed");
        /* The thumbnail goes with the failure. Leaving it would be a
           photograph the writer can see, cannot post, and is not told about
           beyond a toast that slides away -- and `uploading` would never come
           back down, so Post would stay disabled for ever. */
        setShots((prev) => {
          const next = prev.filter((s) => s.preview !== key);
          if (next.length === 0) onEmptied?.();
          return next;
        });
        URL.revokeObjectURL(key);
      }
    }

    setUploadProgress(null);
  }

  function removeImage(index: number) {
    setShots((prev) => {
      const gone = prev[index];
      if (gone && gone.preview.startsWith("blob:")) URL.revokeObjectURL(gone.preview);
      const next = prev.filter((_, i) => i !== index);
      // Taking the last photograph out takes the offer with it, so adding a
      // different one later starts from "no" rather than from a yes the
      // writer left on for a picture they since deleted.
      if (next.length === 0) onEmptied?.();
      return next;
    });
  }

  /* What a successful post leaves behind: the list dropped, and the blob urls
     released BEFORE it is (audit C-183 -- see revokeBlobPreviews above for
     why the order matters and why R2 urls are left alone). */
  function resetImages() {
    revokeBlobPreviews(previewsRef.current);
    setShots([]);
  }

  return {
    images,
    previews,
    urls,
    pending,
    facts,
    uploading,
    uploadProgress,
    handleImageFiles,
    removeImage,
    resetImages,
  };
}
