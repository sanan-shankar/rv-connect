import { NextResponse } from "next/server";
import { createId } from "@paralleldrive/cuid2";
import { directUploadAvailable, presignImagePut, ownerPrefix } from "@/lib/storage";
import { MAX_UPLOAD_BYTES, storedImageFormat } from "@/lib/upload-shared";
import { vetUploadRequest } from "@/lib/api-gate";

/**
 * Step one of the direct-to-R2 upload path. Vercel caps serverless request
 * bodies at ~4.5MB no matter what `bodySizeLimit` says, which is why photos
 * used to be downscaled in the browser before upload. Presigning moves the
 * bytes browser -> R2 directly, so a full-resolution 20MB original reaches
 * storage untouched.
 *
 * kind "post": staged under `staging/`; /api/upload/finalize turns it into
 *   the feed's display WebP and deletes the staged original.
 * kind "collection": lands under `collection/` as a `-o` original that IS
 *   the stored full-resolution photo; the contributePhotoDirect action
 *   builds the thumbnail off it and records the row.
 *
 * When R2 isn't configured (local dev), responds `direct: false` and the
 * client uses the old proxy-through-the-server path, which has no platform
 * body cap locally.
 */

export async function POST(request: Request) {
  /* The body is read BEFORE the gate, and only because the gate needs to know
     which hourly allowance to charge: a Collection contribution is metered
     separately from a post image (rate-limit.ts). Nothing about the gate
     itself moved -- no signature is minted, nothing is read from the database
     and no bytes move until it has passed. Parsing a JSON body is what every
     route does for an unauthenticated caller anyway. */
  let body: { kind?: string; contentType?: string; bytes?: number; filename?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const { kind, contentType, bytes, filename } = body;
  if (kind !== "post" && kind !== "collection") {
    return NextResponse.json({ error: "Unknown upload kind" }, { status: 400 });
  }

  // The most important of the three doors. What this route hands back is a
  // signed URL that writes DIRECTLY into the bucket with no further pass
  // through our code, so it is the last point at which we get a say.
  const vet = await vetUploadRequest(
    request,
    kind === "collection" ? "collectionUploads" : "uploads"
  );
  if (!vet.ok) return vet.response;

  // A blank MIME type falls back to the filename; a present, unsupported one
  // does not (audit C-066).
  const format = storedImageFormat(contentType, filename);
  if (!format) {
    // HEIC/HEIF lands here on purpose: sharp's prebuilt binary can't decode
    // it, so it is rejected before any bytes move.
    return NextResponse.json(
      {
        error:
          "That photo format isn't supported. Export it as JPG or PNG (or turn off \"High Efficiency\" in your camera settings) and try again.",
      },
      { status: 400 }
    );
  }

  if (typeof bytes !== "number" || bytes <= 0 || bytes > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      { error: `Photos can be up to 20MB (this one is ${((bytes ?? 0) / (1024 * 1024)).toFixed(1)}MB)` },
      { status: 400 }
    );
  }

  if (!directUploadAvailable()) {
    return NextResponse.json({ direct: false });
  }

  /* Both kinds stage under `staging/`, and the Collection's used to stage
     under `collection/` instead. That was a real leak rather than untidiness:
     an abandoned drop leaves its original behind for ever, nothing in this
     system can enumerate the bucket to find it (audit C-063), and a lifecycle
     rule cannot clean it up because R2 matches a PREFIX and the archive's own
     photographs share that prefix. Measured on 2026-08-28: sixty stranded
     originals from one day of use, one of them confirmed publicly readable --
     and these are the untouched files, so a phone photo's original still
     carries the GPS coordinates it was taken at, which is the whole reason
     the successful path deletes it (audit M12).

     Under `staging/` one lifecycle rule closes it permanently, and the folder
     finally means what its name says: nothing in here is anybody's.

     Both are still scoped to the uploader, so finalize can prove the caller
     owns the key it names rather than trusting a path in the body (audit C2).
     The `-o` suffix stays, and does a second job now: `STAGING_KEY` in the
     post finalize route is `[a-z0-9]+\.` with no hyphen, so a Collection
     original cannot be finalized as a post image even though they now share a
     root. */
  const id = createId();
  const target =
    kind === "post"
      ? { subdir: ownerPrefix("staging", vet.userId), filename: `${id}.${format.ext}` }
      : { subdir: ownerPrefix("staging", vet.userId), filename: `${id}-o.${format.ext}` };

  const { key, signedUrl, publicUrl } = await presignImagePut(
    target.subdir,
    target.filename,
    format.contentType
  );
  // The PUT must carry the type it was SIGNED with, which is not necessarily
  // the one the browser knows about.
  return NextResponse.json({
    direct: true,
    key,
    signedUrl,
    publicUrl,
    contentType: format.contentType,
  });
}
