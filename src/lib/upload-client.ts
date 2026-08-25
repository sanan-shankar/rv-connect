/**
 * The client half of the direct-to-R2 upload path, shared by the post
 * composer and the Collection contribute dialog so the presign contract
 * (and its CORS-failure fallback behaviour) lives in exactly one place.
 *
 * The bucket's CORS rule is live (applied 2026-07-30), so this is the path a
 * browser normally takes.
 *
 * Returns the staged object's key/publicUrl on success, or null whenever the
 * direct path is unavailable anyway: no R2 configured locally, a transient
 * presign failure, or an origin the CORS rule does not name (a new domain, a
 * Vercel preview URL). The caller then falls back to its classic
 * server-proxied upload, which is capped at ~4.5MB on Vercel but is better
 * than stranding the photo. A definitive validation error (bad type, over the
 * size limit) is thrown instead, so callers surface it rather than silently
 * retrying a file the server will always refuse.
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
    contentType?: string;
    error?: string;
  };
  let status: number;
  try {
    const res = await fetch("/api/upload/presign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind,
        contentType: file.type,
        // Sent because some mobile browsers hand over a photograph with no
        // MIME type at all, and the name is then the only thing that says
        // what it is (audit C-066).
        filename: file.name,
        bytes: file.size,
      }),
    });
    status = res.status;
    presign = await res.json();
  } catch (err) {
    /* Said out loud (audit C-158). This fallback is INVISIBLE by design -- the
       caller downscales in the browser and proxies through the server instead,
       so the upload works and nobody notices -- and that is exactly how direct
       uploads stayed broken for weeks while everything looked fine
       (docs/TRAPS.md). A console line costs nothing and makes a recurrence
       diagnosable from the one place somebody would look. */
    console.warn("[upload] presign unreachable; falling back to the server proxy", err);
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
      // The type the URL was signed with, which for a blank-MIME file is the
      // one the server derived from the name; sending anything else fails the
      // signature.
      headers: { "Content-Type": presign.contentType ?? file.type },
      body: file,
    });
    if (!put.ok) {
      console.warn(
        `[upload] direct PUT refused (${put.status}); falling back to the server proxy`
      );
      return null;
    }
  } catch (err) {
    /* The browser blocked the PUT, which in practice means this origin is not
       named in the bucket's CORS allowlist -- or the S3 endpoint is missing
       from the CSP's connect-src, which is the pair that hid this for weeks.
       Fall back rather than strand the upload, but say so (audit C-158). */
    console.warn("[upload] direct PUT blocked; falling back to the server proxy", err);
    return null;
  }

  return { key: presign.key, publicUrl: presign.publicUrl };
}
