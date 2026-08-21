/**
 * Constants and helpers shared by every image-upload path: the classic
 * server-proxied route, the presign/finalize direct-to-R2 pair, the
 * Collection contribute action, and the client-side pre-checks. Pure module
 * (no fs, no server-only imports) so both server and client code can use it.
 */

/** The one photo ceiling, everywhere: 20MB. */
export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;

/**
 * A per-account ceiling on Collection photographs, the permanent full-size
 * objects (audit M17). The hourly uploads meter (rate-limit.ts) already bounds
 * how fast anyone can push bytes; this is the lifetime backstop against a
 * single confirmed account amplifying storage cost without limit. Set well
 * above any genuine contributor to a heritage archive — a prolific digitiser
 * who reaches it is exactly the person to mark `photoTrusted` and raise it for.
 * Post images are not counted here: they are capped at three per post and
 * gated by the same hourly meter.
 */
export const MAX_PHOTOS_PER_ACCOUNT = 1000;

/** The image filename extensions this app can actually process. */
const IMAGE_EXTENSIONS = /\.(jpe?g|png|gif|webp|avif|bmp|tiff?|hei[cf])$/i;

/**
 * The one "is this actually a picture" check, everywhere.
 *
 * A blank `type` counts if the FILENAME says image, for the same reason
 * `isUnsupportedHeic` below checks the extension: some mobile browsers hand
 * over a picked photo with an empty MIME string, and refusing those left the
 * member holding a photograph the site would not take, with "Please choose an
 * image" as the only explanation (audit Low 41).
 *
 * Letting a blank MIME through costs nothing: every upload path sniffs the
 * actual BYTES server-side (`sniffImageType`) and the client's string was
 * never trusted anyway. This only decides whether to refuse before the file
 * has left the device.
 */
export function isImageFile(file: { type: string; name?: string }): boolean {
  if (file.type.startsWith("image/")) return true;
  return !file.type && !!file.name && IMAGE_EXTENSIONS.test(file.name);
}

/** True for iPhone photos exported as HEIC/HEIF. sharp's prebuilt binary has
 *  no HEVC decoder (patent licensing), so these fail with an opaque
 *  "unsupported image format" error; catch them earlier with a message that
 *  actually explains what to do. `type` is occasionally blank for these on
 *  some mobile browsers, so the filename extension is checked too. */
export function isUnsupportedHeic(file: { type: string; name: string }): boolean {
  return (
    file.type === "image/heic" || file.type === "image/heif" || /\.hei[cf]$/i.test(file.name)
  );
}

/**
 * True only for a URL this app produced through an upload path (local
 * `/uploads/...` in dev, the R2 public base in production). Everything else is
 * rejected, so a crafted action call cannot hotlink or embed an arbitrary
 * remote URL into a post, a Catch-up answer or an admin thread (audit M10).
 *
 * Owner-scoped keys (`uploads/<userId>/...`, audit C2) still live under the
 * `/uploads/` root, so this prefix test is unchanged by that migration; the
 * per-user ownership half is enforced in `upload-ownership.ts`, which has the
 * caller's id and this function alone does not.
 *
 * Lives here (a pure module) rather than in admin-threads-server so the write
 * paths can share it without dragging Prisma, and `pg`, along for the ride.
 */
export function isUploadedImageUrl(url: string): boolean {
  if (url.startsWith("/uploads/")) return true;
  const base = process.env.R2_PUBLIC_BASE_URL?.replace(/\/+$/, "");
  return !!base && url.startsWith(`${base}/uploads/`);
}

/**
 * The image format of a byte buffer, read from its MAGIC BYTES, or null when
 * the leading bytes match no format we accept (audit M13). The client-supplied
 * MIME string is never trusted: this is what actually decides, and it runs
 * before the bytes reach sharp/libvips, whose pinned version carried open CVEs
 * (audit C3). sharp would reject a non-image anyway, but this keeps a crafted
 * file from being the first thing libvips parses.
 *
 * HEIC/HEIF are deliberately absent: sharp's prebuilt binary cannot decode
 * them (see isUnsupportedHeic), so they are turned away earlier with a clearer
 * message and never reach here.
 */
export function sniffImageType(
  bytes: Uint8Array
): "jpeg" | "png" | "gif" | "webp" | null {
  const b = bytes;
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "jpeg";
  if (
    b.length >= 8 &&
    b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 &&
    b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a
  )
    return "png";
  // "GIF87a" / "GIF89a"
  if (b.length >= 6 && b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46) return "gif";
  // "RIFF" .... "WEBP"
  if (
    b.length >= 12 &&
    b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
    b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50
  )
    return "webp";
  return null;
}

/**
 * Does this error come from the STORAGE side rather than the image?
 *
 * The S3 client marks its own errors with `$metadata`, and a transport failure
 * arrives as one of a small, stable set of Node socket codes. Both are checked
 * because either can surface depending on where the call died.
 */
function isStorageFailure(error: unknown, message: string): boolean {
  if (error && typeof error === "object" && "$metadata" in error) return true;
  const code =
    error && typeof error === "object" && "code" in error ? String(error.code) : "";
  if (/^(ECONNRESET|ECONNREFUSED|ETIMEDOUT|EPIPE|ENOTFOUND|EAI_AGAIN)$/.test(code)) return true;
  return /\b(econnreset|etimedout|socket hang up|network|fetch failed)\b/i.test(message);
}

/** Turn a sharp processing error into a message that names the actual reason
 *  instead of a raw libvips exception string. */
export function describeProcessingError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (/unsupported image format/i.test(message)) {
    return "That photo's format isn't supported. Please export it as JPG or PNG and try again.";
  }
  if (/premature end|truncated|invalid/i.test(message)) {
    return "That photo looks corrupted or only partially uploaded. Please try again.";
  }
  /* Not the photo's fault at all.
   *
   * Every caller of this wraps the STORAGE write in the same try as the sharp
   * work, so a bad minute at R2, a dropped socket or a timeout came out of the
   * generic branch below telling the member to "try a different one" -- sending
   * them off to re-pick a photograph that was never the problem, when trying
   * the same one again in a minute is the thing that would work (audit
   * Low 42). */
  if (isStorageFailure(error, message)) {
    return "We could not save the photo just now. Nothing is wrong with it; please try again in a moment.";
  }
  // A generic sentence, never the raw libvips string: those can carry absolute
  // filesystem and temp-file paths, a small server-path disclosure to any
  // signed-in caller. Callers log `error` server-side for the real cause.
  return "Could not process the photo. Please try a different one, or a JPG or PNG export of it.";
}
