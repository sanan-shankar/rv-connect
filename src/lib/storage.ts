import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { writeFile, mkdir, unlink } from "fs/promises";
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

/** Delete an image by its public URL (best-effort; never throws). */
export async function delImage(url: string | null | undefined): Promise<void> {
  if (!url) return;
  try {
    if (useR2 && R2_PUBLIC_BASE_URL && url.startsWith(R2_PUBLIC_BASE_URL)) {
      const key = url.slice(R2_PUBLIC_BASE_URL.length + 1);
      await r2().send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: key }));
    } else if (url.startsWith("/")) {
      await unlink(path.join(process.cwd(), "public", url));
    }
    // Any other remote URL (e.g. a legacy host) is left alone on purpose.
  } catch {
    // best-effort cleanup
  }
}
