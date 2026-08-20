import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import sharp from "sharp";
import { createId } from "@paralleldrive/cuid2";
import { getImageBuffer, putImage, delImageByKey } from "@/lib/storage";
import { MAX_UPLOAD_BYTES, describeProcessingError } from "@/lib/upload-shared";
import { requireVerifiedMember } from "@/lib/member-gate";

/**
 * Step two of the direct-to-R2 POST-image path: the browser has PUT the
 * original(s) into `staging/` via a presigned URL; this turns each into the
 * feed's display WebP (1920, q80 - same recipe as the classic /api/upload
 * proxy route) and deletes the staged original. Posts keep their tight
 * display size; the no-cap win is that the SOURCE arriving here can be the
 * full 20MB original instead of a browser-downscaled copy.
 */

const MAX_FILES = 3;
// Only objects this route's own presign step created may be named; anything
// else in the bucket is not a staging area.
const STAGING_KEY = /^staging\/\d{4}\/\d{2}\/[a-z0-9]+\.(jpg|jpeg|png|webp|gif)$/;


export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Presign already refuses an unconfirmed account, so nothing it could name
  // here should exist. Gated anyway: this route reads an object out of the
  // bucket and writes a new one back, and it names the source by key from the
  // request body, so it is its own write path rather than a continuation of
  // the last one.
  const gate = await requireVerifiedMember();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: 403 });
  }

  let body: { keys?: string[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const keys = body.keys ?? [];
  if (keys.length === 0) {
    return NextResponse.json({ error: "No files provided" }, { status: 400 });
  }
  if (keys.length > MAX_FILES) {
    return NextResponse.json({ error: `Maximum ${MAX_FILES} images allowed` }, { status: 400 });
  }
  if (keys.some((k) => !STAGING_KEY.test(k))) {
    return NextResponse.json({ error: "Bad staging key" }, { status: 400 });
  }

  const urls: string[] = [];
  for (const key of keys) {
    try {
      const original = await getImageBuffer(key);
      if (original.byteLength > MAX_UPLOAD_BYTES + 1024) {
        // A presigned PUT cannot enforce size, so it is enforced here.
        await delImageByKey(key);
        return NextResponse.json({ error: "Photo is over the 20MB limit" }, { status: 400 });
      }
      const webp = await sharp(original)
        .rotate()
        .resize(1920, 1920, { fit: "inside", withoutEnlargement: true })
        .webp({ quality: 80 })
        .toBuffer();
      const url = await putImage(webp, "uploads", `${createId()}.webp`);
      urls.push(url);
    } catch (error) {
      console.error("Finalize processing error:", error);
      return NextResponse.json({ error: describeProcessingError(error) }, { status: 422 });
    } finally {
      // The staged original's job is done either way.
      await delImageByKey(key);
    }
  }

  return NextResponse.json({ urls });
}
