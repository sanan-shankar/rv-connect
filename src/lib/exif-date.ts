/* ------------------------------------------------------------------ *
 *  WHAT THE FILE SAYS ABOUT WHEN IT WAS TAKEN -- AND NOTHING ELSE.
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
 *  the strip, and stored as two integers. THE READER IS DELIBERATELY
 *  IGNORANT: it walks the IFDs looking for four ASCII date tags and it
 *  does not know the GPS tags exist. A general EXIF parser plus a promise
 *  to only use one field is a promise; a parser that cannot name a
 *  latitude is a property. If somebody later wants the camera model, add
 *  the tag here on purpose rather than reaching for a library that hands
 *  back everything.
 *
 *  A CAVEAT THAT IS THE UI'S JOB, NOT THIS FILE'S: on a scanned print
 *  the date is when it was SCANNED, not when it was taken. A 1978
 *  photograph scanned in 2019 says 2019, and it is right to. That is why
 *  the review room offers this as "the file says 2019" rather than
 *  "taken in 2019", and why it is never applied on its own.
 * ------------------------------------------------------------------ */

import { inflateSync } from "node:zlib";

import { PHOTO_YEAR_MIN } from "./collection.ts";

/** IFD0's own timestamp: usually the last time the file was written, so it
 *  is the weakest of the three and only consulted when the others are absent. */
const TAG_DATE_TIME = 0x0132;
/** IFD0 -> the Exif sub-IFD, where the two dates worth having live. */
const TAG_EXIF_IFD = 0x8769;
/** When the shutter opened. The one we actually want. */
const TAG_DATE_TIME_ORIGINAL = 0x9003;
/** When it became a digital file -- the same instant on a camera, the scan
 *  date on a scanner. Second choice. */
const TAG_DATE_TIME_DIGITIZED = 0x9004;

const ASCII = 2;
const LONG = 4;

/** A year and a month, as the archive's date field would take them.
 *  `month` is 1-12, or null when the stamp had no usable one. */
export type ExifDate = { year: number; month: number | null };

/** A little reader over the TIFF block, so the byte order is decided once
 *  instead of at every read. */
function tiffReader(buf: Buffer, littleEndian: boolean) {
  return {
    u16: (at: number) => (littleEndian ? buf.readUInt16LE(at) : buf.readUInt16BE(at)),
    u32: (at: number) => (littleEndian ? buf.readUInt32LE(at) : buf.readUInt32BE(at)),
  };
}

/**
 * Walk one IFD and hand back the raw value of every tag asked for.
 *
 * Bounds are checked on every read rather than trusted: this parses bytes a
 * member uploaded, and a truncated or hostile file must return nothing rather
 * than throw out of the middle of a contribution.
 */
function readIfd(
  tiff: Buffer,
  at: number,
  littleEndian: boolean,
  wanted: ReadonlySet<number>
): Map<number, string | number> {
  const out = new Map<number, string | number>();
  const r = tiffReader(tiff, littleEndian);
  if (at < 0 || at + 2 > tiff.length) return out;

  const count = r.u16(at);
  for (let i = 0; i < count; i++) {
    const entry = at + 2 + i * 12;
    if (entry + 12 > tiff.length) break;

    const tag = r.u16(entry);
    if (!wanted.has(tag)) continue;

    const type = r.u16(entry + 2);
    const length = r.u32(entry + 4);

    if (type === LONG && length === 1) {
      out.set(tag, r.u32(entry + 8));
      continue;
    }
    if (type !== ASCII) continue;

    /* An ASCII value of four bytes or fewer sits in the entry itself; anything
       longer -- and a date stamp is 20 -- is an offset into the TIFF block. A
       date is worth reading only at its documented length, so a tag claiming
       megabytes is skipped rather than sliced. */
    if (length < 19 || length > 32) continue;
    const from = length <= 4 ? entry + 8 : r.u32(entry + 8);
    if (from < 0 || from + length > tiff.length) continue;
    out.set(tag, tiff.toString("ascii", from, from + length));
  }
  return out;
}

/**
 * "1978:03:14 09:12:00" -> { year: 1978, month: 3 }.
 *
 * Anything outside the years the archive files is refused here rather than in
 * the UI, so a suggestion is never offered that the year field would reject.
 * That takes out the all-zero stamp some phones write when they have no date,
 * and every year past this one.
 *
 * THE FLOOR IS PHOTO_YEAR_MIN AND NOT "the year digital cameras existed",
 * which is the tempting version -- an EXIF capture stamp reading 1978 is a
 * camera whose clock was never set, surely, since nothing in 1978 wrote EXIF.
 * It is not, here. The owner's own sidecar-merge tool writes recovered
 * timestamps from Google Takeout back into DateTimeOriginal, so a scanned 1978
 * print in this archive legitimately carries a 1978 stamp -- and that is the
 * single most valuable date this whole mechanism will ever see. A dead clock
 * offering January 1970 costs one declined suggestion in front of a
 * photograph the admin is looking at; that floor would silently discard the
 * real ones.
 */
export function parseExifStamp(raw: string, thisYear: number): ExifDate | null {
  const m = /^(\d{4}):(\d{2}):(\d{2})/.exec(raw.trim());
  if (!m) return null;

  const year = Number(m[1]);
  if (year < PHOTO_YEAR_MIN || year > thisYear) return null;

  const month = Number(m[2]);
  return { year, month: month >= 1 && month <= 12 ? month : null };
}

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
 *  with a little header. Both end at the same place: a TIFF block, which is
 *  exactly what `exifStamp` below already knows how to walk.
 *
 *  SO THIS FINDS BYTES AND PARSES NOTHING. It is a container reader, not a
 *  tag reader, and it hands whatever it finds to the same deliberately
 *  ignorant walk as every other format. The property the file header
 *  describes -- that nothing here can name a GPS tag -- is about tags and
 *  survives intact.
 *
 *  Every read is bounds-checked and the whole thing swallows its own
 *  failures, because it runs inside an upload: a malformed PNG is a
 *  photograph with no suggested date, never a failed contribution.
 * ------------------------------------------------------------------ */

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/** The two keywords a hex-encoded EXIF profile is stored under. "APP1" is the
 *  JPEG marker the block was lifted out of, which is why it is the common one. */
const RAW_PROFILE_KEYWORDS = ["Raw profile type APP1", "Raw profile type exif"];

/** A ceiling on what will be inflated out of one chunk. An EXIF block is a few
 *  kilobytes; this is generous and still refuses a zip bomb in a text chunk. */
const MAX_PROFILE_BYTES = 4 * 1024 * 1024;

/**
 * Decode ImageMagick's hex text profile.
 *
 * The body is `\n<name>\n<length>\n<hex>`, the hex wrapped across lines. The
 * declared length is not trusted for anything but a sanity check; the bytes
 * are whatever the hex decodes to.
 */
function decodeRawProfile(text: string): Buffer | null {
  const lines = text.split("\n");
  /* [0] is empty (the leading newline), [1] the profile name, [2] the length,
     and everything after it the hex. Fewer than four means it is not one. */
  if (lines.length < 4) return null;
  const hex = lines.slice(3).join("").replace(/\s+/g, "");
  if (!hex || hex.length % 2 !== 0 || !/^[0-9a-fA-F]+$/.test(hex)) return null;
  if (hex.length / 2 > MAX_PROFILE_BYTES) return null;
  return Buffer.from(hex, "hex");
}

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
            if (decoded) return decoded;
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
 * STILL ONLY DATE TAGS. This walks the same four and knows no others; the
 * ignorance the file header describes is the property being preserved, and
 * handing back a string the parser already validated does not widen it.
 *
 * `exif` is the buffer sharp hands back on `metadata().exif`, which begins
 * with the "Exif\0\0" marker JPEG puts in front of the TIFF block; the marker
 * is optional here because not every container carries it.
 */
export function exifStamp(exif: Buffer | undefined, thisYear: number): string | null {
  if (!exif || exif.length < 8) return null;

  try {
    const tiff = exif.toString("ascii", 0, 4) === "Exif" ? exif.subarray(6) : exif;
    if (tiff.length < 8) return null;

    const order = tiff.toString("ascii", 0, 2);
    if (order !== "II" && order !== "MM") return null;
    const littleEndian = order === "II";
    const r = tiffReader(tiff, littleEndian);
    if (r.u16(2) !== 42) return null; // not a TIFF block after all

    const zeroth = readIfd(tiff, r.u32(4), littleEndian, new Set([TAG_DATE_TIME, TAG_EXIF_IFD]));

    const sub = zeroth.get(TAG_EXIF_IFD);
    const exifIfd =
      typeof sub === "number"
        ? readIfd(
            tiff,
            sub,
            littleEndian,
            new Set([TAG_DATE_TIME_ORIGINAL, TAG_DATE_TIME_DIGITIZED])
          )
        : new Map<number, string | number>();

    /* Shutter first, then digitisation, then the file's own timestamp. The
       order is confidence, not availability: DateTime is written by anything
       that re-saves the file, so a photograph edited last week would otherwise
       be offered as taken last week. */
    for (const value of [
      exifIfd.get(TAG_DATE_TIME_ORIGINAL),
      exifIfd.get(TAG_DATE_TIME_DIGITIZED),
      zeroth.get(TAG_DATE_TIME),
    ]) {
      if (typeof value !== "string") continue;
      /* EXIF ASCII values are NUL-TERMINATED, and the terminator is inside the
         declared length -- a 20-byte date stamp is 19 characters and a \0.
         `trim()` does not remove it. `parseExifStamp` never noticed, because it
         anchors at the START of the string; this does, because the string is
         handed to `withExif` and written back into a file, where a trailing NUL
         makes the tag it writes malformed. Found by the round-trip test. */
      const clean = value.replace(/\0[\s\S]*$/, "").trim();
      if (parseExifStamp(clean, thisYear)) return clean;
    }
    return null;
  } catch {
    /* A malformed block is a photograph with no date, never a failed
       contribution. This runs inside the upload path. */
    return null;
  }
}

/**
 * The date a photograph's own file claims, or null if it does not claim one.
 *
 * The archive's own two integers, parsed from the stamp above. Every existing
 * caller wants this; `exifStamp` exists for the one that has to write the
 * stamp back into the stored bytes.
 */
export function exifDate(exif: Buffer | undefined, thisYear: number): ExifDate | null {
  const raw = exifStamp(exif, thisYear);
  return raw ? parseExifStamp(raw, thisYear) : null;
}
