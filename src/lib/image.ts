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

/**
 * The most pixels this app will STORE in a re-encoded image.
 *
 * Distinct from MAX_INPUT_PIXELS above, which is the decompression-bomb
 * ceiling on what may be DECODED at all. This is the smaller question: having
 * decoded something legitimate, how much of it is worth keeping.
 *
 * 40MP. A phone tops out around 12MP after binning, and a good flatbed scan of
 * a heritage photograph at 600dpi is about 35MP for a 10x8 print, so nothing
 * anybody actually uploads is touched by this. What it stops is the case the
 * bomb ceiling let through: a legitimately enormous scan, decoded at up to
 * 100MP and then re-encoded to WebP at quality 90 AT FULL RESOLUTION, twice
 * (once for the display copy and once for the thumbnail), inside a serverless
 * function with a fixed memory budget and a wall-clock limit. That is roughly
 * 400MB of decoded RGBA per pass and many seconds of encode, for detail no
 * screen will ever show (audit M16).
 */
export const MAX_STORED_PIXELS = 40_000_000;

/**
 * The dimensions to resize to so an image fits MAX_STORED_PIXELS, or null when
 * it already does and must not be touched.
 *
 * Scales by AREA rather than clamping the longest side, because those are not
 * the same bound: a 20000x2000 panorama is only 40MP and should survive whole,
 * while a square 7000x7000 is 49MP and should come down. A longest-side cap
 * would shrink the panorama for no reason and leave the square alone.
 */
export function storedPixelFit(
  width: number | undefined,
  height: number | undefined
): { width: number; height: number } | null {
  if (!width || !height) return null;
  const pixels = width * height;
  if (pixels <= MAX_STORED_PIXELS) return null;
  const scale = Math.sqrt(MAX_STORED_PIXELS / pixels);
  return {
    width: Math.max(1, Math.floor(width * scale)),
    height: Math.max(1, Math.floor(height * scale)),
  };
}

/**
 * How many frames an image holds. 1 for an ordinary photograph.
 *
 * Metadata only, never a decode of every frame, so this is cheap enough to ask
 * on the way past. `animated: true` is what makes libvips report the real page
 * count; without it a GIF reads as a single page whatever it actually is,
 * which is precisely why the flattening below went unnoticed.
 *
 * Returns 1 for anything it cannot read. This exists to add a sentence to a
 * response, and a metadata hiccup must never be the thing that fails an
 * upload that otherwise worked.
 */
export async function countImageFrames(input: Buffer): Promise<number> {
  try {
    const meta = await sharp(input, {
      animated: true,
      limitInputPixels: MAX_INPUT_PIXELS,
    }).metadata();
    return typeof meta.pages === "number" && meta.pages > 0 ? meta.pages : 1;
  } catch {
    return 1;
  }
}
