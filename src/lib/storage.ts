import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { writeFile, mkdir, unlink, readFile } from "fs/promises";
import path from "path";

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

/** Delete an object by its raw key (for cleaning up presigned originals
 *  that fail validation or finish processing). Best-effort. */
export async function delImageByKey(key: string): Promise<void> {
  try {
    if (useR2) {
      await r2().send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: key }));
    } else {
      await unlink(path.join(process.cwd(), "public", key));
    }
  } catch {
    // best-effort cleanup
  }
}

/**
 * The object key behind one of OUR public URLs, or null when the URL does not
 * belong to this store (a legacy host, an external image). Null means "not
 * ours": callers should leave such a URL alone rather than guess a key for it.
 */
export function keyForUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (useR2 && R2_PUBLIC_BASE_URL && url.startsWith(R2_PUBLIC_BASE_URL)) {
    return url.slice(R2_PUBLIC_BASE_URL.length + 1);
  }
  // A root-relative path is ours whether or not R2 is configured: rows written
  // before the R2 migration still carry local paths, and they resolve against
  // public/ in both modes. Matching the pre-refactor delImage exactly.
  if (url.startsWith("/")) return url.slice(1);
  return null;
}

/** Delete an image by its public URL (best-effort; never throws). Derives
 *  the object key and hands off to `delImageByKey`, so the actual R2-vs-local
 *  delete logic lives in exactly one place. */
export async function delImage(url: string | null | undefined): Promise<void> {
  const key = keyForUrl(url);
  if (key) await delImageByKey(key);
  // Any other remote URL (e.g. a legacy host) is left alone on purpose.
}
