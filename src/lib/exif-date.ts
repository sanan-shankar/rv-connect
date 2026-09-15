/* ------------------------------------------------------------------ *
 *  WHAT AN UPLOADED FILE SAYS ABOUT WHEN IT WAS TAKEN, ON THE SERVER.
 *
 *  The Collection strips EXIF on purpose. Every upload is re-encoded
 *  through sharp, which drops the metadata, and the raw original is
 *  deleted straight afterwards, because a phone photograph's EXIF
 *  carries GPS and publishing a member's coordinates is not something
 *  this archive is willing to do (audit M12, and the comments around
 *  `purgeImageKey` in the collection actions).
 *
 *  That was right, and it had a cost nobody had counted. On 2026-08-30
 *  the archive held 21 photographs and 3 of them had a year. The owner:
 *  "at the rate we're going we're going to have 10% dated and everything
 *  undated. we have to use the metadata like google photos does."
 *
 *  So the date is read off the original in the seconds it exists, before
 *  the strip. THE WALK AND THE JUDGEMENT LIVE IN `taken-date.ts`, shared
 *  with the browser, so the review room's "The file says" and the
 *  contribute pop-up's suggestion cannot disagree about one photograph.
 *  That file reads the dates plus Make, Model and Software (for its
 *  scanner rule) and cannot name a GPS tag. What stays here is what needs
 *  Node: Buffers from sharp, and zlib for PNG.
 * ------------------------------------------------------------------ */

import { inflateSync } from "node:zlib";

import {
  decodeRawProfile,
  judgeTakenDate,
  MAX_PROFILE_BYTES,
  parseExifStamp,
  RAW_PROFILE_KEYWORDS,
  readTiffTags,
  type ExifDate,
} from "./taken-date.ts";

export { parseExifStamp };
export type { ExifDate };

/* ------------------------------------------------------------------ *
 *  Finding the TIFF block inside a PNG.
 *
 *  sharp hands back `metadata().exif` for a JPEG, a WebP and a HEIF, and
 *  NOTHING AT ALL for a PNG that exiftool reads a DateTimeOriginal out of
 *  perfectly well. Three photographs in a 1,719-file album were in that
 *  state on 2026-09-02, and the symptom is nothing: the contribution
 *  succeeds and the photograph is simply filed undated, in an archive whose
 *  whole date mechanism exists because 3 of the first 21 had a year.
 *
 *  The cause is that PNG has two ways to carry EXIF and libvips reads
 *  neither here. The modern one is an `eXIf` chunk holding a raw TIFF block
 *  (PNG 1.5, 2017). The old one, which is what Apple and ImageMagick
 *  actually wrote into these files, is a DEFLATED TEXT chunk whose keyword
 *  is "Raw profile type APP1" and whose body is the TIFF block hex-encoded
 *  with a little header (`decodeRawProfile`, shared with the browser).
 *
 *  SO THIS FINDS BYTES AND PARSES NOTHING. It is a container reader, not a
 *  tag reader, and it hands whatever it finds to the same walk as every
 *  other format.
 *
 *  Every read is bounds-checked and the whole thing swallows its own
 *  failures, because it runs inside an upload: a malformed PNG is a
 *  photograph with no suggested date, never a failed contribution.
 * ------------------------------------------------------------------ */

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/**
 * The EXIF block inside a PNG, or null when there is not one.
 *
 * Takes the WHOLE FILE, not sharp's metadata, because the thing it is working
 * around is that sharp did not find this.
 */
export function exifFromPng(file: Buffer): Buffer | null {
  try {
    if (file.length < 8 || !file.subarray(0, 8).equals(PNG_SIGNATURE)) return null;

    let at = 8;
    /* Chunks run until IDAT, which is where the pixels start: metadata after
       the image data is legal but nothing writes EXIF there, and walking a
       multi-megabyte IDAT run to find out is not worth it inside an upload. */
    while (at + 8 <= file.length) {
      const length = file.readUInt32BE(at);
      const type = file.toString("latin1", at + 4, at + 8);
      const from = at + 8;
      /* +4 for the CRC. A length that runs past the end is a truncated file. */
      if (length > file.length || from + length + 4 > file.length) return null;
      if (type === "IDAT" || type === "IEND") return null;

      const body = file.subarray(from, from + length);

      /* The modern chunk: a raw TIFF block, nothing to decode. */
      if (type === "eXIf") return body.length ? body : null;

      if (type === "zTXt" || type === "tEXt") {
        const nul = body.indexOf(0);
        if (nul > 0) {
          const keyword = body.toString("latin1", 0, nul);
          if (RAW_PROFILE_KEYWORDS.includes(keyword)) {
            /* zTXt puts a one-byte compression method after the NUL; tEXt has
               no compression and no method byte. */
            const raw =
              type === "zTXt"
                ? inflateSync(body.subarray(nul + 2), { maxOutputLength: MAX_PROFILE_BYTES })
                : body.subarray(nul + 1);
            const decoded = decodeRawProfile(raw.toString("latin1"));
            if (decoded) return Buffer.from(decoded.buffer, decoded.byteOffset, decoded.byteLength);
          }
        }
      }

      at = from + length + 4;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * The date stamp a photograph's own file claims, VERBATIM, or null if it does
 * not claim one this archive would file.
 *
 * The raw string rather than the parsed pair, because the one caller that
 * needs it is writing the stamp straight back out: the stored copy carries
 * the date the camera wrote, to the second, so a member who downloads it gets
 * a file their own photo app can sort. Reconstructing "1978:03:14 09:12:00"
 * from a year and a month would mean inventing a day, which is the one thing
 * a date-provenance pass must never do.
 *
 * Shutter first, then digitisation, then the file's own timestamp. The order
 * is confidence, not availability. NOTE this is the write-back's order, and it
 * is wider than what `exifDate` below will OFFER a person: a suggestion goes
 * through the judgement in taken-date.ts, this does not.
 *
 * `exif` is the buffer sharp hands back on `metadata().exif`, which begins
 * with the "Exif\0\0" marker JPEG puts in front of the TIFF block; the marker
 * is optional here because not every container carries it.
 */
export function exifStamp(exif: Buffer | undefined, thisYear: number): string | null {
  const tags = readTiffTags(exif);
  if (!tags) return null;
  for (const value of [tags.original, tags.digitized, tags.modified]) {
    if (value && parseExifStamp(value, thisYear)) return value;
  }
  return null;
}

/**
 * The date worth offering a person for this file, or null.
 *
 * The same judgement the contribute pop-up applies in the browser
 * (`judgeTakenDate`), so the review room's "The file says" matches what the
 * contributor was offered. No file name to corroborate with: the direct
 * upload path never sees one.
 */
export function exifDate(exif: Buffer | undefined, thisYear: number): ExifDate | null {
  return judgeTakenDate({ tags: readTiffTags(exif), thisYear });
}
