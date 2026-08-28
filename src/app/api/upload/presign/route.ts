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

  // Both the staging area and the Collection original are scoped to the
  // uploader, so the finalize step can prove the caller owns the key it names
  // rather than trusting an arbitrary path in the request body (audit C2).
  const id = createId();
  const target =
    kind === "post"
      ? { subdir: ownerPrefix("staging", vet.userId), filename: `${id}.${format.ext}` }
      : { subdir: ownerPrefix("collection", vet.userId), filename: `${id}-o.${format.ext}` };

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
