/* ------------------------------------------------------------------ *
 *  The Collection's image work that a plain `node` can also run.
 *
 *  These four were in `collection-photo.ts`, which imports through the
 *  `@/lib` alias. A bare `node` script or a `.test.mjs` cannot resolve
 *  `@/`, so the album importer re-implemented the thumbnail recipe and
 *  `exifBlockOf`, and `exif-date.test.mjs` pinned the SHAPE of
 *  `dateOnlyExif` because it could not import the function. All three
 *  said so in their own comments. Three declared copies is not a seam,
 *  it is a resolver problem, and the fix is the one `photo-suggest.ts`
 *  already took: relative paths with a `.ts` extension, which
 *  `allowImportingTsExtensions` exists for.
 *
 *  So the rule for this file: RELATIVE `.ts` IMPORTS ONLY, and only of
 *  modules that keep the same rule. `collection-photo.ts` re-exports
 *  everything here, so nothing in `src/` had to change its imports.
 * ------------------------------------------------------------------ */

import { sharpImage } from "./image.ts";
import { exifFromPng, exifStamp } from "./exif-date.ts";
import { valleyYear } from "./utils.ts";

/** The 480px grid rendition every contribution ends up with. */
export const THUMB_PX = 480;

/* THE SCREEN COPY: what the viewer opens instead of the master.
 *
 * The owner, 2026-09-23: "Every time I open a photo in the image viewer it
 * takes so long to open... it took 41 seconds to open. it's just totally
 * unusable now". The viewer was fetching the stored master -- full resolution
 * at q100, 7-11MB for a 24MP photograph -- to fill a screen. The master stays
 * exactly as it is (COLLECTION_WEBP_QUALITY says why); it is fetched when a
 * zoom asks for more than this holds, and when somebody downloads.
 *
 * 3200 is his screen, not a round number. A landscape filling a 14-inch
 * MacBook Pro (1512x982 at 2x) wants 2,946 device pixels across, a 16-inch
 * 3,351. At 2560 the 14-inch would be magnified 1.15x, and image-cdn.ts
 * records a 1.35x magnification being called soft. A screen that wants more
 * than this copy holds is handed the master instead (image-viewer.tsx).
 *
 * q82 because at or under 1:1 on a screen, the difference from q100 is not
 * visible; it is what makes the copy a fifth of the master or less. Measured
 * on eight real photographs: 0.3-1.8MB against 1.2-11.7MB. */
export const SCREEN_PX = 3200;
const SCREEN_QUALITY = 82;

/** A copy is only worth storing if it saves at least this share of the
 *  master's bytes. A master that is already screen-sized and light -- the
 *  1600px fallback, a photograph copied from a post -- would come back about
 *  the same size, and a second object that saves nothing is only a second
 *  object to purge. */
const SCREEN_MIN_SAVING = 0.25;

/**
 * The screen copy of a stored master.
 *
 * Auto-oriented, which is a no-op on every master the upload path writes (the
 * re-encode bakes the rotation in and keeps no orientation tag) and is here
 * for the backfill: a file stored some other way that still carries an EXIF
 * rotation would otherwise come out sideways, because the copy keeps no
 * metadata to tell a browser to turn it.
 *
 * Returns the copy whether or not it is worth keeping, because the upload
 * path has a second use for it: it is the cheapest buffer to cut the 480px
 * thumbnail from, a 3200px decode rather than a 24-megapixel one.
 */
export async function screenCopy(
  master: Buffer
): Promise<{ copy: Buffer; worthKeeping: boolean }> {
  const copy = await sharpImage(master)
    .rotate()
    .resize(SCREEN_PX, SCREEN_PX, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: SCREEN_QUALITY })
    .toBuffer();
  return { copy, worthKeeping: copy.length <= master.length * (1 - SCREEN_MIN_SAVING) };
}

/**
 * The raw EXIF block of an uploaded file, however its container happens to
 * carry one.
 *
 * `sharp.metadata().exif` is the answer for a JPEG, a WebP and a HEIF, and it
 * is EMPTY for a PNG whose date exiftool reads without difficulty -- libvips
 * does not go looking in PNG's text chunks, which is where Apple and
 * ImageMagick put it. Three photographs in the owner's 1,719-file album were
 * silently filed undated because of it (2026-09-02), so the fallback is here
 * rather than at one call site: every reader needs the same bytes, and a fix
 * that only one of them got would mean a photograph dated in the archive and
 * undated in the file it hands back.
 *
 * Undefined rather than null when there is nothing, because that is what
 * `exifDate` and `exifStamp` already take.
 */
export async function exifBlockOf(original: Buffer): Promise<Buffer | undefined> {
  try {
    const fromSharp = (await sharpImage(original).metadata()).exif;
    if (fromSharp?.length) return fromSharp;
  } catch {
    /* A decode that never got far enough to have metadata. Fall through: the
       PNG reader works off the raw bytes and may still manage. */
  }
  return exifFromPng(original) ?? undefined;
}

/**
 * The ONE tag the stored copy is allowed to keep: when the shutter opened.
 *
 * Everything else in a photograph's EXIF block is dropped by the re-encode
 * and that is deliberate -- a phone photograph carries GPS, and publishing a
 * member's coordinates is not something this archive will do (audit M12). The
 * date is the exception the owner asked for on 2026-09-01, because the file a
 * classmate downloads should land in their photo app under the right year
 * instead of under today.
 *
 * AN ALLOW-LIST OF ONE, and the shape matters more than the contents. This
 * builds a fresh EXIF block holding a single tag rather than taking the
 * original's block and removing what it should not keep: a strip-list is
 * wrong the day a camera writes a tag nobody anticipated, and this cannot be.
 * `IFD2` is sharp's name for the Exif sub-IFD, where `DateTimeOriginal`
 * belongs; `exifStamp` has already refused anything that is not a date this
 * archive would file.
 *
 * Returns null when the original claimed no date, and a stored copy with no
 * date is the right answer for a file that never had one. Never invents.
 */
export async function dateOnlyExif(
  original: Buffer
): Promise<{ IFD2: { DateTimeOriginal: string } } | null> {
  const stamp = exifStamp(await exifBlockOf(original), valleyYear());
  return stamp ? { IFD2: { DateTimeOriginal: stamp } } : null;
}

/**
 * The grid thumbnail: 480px longest side, WebP at 72.
 *
 * `alreadyUpright` is the one real difference between the callers, and it is
 * deliberate. Two paths hand in the raw original, which still needs its EXIF
 * orientation baked in. The direct path -- and the album importer -- hand in
 * the SCREEN COPY they have just made, which has been through `.rotate()`
 * already: rotating twice would be wrong, and decoding the original a second
 * time for a 480px output doubles the most expensive step.
 */
export async function gridThumb(
  input: Buffer,
  { alreadyUpright = false }: { alreadyUpright?: boolean } = {}
): Promise<Buffer> {
  const pipeline = alreadyUpright ? sharpImage(input) : sharpImage(input).rotate();
  return pipeline
    .resize(THUMB_PX, THUMB_PX, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: 72 })
    .toBuffer();
}
