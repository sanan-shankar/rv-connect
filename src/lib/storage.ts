import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  CopyObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { writeFile, mkdir, unlink, readFile } from "fs/promises";
import path from "path";
import { publicBaseFor } from "@/lib/upload-shared";

/**
 * Storage shim: the one place that knows where image bytes live.
 * Cloudflare R2 in production (zero egress, global edge), local filesystem in
 * dev. R2 is S3-compatible, so we talk to it with the AWS S3 client. Switching
 * providers again later is a change in this file only.
 */
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET = process.env.R2_BUCKET;
// Public base URL objects are served from (r2.dev subdomain or a custom
// domain). No trailing slash.
const R2_PUBLIC_BASE_URL = process.env.R2_PUBLIC_BASE_URL?.replace(/\/+$/, "");

const useR2 = !!(
  R2_ACCOUNT_ID &&
  R2_ACCESS_KEY_ID &&
  R2_SECRET_ACCESS_KEY &&
  R2_BUCKET &&
  R2_PUBLIC_BASE_URL
);

let _client: S3Client | null = null;
function r2(): S3Client {
  if (!_client) {
    _client = new S3Client({
      region: "auto",
      endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: R2_ACCESS_KEY_ID as string,
        secretAccessKey: R2_SECRET_ACCESS_KEY as string,
      },
    });
  }
  return _client;
}

/** Build the year/month-partitioned object key. */
function buildKey(subdir: string, filename: string): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${subdir}/${year}/${month}/${filename}`;
}

/**
 * The top-level areas of the bucket this app ever writes to. Anything outside
 * them is not ours, and `keyForUrl` refuses to derive a key for it, so a
 * deletion can never be aimed at an arbitrary path even if a raw URL reached it
 * (audit C2 — "stop keyForUrl accepting caller URLs").
 */
/*
 * `audio` joined on 2026-09-14 (Catch-ups rework phase 12: a question you
 * answer out loud), and it is argued here because this list is the fence and
 * an earlier root was rightly backed out of it.
 *
 * `link-previews/` stays OUT. A preview image is shared by every answer that
 * pastes the same link and belongs to nobody, so a delete path trusting a
 * stored URL could take an image other members' answers still show.
 *
 * `audio/` is the other case, and the same shape as `uploads/`. Every key
 * under it is `audio/<uploader's id>/...`, written by the finalize route with
 * the session's id and no caller input (see `ownerPrefix`). Nothing reaches a
 * row without `ownedVoiceRecording` proving that id is the caller's, so a
 * stored recording URL can only ever name its own author's bytes. And it has
 * to be here: without it `keyForUrl` answers null, `delImage` reads that as
 * "not ours" and returns true, and the account purge would report a member's
 * voice deleted while it stayed publicly fetchable.
 */
const KNOWN_ROOTS = ["uploads", "collection", "avatars", "staging", "audio"] as const;
export type UploadPurpose = (typeof KNOWN_ROOTS)[number];

/**
 * The owner-scoped subdirectory a member's uploads live under:
 * `<purpose>/<userId>`, e.g. `uploads/clx.../2026/08/<cuid>.webp` after
 * `buildKey` adds the date partition (audit C2).
 *
 * The key is written by the server with the uploader's own id baked in, and no
 * request body can change it. That is what makes ownership provable at write
 * time: a post may only reference an image URL whose key sits under the
 * caller's own `uploads/<their id>/` prefix (see `keyBelongsTo` and
 * upload-ownership.ts), so member A can no longer smuggle member B's — or the
 * heritage Collection's — object URL into a post and then delete the post to
 * destroy it. The id is a public cuid (it is already in every /profile URL),
 * so putting it in the path leaks nothing.
 */
export function ownerPrefix(purpose: UploadPurpose, userId: string): string {
  return `${purpose}/${userId}`;
}

/** Whether an object key sits under a specific member's area of a purpose,
 *  i.e. `<purpose>/<userId>/...`. The ownership test the direct-upload
 *  finalize paths apply to a caller-named staged key (audit C2). */
export function keyBelongsTo(
  key: string,
  userId: string,
  purpose: UploadPurpose
): boolean {
  return key.startsWith(`${purpose}/${userId}/`);
}

/** Store a processed image buffer and return its public URL. */
export async function putImage(
  buffer: Buffer,
  subdir: string,
  filename: string
): Promise<string> {
  const key = buildKey(subdir, filename);

  if (useR2) {
    await r2().send(
      new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: key,
        Body: buffer,
        ContentType: "image/webp",
        // Images are content-addressed (cuid filenames), so cache forever.
        CacheControl: "public, max-age=31536000, immutable",
      })
    );
    return `${R2_PUBLIC_BASE_URL}/${key}`;
  }

  const dir = path.join(process.cwd(), "public", path.dirname(key));
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(process.cwd(), "public", key), buffer);
  return `/${key}`;
}

/**
 * Whether direct-to-R2 presigned uploads are available. When false (local
 * dev without R2 env), callers fall back to proxying bytes through the
 * server, which is fine locally: only Vercel imposes the ~4.5MB request
 * body cap that presigning exists to dodge.
 */
export function directUploadAvailable(): boolean {
  return useR2;
}

/**
 * Presign a direct browser PUT to R2. This is how a 20MB original reaches
 * storage at full resolution on Vercel: the bytes go browser -> R2, never
 * through a serverless function, so the platform's ~4.5MB request cap
 * never applies. Returns the key (for a later server-side fetch), the
 * one-time signed URL, and the public URL the object will live at.
 *
 * NOTE: the R2 bucket must have a CORS rule allowing PUT from the site
 * origin. Applied for `rv-alumni-media` on 2026-07-30 by hand from the
 * Cloudflare dashboard, which is the only way it has ever been done: the
 * app's R2 token is object-scoped, so the API route to the same change
 * returns AccessDenied.
 *
 * That rule is live and the problem is closed, but it is an allowlist. Any
 * NEW origin (a fresh domain, a Vercel preview URL) has to be added to it in
 * the dashboard, or uploads from there quietly take the slower proxied path
 * instead of failing loudly.
 */
export async function presignImagePut(
  subdir: string,
  filename: string,
  contentType: string
): Promise<{ key: string; signedUrl: string; publicUrl: string }> {
  if (!useR2) throw new Error("Direct upload unavailable without R2");
  const key = buildKey(subdir, filename);
  const signedUrl = await getSignedUrl(
    r2(),
    new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      ContentType: contentType,
      CacheControl: "public, max-age=31536000, immutable",
    }),
    { expiresIn: 600 }
  );
  return { key, signedUrl, publicUrl: `${R2_PUBLIC_BASE_URL}/${key}` };
}

/**
 * Move a checked object to where it will live, under a date-partitioned key,
 * and return its public URL. The object is COPIED (the caller deletes the
 * source), with its type and cache headers set afresh rather than inherited
 * from whatever the browser's PUT said.
 *
 * Used by the recording path, which stores the browser's bytes untouched: there
 * is nothing to re-encode, so a GET and a PUT back through a function would only
 * spend memory. R2 implements CopyObject with `MetadataDirective: REPLACE`.
 */
export async function copyObject(
  fromKey: string,
  subdir: string,
  filename: string,
  contentType: string
): Promise<string> {
  const key = buildKey(subdir, filename);
  if (useR2) {
    await r2().send(
      new CopyObjectCommand({
        Bucket: R2_BUCKET,
        // Encoded per segment, as CopyObject requires. Today's keys are cuids
        // and a fixed extension, so this changes nothing until a key does.
        CopySource: `${R2_BUCKET}/${fromKey.split("/").map(encodeURIComponent).join("/")}`,
        Key: key,
        MetadataDirective: "REPLACE",
        ContentType: contentType,
        CacheControl: "public, max-age=31536000, immutable",
      })
    );
    return `${R2_PUBLIC_BASE_URL}/${key}`;
  }
  const { copyFile } = await import("fs/promises");
  await mkdir(path.join(process.cwd(), "public", path.dirname(key)), { recursive: true });
  await copyFile(path.join(process.cwd(), "public", fromKey), path.join(process.cwd(), "public", key));
  return `/${key}`;
}

/**
 * The first `count` bytes of an object (a ranged GET), for reading a file's
 * magic number without pulling the whole thing into memory. Null when the
 * object cannot be read.
 */
export async function readObjectHead(key: string, count: number): Promise<Uint8Array | null> {
  try {
    if (useR2) {
      const res = await r2().send(
        new GetObjectCommand({ Bucket: R2_BUCKET, Key: key, Range: `bytes=0-${count - 1}` })
      );
      const bytes = await res.Body?.transformToByteArray();
      return bytes ? bytes.subarray(0, count) : null;
    }
    const { open } = await import("fs/promises");
    const handle = await open(path.join(process.cwd(), "public", key), "r");
    try {
      const buffer = Buffer.alloc(count);
      const { bytesRead } = await handle.read(buffer, 0, count, 0);
      return new Uint8Array(buffer.subarray(0, bytesRead));
    } finally {
      await handle.close();
    }
  } catch {
    return null;
  }
}

/** The public URL a raw object key serves from. */
export function publicUrlForKey(key: string): string {
  return useR2 ? `${R2_PUBLIC_BASE_URL}/${key}` : `/${key}`;
}

/** Fetch an object's bytes back (for post-upload processing: thumbnails,
 *  display sizes). Works for both R2 keys and local dev paths. */
export async function getImageBuffer(key: string): Promise<Buffer> {
  if (useR2) {
    const res = await r2().send(new GetObjectCommand({ Bucket: R2_BUCKET, Key: key }));
    const bytes = await res.Body?.transformToByteArray();
    if (!bytes) throw new Error(`Empty object at ${key}`);
    return Buffer.from(bytes);
  }
  return readFile(path.join(process.cwd(), "public", key));
}

/**
 * The byte length of an object without downloading it (a HEAD, not a GET), or
 * null if it cannot be read. Used before pulling a presigned original into a
 * serverless function's memory: R2 cannot enforce a size limit on a presigned
 * PUT (unlike S3's presigned POST `content-length-range`, which R2 does not
 * implement — verified against Cloudflare's S3 compatibility docs, Aug 2026),
 * so a client can PUT bytes far larger than it declared. Checking the size
 * with a HEAD first means an oversized object is deleted without ever being
 * fetched, closing the memory-amplification window (audit M16).
 */
export async function headObjectSize(key: string): Promise<number | null> {
  if (!useR2) {
    try {
      const { stat } = await import("fs/promises");
      const s = await stat(path.join(process.cwd(), "public", key));
      return s.size;
    } catch {
      return null;
    }
  }
  try {
    const res = await r2().send(new HeadObjectCommand({ Bucket: R2_BUCKET, Key: key }));
    return res.ContentLength ?? null;
  } catch {
    return null;
  }
}

/**
 * Delete an object by its raw key (for cleaning up presigned originals that
 * fail validation or finish processing). Never throws; returns whether the
 * object is gone.
 *
 * The catch block used to be empty -- the one site in the codebase that broke
 * the repo's own "a guard that hides its own breakage is worse than no guard"
 * rule. It mattered most where it was quietest: the account purge deletes the
 * pointing rows first, so a silent miss here left the bytes publicly fetchable
 * with nothing left able to enumerate them, while the audit line said they had
 * been removed. Callers that care now get a boolean, and every failure names
 * its key in the log whatever the environment -- this is a moderation and GDPR
 * path, not per-page telemetry.
 */
export async function delImageByKey(key: string): Promise<boolean> {
  try {
    if (useR2) {
      await r2().send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: key }));
    } else {
      await unlink(path.join(process.cwd(), "public", key));
    }
    return true;
  } catch (err) {
    // Already gone counts as gone. R2's DeleteObject is idempotent and answers
    // 204 for a key that was never there; on the local-dev filesystem the same
    // situation surfaces as ENOENT, and neither is a failure worth reporting.
    if ((err as NodeJS.ErrnoException)?.code === "ENOENT") return true;
    console.error(
      `[storage] could not delete ${key}:`,
      err instanceof Error ? err.message : err
    );
    return false;
  }
}

/**
 * The object key behind one of OUR public URLs, or null when the URL does not
 * belong to this store (an external image). Null means "not ours": callers
 * should leave such a URL alone rather than guess a key for it.
 *
 * Matched against every base this bucket has been served from, not just the one
 * configured today. Serving moved to a custom domain on 2026-08-21, and a URL
 * written before then that this function refused to recognise would be a
 * photograph whose bytes survive its own deletion, silently and for ever. See
 * `publicBaseFor` for the list and the reasoning.
 */
export function keyForUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  let key: string | null = null;
  const base = useR2 ? publicBaseFor(url) : null;
  if (base) {
    key = url.slice(base.length + 1);
  } else if (url.startsWith("/")) {
    // A root-relative path is ours whether or not R2 is configured: rows
    // written before the R2 migration still carry local paths, and they
    // resolve against public/ in both modes.
    key = url.slice(1);
  }
  if (!key) return null;
  // No traversal segment. On the local-dev filesystem branch the key is joined
  // onto public/ (getImageBuffer, delImageByKey, headObjectSize), and path.join
  // normalises "uploads/../../etc/passwd" straight out of that directory -- so
  // a "uploads/" prefix alone is not enough to keep a caller-influenced URL
  // contained. Rejected before the root check so it holds whatever the root is.
  // (On R2 a ".." is a literal object-key segment, not traversal, but the guard
  // costs nothing there.)
  if (key.split("/").includes("..")) return null;
  // The key must live under one of the roots this app actually writes to.
  // Refusing anything else means that even if a raw, caller-influenced URL ever
  // reaches a delete path, it cannot be turned into a key pointing at some
  // arbitrary object — the last backstop behind write-time ownership (audit C2).
  const root = key.split("/", 1)[0];
  if (!(KNOWN_ROOTS as readonly string[]).includes(root)) return null;
  return key;
}

/**
 * Delete an image by its public URL (never throws). Derives the object key and
 * hands off to `delImageByKey`, so the actual R2-vs-local delete logic lives in
 * exactly one place.
 *
 * True means "nothing of ours is left at that URL": either the object was
 * deleted, or the URL was never ours to begin with (a legacy host, an external
 * song artwork) and is left alone on purpose. False means we tried and failed,
 * which only the purge currently acts on.
 */
export async function delImage(url: string | null | undefined): Promise<boolean> {
  const key = keyForUrl(url);
  if (!key) return true;
  return delImageByKey(key);
}
