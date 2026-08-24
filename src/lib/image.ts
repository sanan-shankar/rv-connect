import sharp, { type Sharp } from "sharp";
import { MAX_INPUT_PIXELS } from "./upload-shared.ts";

/**
 * The one place a raw upload buffer becomes a sharp pipeline. Every call site
 * that touches attacker-supplied bytes goes through here so a single decoder
 * policy is enforced everywhere (audit M14).
 *
 * `limitInputPixels` is the decode ceiling; it and the reasoning behind its
 * number live in upload-shared.ts, next to the other upload limits, so the
 * refusal message can quote it.
 *
 * `sequentialRead` lets libvips stream rows instead of holding the whole
 * decoded image where the operation allows it, trimming the peak.
 */
export { MAX_INPUT_PIXELS };

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
 * WebP cannot hold a side longer than this. Not a policy of ours: it is the
 * format's own hard limit, and an encode above it throws.
 */
export const WEBP_MAX_DIM = 16383;

/**
 * The box to resize an image into before storing it: inside the area budget,
 * inside WebP's own side limit, and measured on the image the pipeline will
 * actually produce.
 *
 * Both halves of that last clause were wrong at the one call site.
 *
 * `metadata()` reads the INPUT header and does not run the pending pipeline,
 * so `.rotate().metadata()` returns the STORED width and height, not the
 * upright ones -- sharp puts those in `autoOrient` (0.35, and the type defs
 * say so). A portrait photograph whose EXIF says "turn me" therefore had a
 * LANDSCAPE box computed for it, and `fit: "inside"` then shrank the rotated
 * image to fit the transposed box: a 50MP portrait was stored at 22.7MP, a 43%
 * loss, in an archive whose whole point is full resolution (audit C-067).
 *
 * And the area budget replaced the side limit rather than joining it: over
 * 40MP the 16383 ceiling was simply not applied, so a legal stitched panorama
 * (25000x2000, inside every stated limit) came out 22360px wide and threw at
 * the encode, which the member saw as "could not process the photo" (C-070).
 * Area and side are separate bounds; both apply.
 */
export function storedResizeBox(meta: {
  width?: number;
  height?: number;
  autoOrient?: { width?: number; height?: number };
}): { width: number; height: number } {
  const upright =
    meta.autoOrient?.width && meta.autoOrient?.height
      ? meta.autoOrient
      : { width: meta.width, height: meta.height };
  const fit = storedPixelFit(upright.width, upright.height);
  return {
    width: Math.min(fit?.width ?? WEBP_MAX_DIM, WEBP_MAX_DIM),
    height: Math.min(fit?.height ?? WEBP_MAX_DIM, WEBP_MAX_DIM),
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
