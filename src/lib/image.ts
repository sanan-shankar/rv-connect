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
/**
 * The display copy of an uploaded photograph: uprighted, boxed to 1920, WebP
 * at 80.
 *
 * Both processing routes ran this recipe out longhand, and the second one's
 * comment said "same recipe as the classic /api/upload proxy route" -- which
 * is a promise a comment cannot keep. Here it is kept by construction, so a
 * change to the box or the quality reaches the feed and the direct path
 * together.
 *
 * `.rotate()` with no argument applies the EXIF orientation and then drops
 * the tag, which is what stops a phone photo arriving on its side.
 */
export async function toDisplayWebp(input: Buffer): Promise<Buffer> {
  return sharpImage(input)
    .rotate()
    .resize(1920, 1920, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer();
}

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

/* ─── What we know about a stored image ─────────────────────────────────── *
 *
 * Everything below measures the bytes we are about to SERVE -- the display
 * WebP, after rotation and after the 1920 box -- not the file that left the
 * camera. The shape a layout has to solve for is the shape the browser will
 * receive.
 */

/** The row `Image` holds, minus the URL that keys it. */
export type ImageFacts = {
  width: number;
  height: number;
  /** 0..1 from the left / top. Raw and unclamped; see the schema comment. */
  focalX: number;
  focalY: number;
  greyscale: boolean;
  blurDataUrl: string | null;
};

/** Nothing measurable: the answer every fallback path gives. Square-ish and
 *  centred, so a consumer that ignores the fallback still gets sane numbers. */
export const UNKNOWN_FOCAL = 0.5;

/**
 * How large the one decode is that every measurement below shares.
 *
 * 160px on the longest edge. Measuring on the full 1920 image would cost three
 * more decodes of a megapixel buffer inside a serverless function for numbers
 * that do not change: attention is a coarse regional judgement (sharp shrinks
 * before computing it anyway), mean chroma is a whole-image average, and the
 * smear is 16px. Small enough to be nearly free, large enough that a face
 * occupying a tenth of the frame is still 16px across in the probe.
 */
const PROBE_EDGE = 160;

/**
 * The probe crop is the image's own shape with 20% of its height taken off.
 *
 * There has to be SOME crop or libvips never runs smartcrop and reports no
 * focal point at all -- a square image asked for a square crop comes back with
 * `attentionX` undefined, which is how this arrives as NaN if you ask for a
 * square and forget that squares exist. Deriving the target from the source
 * shape guarantees a crop whatever the aspect ratio, and both coordinates come
 * back from that one pass even though only one axis was cut.
 */
const FOCAL_SQUEEZE = 0.8;

/** The longest edge of the blur-up smear. At 16px the arch in a photograph of
 *  the banyan is still readable as an arch and the data URI is ~160 bytes; at
 *  12 it is mush, at 24 it starts showing structure a CSS blur then has to
 *  hide. Compared side by side on real photographs before picking. */
const LQIP_EDGE = 16;

/**
 * Mean chroma below which we call a photograph black and white: 8 of 255.
 *
 * Measured, not guessed. A true greyscale copy of one of our own photographs
 * reads 0.01; the five colour photographs to hand read 16.8 to 49.3. Eight sits
 * in the empty middle with room on both sides for JPEG colour noise in an old
 * scan. Sepia and faded prints read as colour, which is the honest answer --
 * they have a hue -- and is worth remembering before this is offered as a "black
 * and white" filter over a heritage archive.
 */
const GREYSCALE_CHROMA = 8;

/**
 * Average colourfulness of raw pixels, 0 (no colour at all) to 255.
 *
 * Per pixel: how far apart its most and least intense channels are, which is
 * exactly zero when r == g == b however light or dark the pixel is. Pure, so it
 * can be tested without a decoder.
 */
export function meanChroma(pixels: Uint8Array | Buffer, channels: number): number {
  if (channels < 3) return 0; // a one-channel image has no colour to measure
  let total = 0;
  let count = 0;
  for (let i = 0; i + 2 < pixels.length; i += channels) {
    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];
    total += Math.max(r, g, b) - Math.min(r, g, b);
    count += 1;
  }
  return count === 0 ? 0 : total / count;
}

/** Whether raw pixels carry no colour worth speaking of. */
export function isGreyscale(pixels: Uint8Array | Buffer, channels: number): boolean {
  return meanChroma(pixels, channels) < GREYSCALE_CHROMA;
}

/**
 * sharp's attention coordinates as a fraction of the frame.
 *
 * `attentionX`/`attentionY` come back in the coordinates of the image handed to
 * the resize (pipeline.cc divides by the resize scale before reporting them),
 * so the divisor is the probe's own size. Undefined when no crop happened; out
 * of range at the very edges. Both land on the centre rather than on a number
 * that would aim a crop off the frame.
 */
export function focalFraction(
  attention: number | undefined,
  extent: number
): number {
  if (typeof attention !== "number" || !Number.isFinite(attention) || extent <= 0) {
    return UNKNOWN_FOCAL;
  }
  return Math.min(1, Math.max(0, attention / extent));
}

/**
 * Measure a stored image: shape, focal point, colour, and a smear to hold its
 * place. One decode, then three cheap operations on a 160px probe.
 *
 * Never throws. Every field has a defined "we could not tell" value, and an
 * upload that worked must not fail over a measurement -- a missing row means
 * the renderer falls back to what it did before this table existed, which is
 * the whole reason the table is keyed by URL rather than joined to a post.
 */
export async function describeImage(stored: Buffer): Promise<ImageFacts | null> {
  try {
    const meta = await sharpImage(stored).metadata();
    if (!meta.width || !meta.height) return null;

    const probe = await sharpImage(stored)
      .resize(PROBE_EDGE, PROBE_EDGE, { fit: "inside", withoutEnlargement: true })
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const { width: pw, height: ph, channels } = probe.info;
    const raw = { raw: { width: pw, height: ph, channels } } as const;

    const cropped = await sharp(probe.data, raw)
      .resize(pw, Math.max(1, Math.round(ph * FOCAL_SQUEEZE)), {
        fit: "cover",
        position: sharp.strategy.attention,
      })
      .raw()
      .toBuffer({ resolveWithObject: true });

    const smear = await sharp(probe.data, raw)
      .resize(LQIP_EDGE, LQIP_EDGE, { fit: "inside" })
      .webp({ quality: 20 })
      .toBuffer()
      .catch(() => null);

    return {
      width: meta.width,
      height: meta.height,
      focalX: focalFraction(cropped.info.attentionX, pw),
      focalY: focalFraction(cropped.info.attentionY, ph),
      greyscale: isGreyscale(probe.data, channels),
      blurDataUrl: smear ? `data:image/webp;base64,${smear.toString("base64")}` : null,
    };
  } catch (err) {
    // Loud, per the house rule: a guard that hides its own breakage is worse
    // than no guard, and this one fails invisibly by design -- the page simply
    // goes on jumping the way it used to.
    console.error(
      "[image] could not measure a stored image:",
      err instanceof Error ? err.message : err
    );
    return null;
  }
}
