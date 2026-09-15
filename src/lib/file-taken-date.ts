/* ------------------------------------------------------------------ *
 *  THE TAKEN-DATE OF A PHOTOGRAPH STILL ON THE MEMBER'S OWN MACHINE.
 *
 *  The server can only read a photograph's date once Add is pressed,
 *  which is too late to put it in front of the person answering "When
 *  was it taken?". The owner hit exactly that gap on 2026-09-15: "I never
 *  got the suggestion for the month and year even though that metadata
 *  is there."
 *
 *  So the contribute pop-up reads it here, the moment a photograph lands.
 *  This finds the EXIF block inside a JPEG, a WebP or a PNG by reading
 *  only the bytes it needs -- `Blob.slice` is lazy, so a 20MB photograph
 *  costs a few kilobytes -- and hands it to `taken-date.ts`, the same
 *  judgement the server applies. HEIC is refused before it gets here and
 *  a GIF carries no EXIF.
 *
 *  NOTHING READ HERE LEAVES THE DEVICE. Only the verdict is kept, and only
 *  as a suggestion on screen; the upload is still stripped server-side.
 *
 *  It cannot fail a contribution: a file it cannot make sense of is a
 *  photograph with no suggestion, and its name may still offer one.
 * ------------------------------------------------------------------ */

import {
  decodeRawProfile,
  judgeTakenDate,
  MAX_PROFILE_BYTES,
  RAW_PROFILE_KEYWORDS,
  readTiffTags,
  type ExifDate,
  type FileTags,
} from "./taken-date.ts";
import { sniffImageType } from "./upload-shared.ts";
import { valleyYear } from "./utils.ts";

/** How many segments or chunks are walked before giving up. Real files carry a
 *  handful before their pixels; the cap is for a crafted one. */
const MAX_SEGMENTS = 64;

const LATIN1 = new TextDecoder("latin1");

async function read(file: Blob, from: number, to: number): Promise<Uint8Array<ArrayBuffer>> {
  return new Uint8Array(await file.slice(from, Math.min(to, file.size)).arrayBuffer());
}

function fourCC(bytes: Uint8Array, at: number): string {
  return String.fromCharCode(bytes[at], bytes[at + 1], bytes[at + 2], bytes[at + 3]);
}

/**
 * The date worth suggesting for a picked file, or null.
 *
 * The file's `lastModified` is deliberately never read: it is the date the
 * file was copied, which is how 180 photographs from 2011 to 2018 all came to
 * say 2020 (see taken-date.ts).
 */
export async function takenDateOfFile(file: File): Promise<ExifDate | null> {
  let tags: FileTags | null = null;
  try {
    tags = await tagsOfFile(file);
  } catch {
    /* Unreadable bytes. The name may still say. */
  }
  return judgeTakenDate({ tags, fileName: file.name, thisYear: valleyYear() });
}

/** The EXIF tags inside a JPEG, WebP or PNG, recognised by the same byte
 *  sniff the server trusts rather than by MIME type or extension. */
async function tagsOfFile(file: Blob): Promise<FileTags | null> {
  switch (sniffImageType(await read(file, 0, 12))) {
    case "jpeg":
      return jpegTags(file);
    case "webp":
      return webpTags(file);
    case "png":
      return pngTags(file);
    default:
      // A GIF carries no EXIF, and anything else is not an image.
      return null;
  }
}

/** JPEG: markers from the start of the file to the start of the pixels, and the
 *  APP1 segment that begins "Exif\0\0". Usually the first segment, but an ICC
 *  or Photoshop segment can come before it. */
async function jpegTags(file: Blob): Promise<FileTags | null> {
  let at = 2;
  for (let i = 0; i < MAX_SEGMENTS && at + 4 <= file.size; i++) {
    const h = await read(file, at, at + 4);
    if (h[0] !== 0xff) return null;
    const marker = h[1];

    /* Fill bytes and standalone markers carry no length. */
    if (marker === 0xff) {
      at += 1;
      continue;
    }
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      at += 2;
      continue;
    }
    /* Start of scan or end of image: the metadata is behind us. */
    if (marker === 0xda || marker === 0xd9) return null;

    const size = (h[2] << 8) | h[3];
    if (size < 2) return null;
    if (marker === 0xe1) {
      const body = await read(file, at + 4, at + 2 + size);
      if (body.length >= 6 && fourCC(body, 0) === "Exif" && body[4] === 0 && body[5] === 0) {
        return readTiffTags(body);
      }
      /* An APP1 that is not EXIF is XMP. Keep walking. */
    }
    at += 2 + size;
  }
  return null;
}

/** WebP: RIFF chunks, one of which is "EXIF". It usually sits AFTER the image
 *  data, which is why this seeks from header to header instead of reading a
 *  fixed head of the file. */
async function webpTags(file: Blob): Promise<FileTags | null> {
  let at = 12;
  for (let i = 0; i < MAX_SEGMENTS && at + 8 <= file.size; i++) {
    const h = await read(file, at, at + 8);
    const size = new DataView(h.buffer).getUint32(4, true);
    if (fourCC(h, 0) === "EXIF") {
      return size <= MAX_PROFILE_BYTES ? readTiffTags(await read(file, at + 8, at + 8 + size)) : null;
    }
    /* RIFF pads odd-sized chunks to an even length. */
    at += 8 + size + (size & 1);
  }
  return null;
}

/** PNG: chunks up to the first IDAT, looking for the modern eXIf chunk or the
 *  hex text profile Apple and ImageMagick write. The same stopping rule as the
 *  server's reader (`exifFromPng`), so the two find the same block. */
async function pngTags(file: Blob): Promise<FileTags | null> {
  let at = 8;
  for (let i = 0; i < MAX_SEGMENTS && at + 8 <= file.size; i++) {
    const h = await read(file, at, at + 8);
    const length = new DataView(h.buffer).getUint32(0);
    const type = fourCC(h, 4);
    if (type === "IDAT" || type === "IEND") return null;

    if (type === "eXIf" || type === "zTXt" || type === "tEXt") {
      if (length > MAX_PROFILE_BYTES) return null;
      const body = await read(file, at + 8, at + 8 + length);
      if (type === "eXIf") return readTiffTags(body);

      const nul = body.indexOf(0);
      if (nul > 0 && RAW_PROFILE_KEYWORDS.includes(LATIN1.decode(body.subarray(0, nul)))) {
        /* zTXt puts a one-byte compression method after the NUL; tEXt has no
           compression and no method byte. */
        const text = type === "zTXt" ? await inflate(body.subarray(nul + 2)) : body.subarray(nul + 1);
        const block = text && decodeRawProfile(LATIN1.decode(text));
        if (block) return readTiffTags(block);
      }
    }
    /* +4 for the CRC. */
    at += 8 + length + 4;
  }
  return null;
}

/** zlib inflate in the browser, capped so a text chunk cannot expand without
 *  limit. Null on anything that is not valid deflate data. */
async function inflate(data: Uint8Array<ArrayBuffer>): Promise<Uint8Array | null> {
  try {
    const reader = new Blob([data]).stream().pipeThrough(new DecompressionStream("deflate")).getReader();
    const parts: Uint8Array[] = [];
    let total = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.length;
      if (total > MAX_PROFILE_BYTES) {
        await reader.cancel();
        return null;
      }
      parts.push(value);
    }
    const out = new Uint8Array(total);
    let offset = 0;
    for (const part of parts) {
      out.set(part, offset);
      offset += part.length;
    }
    return out;
  } catch {
    return null;
  }
}
