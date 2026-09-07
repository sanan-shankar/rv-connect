import { NextResponse } from "next/server";
import { createId } from "@paralleldrive/cuid2";
import {
  getImageBuffer,
  putImage,
  publicUrlForKey,
  headObjectSize,
  keyBelongsTo,
  ownerPrefix,
} from "@/lib/storage";
import { countImageFrames, describeImage, toDisplayWebp, type ImageFacts } from "@/lib/image";
import { recordImage } from "@/lib/image-record";
import { purgeImageKey, purgeImageUrls } from "@/lib/image-purge";
import {
  MAX_UPLOAD_BYTES,
  describeProcessingError,
  sniffImageType,
  stillPictureNotice,
} from "@/lib/upload-shared";
import { vetUploadRequest } from "@/lib/api-gate";
// The one argued-for "three photos per post" cap, from the pure rule module
// the ownership check already uses. Each upload door used to retype it.
import { MAX_IMAGES } from "@/lib/upload-ownership-rule";

/** The direct path's finish: reads each staged original back out of R2 and
 *  re-encodes it, so it does the same work as the proxied route above.
 *  Reasoning on the Collection page (audit C-079). */
export const maxDuration = 60;

/**
 * Step two of the direct-to-R2 POST-image path: the browser has PUT the
 * original(s) into `staging/` via a presigned URL; this turns each into the
 * feed's display WebP (1920, q80 - same recipe as the classic /api/upload
 * proxy route) and deletes the staged original. Posts keep their tight
 * display size; the no-cap win is that the SOURCE arriving here can be the
 * full 20MB original instead of a browser-downscaled copy.
 */

// Only objects this route's own presign step created may be named, AND only
// ones staged under the CALLER's own prefix: `staging/<their id>/...`. The
// shape is checked here; the ownership half (the id segment must be the
// session user's) is enforced with keyBelongsTo below, so a caller cannot
// finalize — and thereby have us fetch and re-serve — another member's staged
// bytes (audit C2).
const STAGING_KEY = /^staging\/[a-z0-9]+\/\d{4}\/\d{2}\/[a-z0-9]+\.(jpg|jpeg|png|webp|gif)$/;


export async function POST(request: Request) {
  // Presign already refuses an unconfirmed account, so nothing this route
  // could name should exist. Gated anyway: it reads an object out of the
  // bucket and writes a new one back, naming the source by key from the
  // request body, so it is its own write path rather than a continuation of
  // the last one.
  const vet = await vetUploadRequest(request);
  if (!vet.ok) return vet.response;

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
  if (keys.length > MAX_IMAGES) {
    return NextResponse.json({ error: `Maximum ${MAX_IMAGES} images allowed` }, { status: 400 });
  }
  const own = (k: string) => STAGING_KEY.test(k) && keyBelongsTo(k, vet.userId, "staging");
  if (!keys.every(own)) {
    // The keys that DID check out are the caller's own staged objects and
    // nothing will name them again; only the ones we cannot vouch for are left
    // alone (aiming a delete at a caller-supplied key is the C2 hole).
    await purgeImageUrls(keys.filter(own).map(publicUrlForKey), "abandoned");
    return NextResponse.json({ error: "Bad staging key" }, { status: 400 });
  }

  const urls: string[] = [];
  /** What each stored image turned out to look like -- same shape and the same
   *  reason as the classic route's, because the composer reads both the same
   *  way. */
  const images: (ImageFacts & { url: string })[] = [];
  /** Anything we changed about the file, said out loud -- same shape as the
   *  classic route's response, because the composer shows both the same way. */
  const notices: string[] = [];
  /* Up to three originals were staged in one presign round, and each loop pass
     stores a processed WebP. A refusal partway through returned an error while
     leaving BOTH the WebPs already stored and the originals still staged for
     the keys the loop had not reached -- objects no row names and nothing can
     list (audit C-064). Every exit now takes the lot. */
  const abort = async (body: { error: string }, status: number, from: number) => {
    await purgeImageUrls(
      [...urls, ...keys.slice(from + 1).map(publicUrlForKey)],
      "abandoned"
    );
    return NextResponse.json(body, { status });
  };

  for (const [i, key] of keys.entries()) {
    try {
      // Size is checked with a HEAD before the bytes are pulled into memory: a
      // presigned PUT cannot enforce a limit (R2 has no content-length-range),
      // so an oversized object is deleted without ever being fetched — closing
      // the memory-amplification window a post-download check would leave open
      // (audit M16).
      const staged = await headObjectSize(key);
      if (staged !== null && staged > MAX_UPLOAD_BYTES + 1024) {
        return abort({ error: "Photo is over the 20MB limit" }, 400, i);
      }

      const original = await getImageBuffer(key);
      if (original.byteLength > MAX_UPLOAD_BYTES + 1024) {
        // Belt to the HEAD's braces (a HEAD that could not read the size
        // returns null and falls through to here).
        return abort({ error: "Photo is over the 20MB limit" }, 400, i);
      }
      if (!sniffImageType(original)) {
        return abort(
          { error: "That upload doesn't look like a JPG, PNG, GIF or WebP image." },
          400,
          i
        );
      }
      // An animated GIF is about to become a still. Cheap (metadata only) and
      // never a reason to fail an upload that otherwise worked.
      if ((await countImageFrames(original)) > 1) notices.push(stillPictureNotice());

      const webp = await toDisplayWebp(original);
      const url = await putImage(webp, ownerPrefix("uploads", vet.userId), `${createId()}.webp`);
      urls.push(url);
      const facts = await describeImage(webp);
      if (facts) {
        images.push({ url, ...facts });
        await recordImage(url, facts);
      }
    } catch (error) {
      console.error("Finalize processing error:", error);
      return abort({ error: describeProcessingError(error) }, 422, i);
    } finally {
      // The staged original's job is done either way. Queued for the nightly
      // retry if storage refuses, rather than logged and lost (audit C-069).
      await purgeImageKey(key, "staged");
    }
  }

  return NextResponse.json(notices.length > 0 ? { urls, images, notices } : { urls, images });
}
