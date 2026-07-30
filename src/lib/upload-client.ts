/**
 * The client half of the direct-to-R2 upload path, shared by the post
 * composer and the Collection contribute dialog so the presign contract
 * (and its CORS-failure fallback behaviour) lives in exactly one place.
 *
 * Returns the staged object's key/publicUrl on success, or null whenever
 * the direct path is unavailable (no R2 locally, bucket CORS not applied
 * yet, presign rejected transiently) - the caller then falls back to its
 * classic server-proxied upload. A definitive validation error (bad type,
 * over the size limit) is thrown instead, so callers surface it rather
 * than silently retrying a file the server will always refuse.
 */
export async function directUploadPut(
  file: File,
  kind: "post" | "collection"
): Promise<{ key: string; publicUrl: string } | null> {
  let presign: {
    direct?: boolean;
    key?: string;
    signedUrl?: string;
    publicUrl?: string;
    error?: string;
  };
  let status: number;
  try {
    const res = await fetch("/api/upload/presign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind, contentType: file.type, bytes: file.size }),
    });
    status = res.status;
    presign = await res.json();
  } catch {
    return null; // network hiccup: let the caller's classic path try
  }

  // A 400 is a real verdict about the file (unsupported format, too big),
  // not an availability problem; retrying it through the fallback would
  // just fail slower with a worse message.
  if (status === 400 && presign.error) throw new Error(presign.error);
  if (!presign.direct || !presign.signedUrl || !presign.key || !presign.publicUrl) return null;

  try {
    const put = await fetch(presign.signedUrl, {
      method: "PUT",
      headers: { "Content-Type": file.type },
      body: file,
    });
    if (!put.ok) return null;
  } catch {
    // Bucket CORS rule not applied yet (scripts/setup-r2-cors.mjs): the
    // browser blocks the PUT. Fall back rather than strand the upload.
    return null;
  }

  return { key: presign.key, publicUrl: presign.publicUrl };
}
