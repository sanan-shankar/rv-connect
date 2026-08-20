import sharp, { type Sharp } from "sharp";

/**
 * The one place a raw upload buffer becomes a sharp pipeline. Every call site
 * that touches attacker-supplied bytes goes through here so a single decoder
 * policy is enforced everywhere (audit M14).
 *
 * `limitInputPixels` caps how large an image may DECODE to, independent of its
 * file size on disk: a few-kilobyte file can carry a header claiming hundreds
 * of megapixels and, without this, libvips will try to allocate the whole
 * buffer and take the serverless function's memory down with it (a
 * decompression bomb). sharp's own default is ~268MP; ours is far tighter
 * because nothing this community uploads is a legitimate 268-megapixel image.
 *
 * 100MP is comfortably above any phone (a 108MP sensor bins to ~12MP JPEGs;
 * even a full 108MP shot is under this) and any flatbed scan of a heritage
 * photograph, while a 100MP RGBA bitmap is ~400MB — the ceiling we are willing
 * to let one decode reach. Anything above it is refused as unsupported rather
 * than processed.
 *
 * `sequentialRead` lets libvips stream rows instead of holding the whole
 * decoded image where the operation allows it, trimming the peak.
 */
export const MAX_INPUT_PIXELS = 100_000_000;

export function sharpImage(input: Buffer): Sharp {
  return sharp(input, {
    limitInputPixels: MAX_INPUT_PIXELS,
    sequentialRead: true,
    // Fail only on a real decode ERROR, not on a libpng WARNING. sharp 0.35
    // bundles a stricter libpng (1.6.58) whose default (`failOn: "warning"`)
    // rejects otherwise-decodable images that merely carry a cosmetic defect —
    // most commonly the "iCCP: known incorrect sRGB profile" warning that old
    // Photoshop exports and scanner software emit. For a heritage photo archive
    // that is exactly the kind of file we must NOT turn away over a colour-
    // profile nitpick, so we decode it and move on; genuine corruption still
    // throws.
    failOn: "error",
  });
}
