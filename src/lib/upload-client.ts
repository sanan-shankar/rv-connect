import { toast } from "sonner";

import { downscaleImage } from "@/lib/image-downscale";
import type { PhotoFacts } from "@/lib/photo-layout";

/** How many times the direct path is attempted before it really does give up.
 *  Two: the first try, and one retry with a FRESH presign -- a signed URL
 *  names one staged object, so a failed attempt cannot simply be aimed at the
 *  same one twice. Measured against the real database: 9 of 1,972 Collection
 *  photographs took the fallback in 2026, in bursts from single sessions,
 *  which reads as a flaky connection rather than a systemic failure -- and a
 *  flaky connection is exactly what one retry answers. */
const MAX_ATTEMPTS = 2;

/** One attempt's outcome: the staged object on success, `"unavailable"` when
 *  the direct path is off the table for good (no R2 configured, a 4xx that a
 *  retry cannot change), or `"retry"` for a transient failure worth trying
 *  once more. Throws instead, past either fetch, only for a 400 carrying a
 *  real verdict about the FILE -- over the size limit, an unsupported format
 *  -- which a retry cannot fix either. */
type DirectAttempt = { key: string; publicUrl: string } | "unavailable" | "retry";

async function attemptDirectUpload(
  file: File,
  kind: "post" | "collection",
  deadlineMs: number | undefined,
  attempt: number
): Promise<DirectAttempt> {
  const lastTry = attempt >= MAX_ATTEMPTS;
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
    console.warn(
      `[upload] presign unreachable; ${lastTry ? "falling back to the server proxy" : "retrying once with a fresh presign"}`,
      err
    );
    return "retry";
  }

  // A 400 is a real verdict about the file (unsupported format, too big),
  // not an availability problem; retrying it through the fallback would
  // just fail slower with a worse message.
  if (status === 400 && presign.error) throw new Error(presign.error);
  if (!presign.direct || !presign.signedUrl || !presign.key || !presign.publicUrl) {
    /* A deliberate `{direct:false}` (storage not configured, every local dev
       run) is never retried -- a second presign would answer exactly the
       same. Anything else that came back without the fields a direct upload
       needs -- a 5xx, a body that failed to parse -- gets the one retry a bad
       minute deserves. */
    return status >= 500 ? "retry" : "unavailable";
  }

  try {
    const put = await fetch(presign.signedUrl, {
      method: "PUT",
      // The type the URL was signed with, which for a blank-MIME file is the
      // one the server derived from the name; sending anything else fails the
      // signature.
      headers: { "Content-Type": presign.contentType ?? file.type },
      body: file,
      signal: deadlineMs !== undefined ? AbortSignal.timeout(deadlineMs) : undefined,
    });
    if (!put.ok) {
      console.warn(
        `[upload] direct PUT refused (${put.status}); ${lastTry ? "falling back to the server proxy" : "retrying once with a fresh presign"}`
      );
      // R2's problem, not the request's, when it is a 5xx -- worth the one
      // retry. A 4xx (a bad signature, a refused type) will answer the same
      // way twice, so it goes straight to the fallback.
      return put.status >= 500 ? "retry" : "unavailable";
    }
  } catch (err) {
    /* Indistinguishable from here whether the browser blocked this (an origin
       not named in the bucket's CORS allowlist, or the S3 endpoint missing
       from the CSP's connect-src -- the pair that hid direct uploads for
       weeks) or the connection actually dropped: both throw the same opaque
       error. Retrying costs one extra round trip on the rare CORS case and
       rescues every flaky-connection one, which the burst pattern in the
       database says is the far more common real cause. */
    console.warn(
      `[upload] direct PUT blocked or timed out; ${lastTry ? "falling back to the server proxy" : "retrying once with a fresh presign"}`,
      err
    );
    return "retry";
  }

  return { key: presign.key, publicUrl: presign.publicUrl };
}

/**
 * The client half of the direct-to-R2 upload path, shared by the post
 * composer and the Collection contribute dialog so the presign contract
 * (and its CORS-failure fallback behaviour) lives in exactly one place.
 *
 * The bucket's CORS rule is live (applied 2026-07-30), so this is the path a
 * browser normally takes.
 *
 * A transient failure -- a network error, a timeout, or a 5xx from either the
 * presign call or the PUT itself -- gets ONE retry with a FRESH presign
 * before giving up (see `attemptDirectUpload`). A definitive answer (storage
 * not configured, a 4xx that will not change on a second try) is never
 * retried.
 *
 * Returns the staged object's key/publicUrl on success, or null whenever the
 * direct path is unavailable anyway: no R2 configured locally, a presign or
 * PUT failure that survived the retry, or an origin the CORS rule does not
 * name (a new domain, a Vercel preview URL). The caller then falls back to
 * its classic server-proxied upload, which is capped at ~4.5MB on Vercel but
 * is better than stranding the photo. A definitive validation error (bad
 * type, over the size limit) is thrown instead, so callers surface it rather
 * than silently retrying a file the server will always refuse.
 */
export async function directUploadPut(
  file: File,
  kind: "post" | "collection",
  opts?: {
    /** A deadline for one attempt's PUT, in milliseconds -- remade FRESH for
     *  the retry, deliberately a number rather than a premade `AbortSignal`:
     *  a signal the caller minted once would already be spent by the first
     *  attempt's timeout, and a spent signal aborts the second attempt before
     *  it starts. Without one at all a request that neither answers nor
     *  fails holds its caller open for ever -- which a single photograph in a
     *  composer can afford and a wall of two hundred cannot, because the
     *  lanes uploading them are a fixed pool and three stuck files stall the
     *  other hundred and ninety-seven. On abort this falls back to the server
     *  proxy exactly as a blocked PUT does. */
    deadlineMs?: number;
  }
): Promise<{ key: string; publicUrl: string } | null> {
  let result: DirectAttempt = "retry";
  for (let attempt = 1; attempt <= MAX_ATTEMPTS && result === "retry"; attempt++) {
    result = await attemptDirectUpload(file, kind, opts?.deadlineMs, attempt);
  }
  return result === "unavailable" || result === "retry" ? null : result;
}

/**
 * One image, uploaded, and the url it landed on.
 *
 * The whole ceremony in one call, for the surfaces that take a SINGLE picture
 * and have nothing to say while it climbs: presign the PUT straight to R2, ask
 * `/api/upload/finalize` to turn the staged full-resolution original into the
 * display WebP, and fall back to the classic proxied POST -- browser-downscaled,
 * because that is the path Vercel's ~4.5MB body cap can actually bite -- when
 * the direct one is unavailable.
 *
 * The composer keeps its own copy of this rather than calling here, and that is
 * not duplication left lying around: it uploads a BATCH, it keeps the facts
 * each response carries so its crop handle opens where the card draws, and it
 * reports "3 of 5". None of that collapses into a helper without making the
 * helper worse for the caller that wants one line.
 *
 * Throws on failure, with a sentence the caller can toast.
 */
export async function uploadOneImage(file: File, subject = "That picture"): Promise<string> {
  const staged = await directUploadPut(file, "post");
  if (staged) {
    const fin = await fetch("/api/upload/finalize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keys: [staged.key] }),
    });
    const data = await fin.json().catch(() => ({}));
    if (fin.ok && data.urls?.[0]) {
      announceUploadNotices(data.notices);
      return data.urls[0] as string;
    }
    throw new Error(data.error || `${subject} did not upload. Try again.`);
  }
  // Only the fallback shrinks: the direct path PUTs the original untouched,
  // which is the whole point of it (owner, 2026-07-30).
  const shrunk = await downscaleImage(file);
  const { urls } = await postImages([shrunk], { subject });
  return urls[0];
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
