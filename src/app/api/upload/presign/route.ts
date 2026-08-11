import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createId } from "@paralleldrive/cuid2";
import { directUploadAvailable, presignImagePut } from "@/lib/storage";
import { MAX_UPLOAD_BYTES } from "@/lib/upload-shared";
import { requireVerifiedEmail } from "@/lib/email-verification";

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


const EXT_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // The most important of the three upload gates. What this route hands back
  // is a signed URL that writes DIRECTLY into the bucket with no further pass
  // through our code, so it is the last point at which we get a say. An
  // unconfirmed account must never be issued one.
  const gate = await requireVerifiedEmail();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: 403 });
  }

  let body: { kind?: string; contentType?: string; bytes?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const { kind, contentType, bytes } = body;
  if (kind !== "post" && kind !== "collection") {
    return NextResponse.json({ error: "Unknown upload kind" }, { status: 400 });
  }

  const ext = contentType ? EXT_BY_TYPE[contentType] : undefined;
  if (!ext) {
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

  const id = createId();
  const target =
    kind === "post"
      ? { subdir: "staging", filename: `${id}.${ext}` }
      : { subdir: "collection", filename: `${id}-o.${ext}` };

  const { key, signedUrl, publicUrl } = await presignImagePut(
    target.subdir,
    target.filename,
    contentType as string
  );
  return NextResponse.json({ direct: true, key, signedUrl, publicUrl });
}
