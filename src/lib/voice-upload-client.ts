/* ------------------------------------------------------------------ *
 *  A recording, from the browser into the bucket.
 *
 *  Two round trips, both built in phase 12 and unused until the owner picked
 *  the recorder (2026-10-09):
 *
 *    1. POST /api/upload/audio          a presigned PUT into `staging/<id>/`
 *    2. PUT  <the signed url>           the bytes, straight to R2
 *    3. POST /api/upload/audio/finalize the size, the magic bytes, then a
 *                                       server-side copy into `audio/<id>/`
 *
 *  Deliberately NOT folded into `upload-client.ts`. That file's whole shape is
 *  about photographs -- a server-proxied fallback that downscales through
 *  Sharp, `factsByUrl`, `announceUploadNotices` -- and none of it applies
 *  here: there is no server path for audio bytes at all (`/api/upload/audio`
 *  answers 503 when R2 is not configured, on purpose), nothing is transcoded,
 *  and there is nothing to measure.
 *
 *  THERE IS NO RETRY HERE EITHER, and that is the honest answer rather than a
 *  gap. A photograph can be re-sent silently because the member has moved on;
 *  a recording cannot be re-made from anything but the Blob this call is
 *  holding, so a failure has to reach the person who is still looking at the
 *  box. The recorder keeps the Blob, says "The recording didn't save." and
 *  puts a Try again under it -- which is a retry the member chose, at the
 *  moment they chose it, with the words they spoke still on screen.
 * ------------------------------------------------------------------ */

/** What a stored recording is, once: the three things an answer carries. The
 *  same shape `submitEntry`'s `audio` argument takes, so nothing re-maps it. */
export type StoredRecording = {
  url: string;
  seconds: number;
  /** The body was written down from speech rather than typed (`audioIsAuto`). */
  transcribed: boolean;
};

/** A request that neither answers nor fails leaves the box reading "Saving the
 *  recording." for ever (the wedged-busy shape of audit B-042). Two minutes at
 *  64 kbps is about a megabyte, so sixty seconds is a slow train and not a
 *  stuck request. */
const PUT_TIMEOUT_MS = 60_000;

async function parse(res: Response): Promise<Record<string, unknown>> {
  return (await res.json().catch(() => ({}))) as Record<string, unknown>;
}

/**
 * Upload `blob` and hand back the url an answer may point at.
 *
 * Throws with a sentence the caller can show. Every refusal below already
 * carries one written for a member (the routes' own copy), and the fallbacks
 * are only for a response that arrived with no body at all.
 */
export async function uploadRecording(
  blob: Blob,
  seconds: number,
  transcribed: boolean
): Promise<StoredRecording> {
  const presignRes = await fetch("/api/upload/audio", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    // `blob.type` is the browser's own `audio/webm;codecs=opus`; the route
    // drops the codec and signs the bare type, and hands it back below.
    body: JSON.stringify({ contentType: blob.type, bytes: blob.size, seconds }),
  }).catch(() => null);
  if (!presignRes) throw new Error("The recording didn't save. Check your connection and try again.");
  const presign = await parse(presignRes);
  if (!presignRes.ok) {
    throw new Error((presign.error as string) || "The recording didn't save. Try again.");
  }
  const { key, signedUrl, contentType } = presign as {
    key?: string;
    signedUrl?: string;
    contentType?: string;
  };
  if (!key || !signedUrl) throw new Error("The recording didn't save. Try again.");

  const put = await fetch(signedUrl, {
    method: "PUT",
    // The type the URL was signed with, never the browser's codec string:
    // anything else fails the signature.
    headers: { "Content-Type": contentType ?? blob.type },
    body: blob,
    signal: AbortSignal.timeout(PUT_TIMEOUT_MS),
  }).catch((err: unknown) => {
    /* Said out loud (audit C-158). A blocked PUT here is indistinguishable
       from a dropped connection -- an origin missing from the bucket's CORS
       allowlist and the S3 endpoint missing from the CSP's `connect-src` are
       the pair that hid direct uploads for weeks -- and this is the one place
       a recurrence would be diagnosable from. */
    console.warn("[voice] direct PUT blocked or timed out", err);
    return null;
  });
  if (!put?.ok) {
    if (put) console.warn(`[voice] direct PUT refused (${put.status})`);
    throw new Error("The recording didn't save. Check your connection and try again.");
  }

  const finalRes = await fetch("/api/upload/audio/finalize", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key, seconds }),
  }).catch(() => null);
  if (!finalRes) throw new Error("The recording didn't save. Check your connection and try again.");
  const done = await parse(finalRes);
  if (!finalRes.ok || typeof done.url !== "string") {
    throw new Error((done.error as string) || "The recording didn't save. Try again.");
  }
  return { url: done.url, seconds, transcribed };
}
