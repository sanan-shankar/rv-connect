/**
 * Constants and helpers shared by every image-upload path: the classic
 * server-proxied route, the presign/finalize direct-to-R2 pair, the
 * Collection contribute action, and the client-side pre-checks. Pure module
 * (no fs, no server-only imports) so both server and client code can use it.
 */

/**
 * How large an image may DECODE to, independent of its file size on disk: a
 * few-kilobyte file can carry a header claiming hundreds of megapixels and,
 * without this, libvips will try to allocate the whole buffer and take the
 * serverless function's memory down with it (a decompression bomb). sharp's
 * own default is ~268MP; ours is far tighter because nothing this community
 * uploads is a legitimate 268-megapixel image (audit M14).
 *
 * 100MP is above every phone's ordinary output (a 108MP sensor bins to ~12MP
 * JPEGs) and above any flatbed scan of a heritage photograph, while a 100MP
 * RGBA bitmap is ~400MB, the ceiling we are willing to let one decode reach.
 * A phone shooting in its full 108MP mode is genuinely OVER it -- the comment
 * here used to claim otherwise, and the member got told to try a JPG export,
 * which fails identically (audit C-072). It is refused, and now says so in
 * words that name the way out.
 *
 * Lives in this module rather than beside the sharp pipeline so the sentence
 * describing the refusal can quote the number without pulling sharp into a
 * client bundle.
 */
export const MAX_INPUT_PIXELS = 100_000_000;

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
 *
 * COUNTED PER HALF of the Collection, not across both (owner's call,
 * 2026-08-29): valley-scoped and class-scoped rows have a thousand each, so a
 * reunion emptied into somebody's Class Collection never eats the room they
 * had for the school's own archive. `photoQuotaError` is where that counting
 * happens. The cost ceiling this defends is therefore twice what it was, which
 * is accepted rather than overlooked -- at roughly 250KB a photograph, a member
 * who genuinely filled both pools costs about half a gigabyte on R2. The
 * pressure here was never the bytes.
 */
export const MAX_PHOTOS_PER_ACCOUNT = 1000;


/**
 * How many photographs one drop may hold. Two hundred (owner's call): a whole
 * camera card after a reunion, which is the thing the Class Collection exists
 * to catch.
 *
 * NOT the same limit as the account quota, and it must stay well under the
 * hourly meter -- see `collectionUploads` in rate-limit.ts, where the
 * arithmetic that ties these two numbers together is written down. A drop that
 * cannot finish because it exhausted its own allowance is worse than a drop
 * that was refused up front.
 */
export const MAX_PHOTOS_PER_DROP = 200;

/**
 * How hard the Collection re-encodes a contributed photograph.
 *
 * 100, and the number is the owner's (2026-09-02) after seeing what each
 * setting costs on his own 1,719-photograph album: q90 stored 38% of the
 * source bytes, q95 66%, q100 93%. The archive is a school's visual memory
 * and the photographs are not re-shootable, so the second lossy generation
 * this re-encode adds is bought down to nothing and the bytes are accepted.
 *
 * IT IS NOT A RESOLUTION, and the two are not interchangeable knobs. Nothing
 * here downsizes: `storedResizeBox` bounds AREA at 40MP and only ever to stop
 * a decompression bomb (audit M16), which on that album touched 7 photographs
 * out of 1,719. Capping the long edge at 4K instead was considered and
 * declined the same day, because it costs the SAME bytes as dropping to q90
 * (measured: 39% of source against 38%) while deleting about 60% of the pixels
 * of a 24MP photograph. Compression at this end of the scale removes detail
 * nobody can see; a resize removes the photograph, and only one of the two can
 * be undone by keeping a bigger file.
 *
 * The cost, so the next person changing it knows what they are moving: on
 * Cloudflare R2 at $0.015/GB-month, three terabytes of stored photographs is
 * about $46 a month at this setting and about $18 at q90.
 */
export const COLLECTION_WEBP_QUALITY = 100;

/**
 * The four formats the pipeline can decode and store, mapped to the extension
 * their object key gets and the MIME type the presigned PUT is signed with.
 *
 * A browser sometimes hands over a photograph with NO MIME type at all --
 * which `isImageFile` already accepts on the strength of the filename (audit
 * Low 41: refusing it "left the member holding a photograph the site would not
 * take"). The direct-to-R2 path did not: the presign step read the blank type,
 * found no extension for it, and answered "that photo format isn't supported"
 * for a perfectly ordinary JPEG (audit C-066). So a blank type falls back to
 * the name, and only the name -- a type that is present and unsupported (HEIC
 * above all) is still a refusal, because the bytes really are one we cannot
 * decode.
 *
 * Returns the canonical content type as well as the extension, because that
 * is what the PUT must be signed with and what the caller must then send: a
 * blank one would be signed as blank and the object would come back to us
 * with no type at all.
 */
const STORED_IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};
const STORED_IMAGE_EXTENSIONS: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
};

export function storedImageFormat(
  contentType: string | null | undefined,
  filename?: string | null
): { ext: string; contentType: string } | null {
  const type = (contentType ?? "").trim().toLowerCase();
  if (type) {
    const ext = STORED_IMAGE_TYPES[type];
    return ext ? { ext, contentType: type } : null;
  }
  const named = /\.([a-z0-9]+)$/i.exec((filename ?? "").trim());
  const ext = named ? named[1].toLowerCase() : "";
  const implied = STORED_IMAGE_EXTENSIONS[ext];
  return implied ? { ext: ext === "jpeg" ? "jpg" : ext, contentType: implied } : null;
}

/**
 * What to tell someone whose animated GIF has just become a still.
 *
 * sharp reads a GIF as a single page unless told otherwise, so every frame
 * after the first is dropped. Re-encoding to animated WebP is not the trade
 * taken -- the frame count multiplies the decode budget, and an upload path is
 * not where to find out that a hundred-frame GIF exhausts a serverless
 * function's memory. So it stays a still, and the member is TOLD, which is the
 * part that was wrong (audit M15).
 *
 * The sentence lives here because M15 was fixed on one upload path out of
 * four, and the other three flattened GIFs in silence for another month
 * (audit C-073). One sentence, one place, every path that re-encodes.
 */
export function stillPictureNotice(filename?: string): string {
  const subject = filename ? `"${filename}"` : "That photo";
  return `${subject} was saved as a still picture. Moving images are not supported yet.`;
}

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
 * Public hosts this bucket's objects have EVER been served from, other than
 * whatever `R2_PUBLIC_BASE_URL` says today.
 *
 * On 2026-08-21 serving moved from Cloudflare's free `pub-*.r2.dev` address to
 * `images.rishivalley.space`. Every URL written before that moment is stored in
 * the database on the old host, and two things go quietly wrong if the code
 * only knows the new one:
 *
 *  - `keyForUrl` stops recognising them, so deleting a post or a photograph
 *    leaves its bytes in the bucket for ever with no row pointing at them --
 *    the exact silent orphan the delete path was rebuilt to prevent.
 *  - `isUploadedImageUrl` stops recognising them, so re-saving anything that
 *    re-validates its images refuses pictures the member really did upload.
 *
 * The rows were rewritten to the new host in the same change, so this list is
 * belt as well as braces. It stays because a URL that escaped the rewrite would
 * fail SILENTLY, and because the demo deployment reads the same bucket with its
 * own environment variables.
 *
 * The exact host, not a `pub-*.r2.dev` wildcard: a wildcard would vouch for
 * anybody else's bucket, and vouching is what this file does (audit M10).
 */
const R2_LEGACY_PUBLIC_BASES = [
  "https://pub-a656209a5438484f9694738260255a5e.r2.dev",
] as const;

/** Every public base this app will accept a URL on, newest first. */
function publicBases(): string[] {
  const current = process.env.R2_PUBLIC_BASE_URL?.replace(/\/+$/, "");
  return [...(current ? [current] : []), ...R2_LEGACY_PUBLIC_BASES];
}

/**
 * The base one of OUR public URLs is served from, or null if it is not ours.
 * One rule, so the ownership check and the key derivation cannot disagree
 * about which hosts belong to this store.
 */
export function publicBaseFor(url: string): string | null {
  return publicBases().find((base) => url.startsWith(`${base}/`)) ?? null;
}

/**
 * True only for a URL this app produced through an upload path (local
 * `/uploads/...` in dev, one of this bucket's public bases in production).
 * Everything else is rejected, so a crafted action call cannot hotlink or embed
 * an arbitrary remote URL into a post, a Catch-up answer or an admin thread
 * (audit M10).
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
  const base = publicBaseFor(url);
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
  /* Too many PIXELS, which is not the same thing as too many megabytes and
     needs a different sentence. A 108MP phone shot compresses to well under
     the 20MB limit and passes every size check, then trips
     `limitInputPixels` at the decode -- and the generic branch below told the
     member to try a JPG export, which at the same resolution fails in exactly
     the same way (audit C-072). The number is spelled out because the fix is
     to scale the photo down, and you cannot do that without knowing to what. */
  if (/exceeds pixel limit/i.test(message)) {
    return `That photo is more megapixels than we can process (the limit is about ${Math.round(
      MAX_INPUT_PIXELS / 1_000_000
    )} million). Scaling it down a little and re-exporting will work.`;
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
