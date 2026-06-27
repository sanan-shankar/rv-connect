import { put, del } from "@vercel/blob";
import { writeFile, mkdir, unlink } from "fs/promises";
import path from "path";

/**
 * Storage shim: one place that knows where image bytes live.
 * Vercel Blob in production (reachable from any host, incl. Render), local
 * filesystem in dev. Swapping to Cloudflare R2 later is a change here only.
 */
const useBlob = !!process.env.BLOB_READ_WRITE_TOKEN;

/** Store a processed image buffer and return its public URL. */
export async function putImage(
  buffer: Buffer,
  subdir: string,
  filename: string
): Promise<string> {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const rel = `${subdir}/${year}/${month}/${filename}`;

  if (useBlob) {
    const { url } = await put(rel, buffer, {
      access: "public",
      contentType: "image/webp",
    });
    return url;
  }

  const dir = path.join(process.cwd(), "public", subdir, String(year), month);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, filename), buffer);
  return `/${rel}`;
}

/** Delete an image by its public URL (best-effort; never throws). */
export async function delImage(url: string | null | undefined): Promise<void> {
  if (!url) return;
  try {
    if (useBlob && url.startsWith("http")) {
      await del(url);
    } else if (url.startsWith("/")) {
      await unlink(path.join(process.cwd(), "public", url));
    }
  } catch {
    // best-effort cleanup
  }
}
