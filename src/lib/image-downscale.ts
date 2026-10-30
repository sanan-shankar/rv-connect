import { heicWayOut, isUnsupportedHeic } from "./upload-shared.ts";

/**
 * Browser-side image downscaling, run BEFORE a photo is uploaded.
 *
 * Why this exists: feed and letter images are POSTed to the `/api/upload` route
 * handler, and on Vercel a route handler's request body is hard-capped at about
 * 4.5MB. The client used to let you pick a 20MB photo, so a normal phone photo
 * (often 5 to 12MB) sailed past the client check and then died at Vercel's edge
 * with an opaque failure. Shrinking the pixels here means the bytes on the wire
 * are always small, so the upload "just works" no matter the source size, and
 * the same change cuts upload time on a slow connection.
 *
 * A feed image never renders larger than a post card, so 2048px on the long
 * edge is generous headroom even on a retina screen. Output is WebP (the format
 * the server converts to anyway); WebP keeps alpha, so a transparent PNG never
 * picks up a black background the way a JPEG re-encode would.
 *
 * Pass-through cases (returned untouched, never flattened or failed):
 *  - GIF: re-rasterising would drop the animation.
 *  - HEIC/HEIF: no browser can decode it, so the server's own friendly
 *    "export as JPG" message stays the thing the user sees.
 *  - anything that fails to decode, or that would not get smaller.
 */

const MAX_EDGE = 2048;
const WEBP_QUALITY = 0.82;

/** JPEG/PNG/WebP by mime, or by extension when a mobile browser leaves the mime blank. */
function isDownscalable(file: File): boolean {
  if (file.type === "image/jpeg" || file.type === "image/png" || file.type === "image/webp") {
    return true;
  }
  if (file.type === "" && /\.(jpe?g|png|webp)$/i.test(file.name)) return true;
  return false;
}

export async function downscaleImage(file: File): Promise<File> {
  if (typeof document === "undefined") return file; // never on the server
  if (!isDownscalable(file)) return file;

  let bitmap: ImageBitmap;
  try {
    // `from-image` bakes EXIF rotation into the pixels, so an upright canvas is
    // upright for real and orientation metadata stops mattering downstream.
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    return file; // undecodable: let the server decide what to say
  }

  try {
    const { width, height } = bitmap;
    const longest = Math.max(width, height);
    // Already small in both dimensions and bytes: recompressing would only cost
    // quality for no size win, so leave it alone.
    if (longest <= MAX_EDGE && file.size <= 1024 * 1024) return file;

    const scale = longest > MAX_EDGE ? MAX_EDGE / longest : 1;
    const w = Math.max(1, Math.round(width * scale));
    const h = Math.max(1, Math.round(height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, w, h);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/webp", WEBP_QUALITY)
    );
    if (!blob || blob.size >= file.size) return file; // no real gain: keep the original

    const name = file.name.replace(/\.[^.]+$/, "") + ".webp";
    return new File([blob], name, { type: "image/webp", lastModified: file.lastModified });
  } finally {
    bitmap.close?.();
  }
}

/**
 * The most bytes a request body may carry to this app's own server.
 *
 * Vercel refuses an oversized body at the PLATFORM, before any of our code
 * runs, and the line that binds here is not the function's 4.5MB: every
 * request this app answers passes through src/proxy.ts first, and Routing
 * Middleware takes at most 4MB of body (Vercel's routing-middleware limits).
 * This was sized against the 4.5MB until 2026-10-30, so a set of files coming
 * to just under 4MiB passed this check and died at the edge with a bare "Try
 * again" (bug audit 3, L8-03). 3.8 million bytes reads "4MB" the strict,
 * decimal way and still leaves room for the multipart framing and the form
 * fields that travel with the files. `serverActions: { bodySizeLimit }` in
 * next.config.ts lifts only Next's own guard and cannot raise any of this.
 */
export const UPLOAD_BODY_LIMIT = 3_800_000;

/**
 * Get a set of picked files ready to be POSTed to our own server, or say why
 * they cannot be.
 *
 * Every path that sends bytes through a Server Action or through /api/upload
 * goes through here. Before this existed, the onboarding photo step, the
 * Catch-up answer attachments and the admin-thread composer all shipped the
 * ORIGINAL file: a normal phone photo is 5 to 12MB, so the very first thing a
 * new member does -- set a profile picture -- failed at Vercel's edge with a
 * stuck spinner and no message (bug audit B-030).
 *
 * Downscaling handles the ordinary case invisibly. The size check afterwards
 * exists for what downscaling deliberately passes through: an animated GIF
 * (re-rasterising would drop the animation) and HEIC (no browser can decode
 * it). Those get a sentence that names the real reason instead of a silent
 * platform refusal.
 */
export async function shrinkForUpload(
  files: File[]
): Promise<{ ok: true; files: File[] } | { ok: false; error: string }> {
  const shrunk = await Promise.all(files.map((f) => downscaleImage(f)));
  const total = shrunk.reduce((n, f) => n + f.size, 0);
  if (total <= UPLOAD_BODY_LIMIT) return { ok: true, files: shrunk };

  const mb = (n: number) => `${(n / (1024 * 1024)).toFixed(1)}MB`;
  if (shrunk.some((f) => f.type === "image/gif")) {
    return {
      ok: false,
      error: `An animated GIF has to be sent as it is, and ${
        shrunk.length > 1 ? "these come" : "this one comes"
      } to ${mb(total)}. Try a shorter one, or a still picture.`,
    };
  }
  if (shrunk.some((f) => isUnsupportedHeic(f))) {
    return {
      ok: false,
      error: `HEIC photos cannot be resized in the browser. ${heicWayOut(true)}`,
    };
  }
  return {
    ok: false,
    error: `That is still ${mb(total)} after shrinking, which is too large to upload. Try a smaller picture.`,
  };
}
