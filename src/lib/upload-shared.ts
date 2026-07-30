/**
 * Constants and helpers shared by every image-upload path: the classic
 * server-proxied route, the presign/finalize direct-to-R2 pair, the
 * Collection contribute action, and the client-side pre-checks. Pure module
 * (no fs, no server-only imports) so both server and client code can use it.
 */

/** The one photo ceiling, everywhere: 20MB. */
export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;

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
  return `Could not process the photo (${message}).`;
}
