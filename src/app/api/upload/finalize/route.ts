import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createId } from "@paralleldrive/cuid2";
import {
  getImageBuffer,
  putImage,
  delImageByKey,
  headObjectSize,
  keyBelongsTo,
  ownerPrefix,
} from "@/lib/storage";
import { sharpImage } from "@/lib/image";
import { MAX_UPLOAD_BYTES, describeProcessingError, sniffImageType } from "@/lib/upload-shared";
import { requireVerifiedMember } from "@/lib/member-gate";
import { rateLimit } from "@/lib/rate-limit";
import { originAllowed } from "@/lib/origin-rule";

/**
 * Step two of the direct-to-R2 POST-image path: the browser has PUT the
 * original(s) into `staging/` via a presigned URL; this turns each into the
 * feed's display WebP (1920, q80 - same recipe as the classic /api/upload
 * proxy route) and deletes the staged original. Posts keep their tight
 * display size; the no-cap win is that the SOURCE arriving here can be the
 * full 20MB original instead of a browser-downscaled copy.
 */

const MAX_FILES = 3;
// Only objects this route's own presign step created may be named, AND only
// ones staged under the CALLER's own prefix: `staging/<their id>/...`. The
// shape is checked here; the ownership half (the id segment must be the
// session user's) is enforced with keyBelongsTo below, so a caller cannot
// finalize — and thereby have us fetch and re-serve — another member's staged
// bytes (audit C2).
const STAGING_KEY = /^staging\/[a-z0-9]+\/\d{4}\/\d{2}\/[a-z0-9]+\.(jpg|jpeg|png|webp|gif)$/;


export async function POST(request: Request) {
  // A cross-site page must not be able to spend this cookie (audit M33).
  if (!originAllowed(request.headers.get("origin"), request.headers.get("host"))) {
    return NextResponse.json({ error: "Cross-site call refused" }, { status: 403 });
  }

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

  // One hourly uploads allowance per account, shared across every route
  // bytes can travel through (audit M2).
  const limited = await rateLimit("uploads", session.user.id);
  if (!limited.ok) {
    return NextResponse.json({ error: limited.error }, { status: 429 });
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
  if (keys.some((k) => !STAGING_KEY.test(k) || !keyBelongsTo(k, session.user.id, "staging"))) {
    return NextResponse.json({ error: "Bad staging key" }, { status: 400 });
  }

  const urls: string[] = [];
  for (const key of keys) {
    try {
      // Size is checked with a HEAD before the bytes are pulled into memory: a
      // presigned PUT cannot enforce a limit (R2 has no content-length-range),
      // so an oversized object is deleted without ever being fetched — closing
      // the memory-amplification window a post-download check would leave open
      // (audit M16).
      const staged = await headObjectSize(key);
      if (staged !== null && staged > MAX_UPLOAD_BYTES + 1024) {
        await delImageByKey(key);
        return NextResponse.json({ error: "Photo is over the 20MB limit" }, { status: 400 });
      }

      const original = await getImageBuffer(key);
      if (original.byteLength > MAX_UPLOAD_BYTES + 1024) {
        // Belt to the HEAD's braces (a HEAD that could not read the size
        // returns null and falls through to here).
        await delImageByKey(key);
        return NextResponse.json({ error: "Photo is over the 20MB limit" }, { status: 400 });
      }
      if (!sniffImageType(original)) {
        await delImageByKey(key);
        return NextResponse.json(
          { error: "That upload doesn't look like a JPG, PNG, GIF or WebP image." },
          { status: 400 }
        );
      }
      const webp = await sharpImage(original)
        .rotate()
        .resize(1920, 1920, { fit: "inside", withoutEnlargement: true })
        .webp({ quality: 80 })
        .toBuffer();
      const url = await putImage(webp, ownerPrefix("uploads", session.user.id), `${createId()}.webp`);
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
