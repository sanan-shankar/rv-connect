import { toast } from "sonner";

import type { PhotoFacts } from "@/lib/photo-layout";

/**
 * The client half of the direct-to-R2 upload path, shared by the post
 * composer and the Collection contribute dialog so the presign contract
 * (and its CORS-failure fallback behaviour) lives in exactly one place.
 *
 * The bucket's CORS rule is live (applied 2026-07-30), so this is the path a
 * browser normally takes.
 *
 * Returns the staged object's key/publicUrl on success, or null whenever the
 * direct path is unavailable anyway: no R2 configured locally, a transient
 * presign failure, or an origin the CORS rule does not name (a new domain, a
 * Vercel preview URL). The caller then falls back to its classic
 * server-proxied upload, which is capped at ~4.5MB on Vercel but is better
 * than stranding the photo. A definitive validation error (bad type, over the
 * size limit) is thrown instead, so callers surface it rather than silently
 * retrying a file the server will always refuse.
 */
export async function directUploadPut(
  file: File,
  kind: "post" | "collection",
  /** A deadline for the PUT itself. Without one a request that neither
   *  answers nor fails holds its caller open for ever -- which a single
   *  photograph in a composer can afford and a wall of two hundred cannot,
   *  because the lanes uploading them are a fixed pool and three stuck files
   *  stall the other hundred and ninety-seven. On abort this falls back to the
   *  server proxy exactly as a blocked PUT does. */
  opts?: { signal?: AbortSignal }
): Promise<{ key: string; publicUrl: string } | null> {
  let presign: {
    direct?: boolean;
    key?: string;
    signedUrl?: string;
    publicUrl?: string;
    contentType?: string;
    error?: string;
  };
  let status: number;
  try {
    const res = await fetch("/api/upload/presign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind,
        contentType: file.type,
        // Sent because some mobile browsers hand over a photograph with no
        // MIME type at all, and the name is then the only thing that says
        // what it is (audit C-066).
        filename: file.name,
        bytes: file.size,
      }),
    });
    status = res.status;
    presign = await res.json();
  } catch (err) {
    /* Said out loud (audit C-158). This fallback is INVISIBLE by design -- the
       caller downscales in the browser and proxies through the server instead,
       so the upload works and nobody notices -- and that is exactly how direct
       uploads stayed broken for weeks while everything looked fine
       (docs/TRAPS.md). A console line costs nothing and makes a recurrence
       diagnosable from the one place somebody would look. */
    console.warn("[upload] presign unreachable; falling back to the server proxy", err);
    return null; // network hiccup: let the caller's classic path try
  }

  // A 400 is a real verdict about the file (unsupported format, too big),
  // not an availability problem; retrying it through the fallback would
  // just fail slower with a worse message.
  if (status === 400 && presign.error) throw new Error(presign.error);
  if (!presign.direct || !presign.signedUrl || !presign.key || !presign.publicUrl) return null;

  try {
    const put = await fetch(presign.signedUrl, {
      method: "PUT",
      // The type the URL was signed with, which for a blank-MIME file is the
      // one the server derived from the name; sending anything else fails the
      // signature.
      headers: { "Content-Type": presign.contentType ?? file.type },
      body: file,
      signal: opts?.signal,
    });
    if (!put.ok) {
      console.warn(
        `[upload] direct PUT refused (${put.status}); falling back to the server proxy`
      );
      return null;
    }
  } catch (err) {
    /* The browser blocked the PUT, which in practice means this origin is not
       named in the bucket's CORS allowlist -- or the S3 endpoint is missing
       from the CSP's connect-src, which is the pair that hid this for weeks.
       Fall back rather than strand the upload, but say so (audit C-158). */
    console.warn("[upload] direct PUT blocked or timed out; falling back to the server proxy", err);
    return null;
  }

  return { key: presign.key, publicUrl: presign.publicUrl };
}

/* ------------------------------------------------------------------ *
 *  The classic server-proxied upload, and the two things every caller
 *  does with what comes back.
 *
 *  Three surfaces POST to /api/upload -- the post composer's fallback, a
 *  Catch-up answer's attachments and the support-message composer -- and
 *  each used to spell the whole ceremony out. They had drifted: only the
 *  composer had a deadline, and the three of them said a failed upload
 *  three different ways.
 *
 *  `shrinkForUpload` deliberately stays at the CALL SITES rather than
 *  moving in here. `upload-size-rule.test.mjs` greps each sending file for
 *  it by name, and a helper that swallowed the shrink would turn that pin
 *  red for the right reason: the pin's whole job is to notice a fourth
 *  surface that forgot.
 * ------------------------------------------------------------------ */

/** A request that neither answers nor fails holds its caller open for ever,
 *  and every one of these callers leaves a button reading "Adding..." until
 *  it settles. Sixty seconds is long enough for a shrunk photograph on a
 *  train and short enough that nobody sits looking at a dead control
 *  (the wedged-busy shape of audit B-042). */
const UPLOAD_TIMEOUT_MS = 60_000;

type UploadResponse = {
  urls?: string[];
  images?: unknown;
  notices?: unknown;
  error?: string;
};

/**
 * Anything the server changed about a file, said out loud (audit M15).
 *
 * A toast rather than inline copy: it is information about an upload that has
 * already succeeded, not a condition to fix before carrying on. Exported
 * because the finalize route answers the same `notices` array on a path that
 * does not come through `postImages`.
 */
export function announceUploadNotices(notices: unknown): void {
  for (const notice of (notices ?? []) as string[]) toast.info(notice);
}

/**
 * What the server measured about each stored url, keyed by it.
 *
 * Kept rather than thrown away: it is the crop handle's starting position,
 * and without it the handle opens at dead centre while the card draws the
 * machine's own aim. Keyed rather than parallel to `urls`, because callers
 * splice their photo lists and a second list would have to be spliced in step
 * for ever. An `images` shorter than `urls` is a supported state -- a
 * photograph sharp could not measure still uploads, it simply gets no handle.
 */
export function factsByUrl(images: unknown): Record<string, PhotoFacts> {
  const out: Record<string, PhotoFacts> = {};
  if (!Array.isArray(images)) return out;
  for (const f of images as ({ url?: string } & PhotoFacts)[]) {
    if (f?.url) out[f.url] = f;
  }
  return out;
}

/**
 * POST already-shrunk files to /api/upload and hand back where they landed.
 *
 * Throws rather than returning an error, because every caller's response to a
 * failure is the same shape: release the busy state and toast the sentence.
 * `subject` is what that sentence calls the file -- the composer names it,
 * since it uploads one at a time and a batch of three wants to say which one
 * failed; the others let it stand as "That photo".
 */
export async function postImages(
  files: File[],
  opts: { timeoutMs?: number; subject?: string } = {}
): Promise<{ urls: string[]; facts: Record<string, PhotoFacts> }> {
  const { timeoutMs = UPLOAD_TIMEOUT_MS, subject = "That photo" } = opts;

  const body = new FormData();
  for (const file of files) body.append("files", file);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let res: Response;
  try {
    res = await fetch("/api/upload", { method: "POST", body, signal: controller.signal });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error(`${subject} timed out. Check your connection and try again.`);
    }
    throw new Error(`${subject} did not upload. Check your connection and try again.`);
  } finally {
    clearTimeout(timer);
  }

  const data: UploadResponse = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `${subject} did not upload. Try again.`);

  announceUploadNotices(data.notices);
  return { urls: (data.urls ?? []) as string[], facts: factsByUrl(data.images) };
}
