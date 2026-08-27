"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { downscaleImage } from "@/lib/image-downscale";
import { directUploadPut } from "@/lib/upload-client";
import { MAX_UPLOAD_BYTES } from "@/lib/upload-shared";

/* ------------------------------------------------------------------ *
 *  The composer's photograph pipeline, lifted out of create-post-form
 *  whole (audit feed-posts-02).
 *
 *  Its only contract with the editor is the four values it hands back --
 *  `images` (the stored urls a submit sends), `previews` (what the writer
 *  looks at), `uploading` and `uploadProgress` (what the Post button and the
 *  Photo label read). That narrow seam is why this half comes out cleanly
 *  while the editor body, which closes over twenty pieces of state, stays
 *  where it is.
 * ------------------------------------------------------------------ */

const UPLOAD_TIMEOUT_MS = 60_000;

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
  const [images, setImages] = useState<string[]>(initialImages ?? []);
  const [previews, setPreviews] = useState<string[]>(initialImages ?? []);
  const [uploading, setUploading] = useState(false);
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

    const { urls, notices } = await res.json();
    // Anything the server changed about the file, said out loud (audit M15).
    // A toast rather than inline copy: it is information about one upload that
    // has already succeeded, not a condition to fix before carrying on.
    for (const notice of (notices ?? []) as string[]) toast.info(notice);
    return urls[0] as string;
  }

  async function handleImageFiles(files: File[]) {
    if (files.length === 0) return;

    const remaining = 3 - images.length;
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

    setUploading(true);
    const uploadedUrls: string[] = [];
    const uploadedPreviews: string[] = [];

    // One file at a time (sequential): gives a real "uploading N of M"
    // state and means one bad file doesn't sink the others.
    for (let i = 0; i < valid.length; i++) {
      const original = valid[i];
      setUploadProgress({ done: i, total: valid.length });
      try {
        const url = await uploadViaPresign(original);
        uploadedUrls.push(url);
        // Preview from the original file: higher quality than the re-encode,
        // and it is only ever shown locally in the composer.
        uploadedPreviews.push(URL.createObjectURL(original));
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Upload failed");
      }
    }

    if (uploadedUrls.length > 0) {
      setImages((prev) => [...prev, ...uploadedUrls]);
      setPreviews((prev) => [...prev, ...uploadedPreviews]);
    }

    setUploading(false);
    setUploadProgress(null);
  }

  function removeImage(index: number) {
    setImages((prev) => {
      const next = prev.filter((_, i) => i !== index);
      // Taking the last photograph out takes the offer with it, so adding a
      // different one later starts from "no" rather than from a tick the
      // writer left on for a picture they since deleted.
      if (next.length === 0) onEmptied?.();
      return next;
    });
    setPreviews((prev) => {
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
  }

  /* What a successful post leaves behind: the list dropped, and the blob urls
     released BEFORE it is (audit C-183 -- see revokeBlobPreviews above for
     why the order matters and why R2 urls are left alone). */
  function resetImages() {
    setImages([]);
    revokeBlobPreviews(previewsRef.current);
    setPreviews([]);
  }

  return {
    images,
    previews,
    uploading,
    uploadProgress,
    handleImageFiles,
    removeImage,
    resetImages,
  };
}
