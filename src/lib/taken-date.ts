/* ------------------------------------------------------------------ *
 *  WHEN WAS THIS PHOTOGRAPH TAKEN, ACCORDING TO THE FILE -- AND WHEN
 *  TO SAY NOTHING.
 *
 *  Two rooms offer this as a one-press suggestion: the contribute pop-up,
 *  the moment a photograph lands, and the review room's "The file says".
 *  A suggestion one press away gets pressed. The owner, 2026-09-15:
 *  "make sure you get the right date in the suggested one because we
 *  don't want to suggest something wrong and then people might be inclined
 *  to just click that instead of think actually when it was".
 *
 *  So this file's job is JUDGEMENT, and its bias is silence. An empty year
 *  box costs a contributor a moment's thought; a wrong date offered in
 *  front of them becomes a wrong year nobody questions again. Every rule
 *  below throws a candidate away rather than guess.
 *
 *  WHAT IT TRUSTS:
 *
 *  1. DateTimeOriginal, the moment the shutter opened. Nothing else in a
 *     file claims to be that.
 *  2. A full date in a camera's own FILE NAME (IMG_20181210_090756, PXL_,
 *     Samsung's 20190314_091200). The phone wrote it from the same clock
 *     at the same instant, so it corroborates (1), and stands in for it
 *     when a re-save stripped the EXIF.
 *
 *  WHAT IT REFUSES, each one a way a real file lies:
 *
 *  - The file's own modified date, which a browser calls `lastModified`.
 *    It is when the file was last COPIED. The owner's school-photographer
 *    folder (2026-09-15) held 180 photographs from 2011 to 2018 that all
 *    claimed 2020 there, because 2020 is when they came off a drive. No
 *    caller hands this module that number, and none should start.
 *  - DateTimeDigitized or IFD0 DateTime on their own. On a camera
 *    Digitized equals Original, so it only stands alone on a SCAN, where
 *    it is the scan date. DateTime is rewritten by anything that saves the
 *    file: one of those 180 claimed 2012 because it was touched up in GIMP
 *    the August after it was taken.
 *  - Anything a scanner or scanning software wrote. A scanned 1978 print
 *    says 2019, right about the file and wrong about the picture.
 *  - A camera clock that was never set, which starts in January 1970 or
 *    January 1980.
 *  - A file name and a shutter time more than two days apart. One of them
 *    is wrong and nothing here can tell which.
 *  - Names whose date is not when the picture was taken: WhatsApp's (when
 *    it was RECEIVED), a screenshot's, a scan's.
 *
 *  AND IT SAYS LESS WHEN IT KNOWS LESS. Exactly 1 January at midnight is
 *  what a person or a tool writes when only the year is known, so that is
 *  offered as the year alone.
 *
 *  ISOMORPHIC ON PURPOSE. The server reads an upload's block through sharp
 *  and the browser reads a picked File's bytes, and both come here, so the
 *  two rooms cannot disagree about one photograph. Uint8Array and DataView
 *  only, no Buffer and no `node:` imports, and relative `.ts` imports only
 *  (collection-image.ts says why).
 *
 *  THE WALK STILL CANNOT NAME A LOCATION. It reads the three dates plus
 *  Make, Model and Software, the last three added on purpose for the
 *  scanner rule. The GPS pointer is not a tag it knows (audit M12).
 * ------------------------------------------------------------------ */

import { PHOTO_YEAR_MIN } from "./collection.ts";

/** A year and a month, as the archive's date field would take them.
 *  `month` is 1-12, or null when only the year is worth saying. */
export type ExifDate = { year: number; month: number | null };

/** What the walk reads out of an EXIF block. Every value is the tag's text
 *  with its NUL terminator and padding removed, or null. */
export type FileTags = {
  /** DateTimeOriginal: when the shutter opened. */
  original: string | null;
  /** DateTimeDigitized: the shutter on a camera, the scan on a scanner. */
  digitized: string | null;
  /** IFD0 DateTime: the last time anything saved the file. */
  modified: string | null;
  make: string | null;
  model: string | null;
  software: string | null;
};

const TAG_MAKE = 0x010f;
const TAG_MODEL = 0x0110;
const TAG_SOFTWARE = 0x0131;
const TAG_DATE_TIME = 0x0132;
/** IFD0 -> the Exif sub-IFD, where the two dates worth having live. */
const TAG_EXIF_IFD = 0x8769;
const TAG_DATE_TIME_ORIGINAL = 0x9003;
const TAG_DATE_TIME_DIGITIZED = 0x9004;

const DATE_TAGS: ReadonlySet<number> = new Set([
  TAG_DATE_TIME,
  TAG_DATE_TIME_ORIGINAL,
  TAG_DATE_TIME_DIGITIZED,
]);

/** What each IFD is walked for. IFD0 holds the names, the save date and the
 *  pointer on; the Exif sub-IFD holds the two capture dates. */
const IFD0_TAGS: ReadonlySet<number> = new Set([TAG_MAKE, TAG_MODEL, TAG_SOFTWARE, TAG_DATE_TIME, TAG_EXIF_IFD]);
const EXIF_IFD_TAGS: ReadonlySet<number> = new Set([TAG_DATE_TIME_ORIGINAL, TAG_DATE_TIME_DIGITIZED]);

const TYPE_ASCII = 2;
const TYPE_LONG = 4;
/** Some writers type the sub-IFD pointer as IFD rather than LONG. Same four bytes. */
const TYPE_IFD = 13;

/** The longest camera, scanner or software name worth reading. Real ones stay
 *  under 40 bytes; a tag claiming more is skipped rather than sliced. */
const MAX_NAME_BYTES = 128;

/** EXIF ASCII is NUL-TERMINATED and the terminator sits inside the declared
 *  length, so a 20-byte date stamp is 19 characters and a \0. */
function asciiValue(bytes: Uint8Array, from: number, to: number): string {
  let out = "";
  for (let i = from; i < to && bytes[i] !== 0; i++) out += String.fromCharCode(bytes[i]);
  return out.trim();
}

/**
 * Walk one IFD and hand back the raw value of every tag asked for.
 *
 * Bounds are checked on every read rather than trusted: this parses bytes a
 * member chose, and a truncated or hostile file must come back empty rather
 * than throw out of the middle of a contribution.
 */
function readIfd(
  tiff: Uint8Array,
  view: DataView,
  at: number,
  littleEndian: boolean,
  wanted: ReadonlySet<number>
): Map<number, string | number> {
  const out = new Map<number, string | number>();
  // 8 is the header; an IFD cannot start inside it.
  if (at < 8 || at + 2 > tiff.length) return out;

  const count = view.getUint16(at, littleEndian);
  for (let i = 0; i < count; i++) {
    const entry = at + 2 + i * 12;
    if (entry + 12 > tiff.length) break;

    const tag = view.getUint16(entry, littleEndian);
    if (!wanted.has(tag)) continue;

    const type = view.getUint16(entry + 2, littleEndian);
    const length = view.getUint32(entry + 4, littleEndian);

    if ((type === TYPE_LONG || type === TYPE_IFD) && length === 1) {
      out.set(tag, view.getUint32(entry + 8, littleEndian));
      continue;
    }
    if (type !== TYPE_ASCII) continue;

    /* A date is worth reading only at its documented length; a name at any
       sane one. */
    const sane = DATE_TAGS.has(tag)
      ? length >= 19 && length <= 32
      : length >= 1 && length <= MAX_NAME_BYTES;
    if (!sane) continue;

    /* Four bytes or fewer sit in the entry itself; anything longer is an
       offset into the TIFF block. */
    const from = length <= 4 ? entry + 8 : view.getUint32(entry + 8, littleEndian);
    if (from + length > tiff.length) continue;
    const value = asciiValue(tiff, from, from + length);
    if (value) out.set(tag, value);
  }
  return out;
}

/**
 * The tags this archive reads out of an EXIF block, or null when the bytes
 * are not one.
 *
 * Takes the block with or without the "Exif\0\0" marker a JPEG puts in front
 * of the TIFF header, because not every container carries it.
 */
export function readTiffTags(block: Uint8Array | null | undefined): FileTags | null {
  if (!block || block.length < 8) return null;

  try {
    const marked = block[0] === 0x45 && block[1] === 0x78 && block[2] === 0x69 && block[3] === 0x66;
    const tiff = marked ? block.subarray(6) : block;
    if (tiff.length < 8) return null;

    const order = String.fromCharCode(tiff[0], tiff[1]);
    if (order !== "II" && order !== "MM") return null;
    const littleEndian = order === "II";
    const view = new DataView(tiff.buffer, tiff.byteOffset, tiff.byteLength);
    if (view.getUint16(2, littleEndian) !== 42) return null; // not a TIFF block after all

    const zeroth = readIfd(tiff, view, view.getUint32(4, littleEndian), littleEndian, IFD0_TAGS);
    const pointer = zeroth.get(TAG_EXIF_IFD);
    const exif =
      typeof pointer === "number"
        ? readIfd(tiff, view, pointer, littleEndian, EXIF_IFD_TAGS)
        : new Map<number, string | number>();

    const text = (from: Map<number, string | number>, tag: number) => {
      const value = from.get(tag);
      return typeof value === "string" ? value : null;
    };
    return {
      original: text(exif, TAG_DATE_TIME_ORIGINAL),
      digitized: text(exif, TAG_DATE_TIME_DIGITIZED),
      modified: text(zeroth, TAG_DATE_TIME),
      make: text(zeroth, TAG_MAKE),
      model: text(zeroth, TAG_MODEL),
      software: text(zeroth, TAG_SOFTWARE),
    };
  } catch {
    /* A malformed block is a photograph with no date, never a failed
       contribution. */
    return null;
  }
}

/** A date as far as it could be read, before judging whether to offer it. */
type Stamp = {
  year: number;
  month: number | null;
  day: number | null;
  /** Exactly 00:00:00, which a camera almost never writes and a tool does. */
  midnight: boolean;
};

function readStamp(raw: string, thisYear: number): Stamp | null {
  const m = /^(\d{4}):(\d{2}):(\d{2})(?:[ T](\d{2}):(\d{2}):(\d{2}))?/.exec(raw.trim());
  if (!m) return null;

  const year = Number(m[1]);
  if (year < PHOTO_YEAR_MIN || year > thisYear) return null;

  const month = Number(m[2]);
  const day = Number(m[3]);
  const monthKnown = month >= 1 && month <= 12;
  return {
    year,
    month: monthKnown ? month : null,
    day: monthKnown && day >= 1 && day <= 31 ? day : null,
    midnight: m[4] === "00" && m[5] === "00" && m[6] === "00",
  };
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
 * which is the tempting version. The owner's own sidecar-merge tool writes
 * recovered timestamps from Google Takeout back into DateTimeOriginal, so a
 * scanned 1978 print in this archive legitimately carries a 1978 stamp -- and
 * that is the single most valuable date this whole mechanism will ever see.
 * The never-set camera clock that floor was reaching for is caught more
 * narrowly, by `judgeTakenDate`'s epoch rule.
 *
 * A month of 00 alongside a real year happens on scanners that only know the
 * year. It is a year, not nothing.
 */
export function parseExifStamp(raw: string, thisYear: number): ExifDate | null {
  const stamp = readStamp(raw, thisYear);
  return stamp ? { year: stamp.year, month: stamp.month } : null;
}

/** A full year, month and day in a name, with no digit either side of it, so
 *  a camera counter (DSC03783, P1020304) is not read as a date. */
const NAME_DATE = /(?:^|\D)((?:19|20)\d\d)[-_.]?(0[1-9]|1[0-2])[-_.]?(0[1-9]|[12]\d|3[01])(?!\d)/;

/** Names whose date is real but is not when the picture was taken: WhatsApp's
 *  is when it arrived, a screenshot's is when the screen was captured, a
 *  scan's is when it was scanned. */
const NAME_NOT_TAKEN = /-WA\d|whatsapp|screen ?shot|screen recording|scan/i;

/**
 * The date a camera wrote into a photograph's FILE NAME, or null.
 *
 * Only a full year-month-day counts. A bare year in a name is a person's
 * label, and a person's label is not always the taken-date: the owner's
 * folder had "..._ISC_2009.jpg", which is the exam year of the student in it.
 */
export function filenameDate(name: string, thisYear: number): Stamp | null {
  if (NAME_NOT_TAKEN.test(name)) return null;
  const m = NAME_DATE.exec(name);
  if (!m) return null;
  const year = Number(m[1]);
  if (year < PHOTO_YEAR_MIN || year > thisYear) return null;
  return { year, month: Number(m[2]), day: Number(m[3]), midnight: false };
}

/** Camera and scanner names, and the software that drives scanners. "scan"
 *  alone covers EPSON Scan, CanoScan, ScanSnap, VueScan and PhotoScan. */
const SCANNED = /scan|perfection|coolscan|opticfilm|plustek|silverfast/i;

/** Where a never-set camera clock starts: the Unix and the DOS epochs. */
const CLOCK_EPOCHS: ReadonlySet<number> = new Set([1970, 1980]);

/** How far a file name and a shutter time may drift and still agree. Two days
 *  covers a time zone either side of midnight and nothing more. */
const AGREE_WITHIN_DAYS = 2;

function agrees(a: Stamp, b: Stamp): boolean {
  if (a.month && a.day && b.month && b.day) {
    const apart = Math.abs(
      Date.UTC(a.year, a.month - 1, a.day) - Date.UTC(b.year, b.month - 1, b.day)
    );
    return apart <= AGREE_WITHIN_DAYS * 86_400_000;
  }
  return a.year === b.year && (a.month === null || b.month === null || a.month === b.month);
}

/**
 * The date worth OFFERING for a photograph, or null when the file does not
 * say it clearly enough to put in front of somebody. The rules, and the
 * story behind each, are at the top of this file.
 *
 * `fileName` is optional because the server's direct upload path never sees
 * one; the corroboration it gives is a bonus, not a requirement.
 */
export function judgeTakenDate({
  tags,
  fileName,
  thisYear,
}: {
  tags: FileTags | null;
  fileName?: string;
  thisYear: number;
}): ExifDate | null {
  if (tags && [tags.make, tags.model, tags.software].some((v) => v && SCANNED.test(v))) {
    return null;
  }

  const named = fileName ? filenameDate(fileName, thisYear) : null;
  const shutter = tags?.original ? readStamp(tags.original, thisYear) : null;

  if (!shutter) return named ? { year: named.year, month: named.month } : null;

  if (shutter.month === 1 && CLOCK_EPOCHS.has(shutter.year)) return null;
  if (named && !agrees(shutter, named)) return null;

  const yearOnly = shutter.month === 1 && shutter.day === 1 && shutter.midnight;
  return { year: shutter.year, month: yearOnly ? null : shutter.month };
}

/* ------------------------------------------------------------------ *
 *  PNG's hex text profile, shared by the server's and the browser's PNG
 *  readers. Apple and ImageMagick write EXIF into a PNG as a text chunk
 *  whose keyword is "Raw profile type APP1" and whose body is the TIFF
 *  block hex-encoded behind a little header. Decoding it parses nothing;
 *  what comes out goes through the same walk as every other format.
 * ------------------------------------------------------------------ */

/** The two keywords a hex-encoded EXIF profile is stored under. */
export const RAW_PROFILE_KEYWORDS = ["Raw profile type APP1", "Raw profile type exif"];

/** A ceiling on one profile. An EXIF block is a few kilobytes; this is generous
 *  and still refuses a zip bomb in a text chunk. */
export const MAX_PROFILE_BYTES = 4 * 1024 * 1024;

/**
 * Decode ImageMagick's hex text profile: `\n<name>\n<length>\n<hex>`, the hex
 * wrapped across lines. The declared length is not trusted; the bytes are
 * whatever the hex decodes to.
 */
export function decodeRawProfile(text: string): Uint8Array | null {
  const lines = text.split("\n");
  /* [0] is empty (the leading newline), [1] the profile name, [2] the length,
     and everything after it the hex. Fewer than four means it is not one. */
  if (lines.length < 4) return null;
  const hex = lines.slice(3).join("").replace(/\s+/g, "");
  if (!hex || hex.length % 2 !== 0 || !/^[0-9a-fA-F]+$/.test(hex)) return null;
  if (hex.length / 2 > MAX_PROFILE_BYTES) return null;
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}
