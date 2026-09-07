"use client";

/* ------------------------------------------------------------------ *
 *  AvatarCropDialog, "Frame your photo" (owner item 13: reposition an
 *  uploading picture before it becomes the profile photo).
 *
 *  The photo pans and zooms inside a fixed circular frame; whatever
 *  the circle shows is exactly what ships. On confirm the visible
 *  square is drawn to a 512x512 canvas and encoded as WebP, so the
 *  wire payload drops from a possible 15MB original to roughly 40KB,
 *  comfortably under Vercel's ~4.5MB serverless body cap (see
 *  src/app/api/upload/presign/route.ts) with no presign round-trip.
 *
 *  Decode goes through createImageBitmap with imageOrientation:
 *  "from-image", which bakes EXIF rotation into the pixels (same move
 *  as src/lib/image-downscale.ts). That is REQUIRED, not a nicety:
 *  the server's sharp .rotate() only ever sees our re-encoded crop,
 *  never the original file, so if rotation were not baked here a
 *  portrait phone photo would ship sideways. Files the browser cannot
 *  decode (HEIC and friends) fall back to onDecodeError so the caller
 *  can use the old direct-upload path, where the server's friendly
 *  "export as JPG" message lives.
 *
 *  Built on THE dialog material (@/components/ui/dialog): its z-50
 *  panel already clears the settings save bar (z-20), and hand-rolling
 *  a second overlay is a bug, not a choice.
 * ------------------------------------------------------------------ */

import { useCallback, useEffect, useRef, useState } from "react";
import { m, useMotionValue } from "motion/react";
import { Minus, Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

/* Frame edge in CSS px. 256 fits the dialog's max-w-sm panel (384 minus
   2x16px padding leaves 352) and a 390px phone (content ~326px) with air to
   spare, while staying large enough to place a face by eye. */
const FRAME = 256;

/* Output edge. Avatars render at most ~112 CSS px today; 512 covers double
   that at 2x retina, so no current or plausible future surface ever upscales
   the stored crop. Because the output is a fixed pixel count, none of the
   crop math below needs devicePixelRatio: everything is measured in CSS px
   and the ratio cancels out of the display-to-source mapping. */
const OUT_SIZE = 512;

/* Same quality the pre-upload downscaler uses (src/lib/image-downscale.ts),
   so a cropped avatar and a feed photo share one encoding standard. */
const WEBP_QUALITY = 0.82;

/* 1x means the photo's short edge exactly fills the circle; anything below
   would let the backdrop show through the crop. */
const MIN_ZOOM = 1;
/* At 3x the visible square samples only a third of the photo's short edge,
   which for a typical phone picture is already being upscaled into the 512
   output; more zoom only manufactures blur. */
const MAX_ZOOM = 3;
/* Four presses cover the whole 1x..3x range; a finer step reads as the
   buttons doing nothing. */
const ZOOM_STEP = 0.5;
/* One standard 100px wheel notch multiplies zoom by e^0.2 (~1.22x), so about
   six notches span the range: quick, but still controllable on a trackpad.
   Exponential steps feel even across the range where linear ones crawl at 1x
   and lurch at 3x. */
const WHEEL_ZOOM_RATE = 0.002;

interface DecodedImage {
  bitmap: ImageBitmap;
  /** Object URL of the original file, used only for the on-screen preview. */
  url: string;
  width: number;
  height: number;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

/* ------------------------------------------------------------------ *
 *  The crop math, derived once.
 *
 *  Display scale (CSS px per natural px), chosen so the SHORT edge
 *  covers the frame at 1x:   s = (FRAME / min(nw, nh)) * zoom
 *
 *  The image is drawn centred in the frame and then panned by the drag
 *  offset (x, y), i.e. the image centre sits at frame-centre + (x, y).
 *  A display point p (measured from the frame centre) therefore shows
 *  natural pixel   n/2 + (p - offset) / s   on each axis.
 *
 *  Pan limits: the displayed image is (nw*s by nh*s); for no edge to
 *  enter the frame the centre may travel at most half the overhang:
 *      maxX = (nw*s - FRAME) / 2,  maxY = (nh*s - FRAME) / 2
 *  (>= 0 always, because s covers the frame by construction).
 *
 *  Source rect: the visible square runs p = -FRAME/2 .. +FRAME/2, so
 *      sx = nw/2 - (FRAME/2 + x) / s
 *      sy = nh/2 - (FRAME/2 + y) / s
 *      side = FRAME / s          (<= min(nw, nh), again by construction)
 * ------------------------------------------------------------------ */
function panLimits(w: number, h: number, zoom: number): { maxX: number; maxY: number } {
  const s = (FRAME / Math.min(w, h)) * zoom;
  return {
    maxX: Math.max(0, (w * s - FRAME) / 2),
    maxY: Math.max(0, (h * s - FRAME) / 2),
  };
}

export function AvatarCropDialog({
  file,
  onConfirm,
  onCancel,
  onDecodeError,
}: {
  /** The picked file; the dialog is open exactly while this is non-null. */
  file: File | null;
  /** Receives the 512x512 WebP crop; the caller uploads it and clears `file`. */
  onConfirm: (blob: Blob) => void | Promise<void>;
  /** Dismissed without confirming (Esc, backdrop, X, or Cancel). */
  onCancel: () => void;
  /** The browser could not decode the file (HEIC etc.); the caller falls back
      to the plain upload path where the server's format message lives. */
  onDecodeError: (file: File) => void;
}) {
  const [image, setImage] = useState<DecodedImage | null>(null);
  const [zoom, setZoom] = useState(MIN_ZOOM);
  const [confirming, setConfirming] = useState(false);
  /* Pan offset of the image centre from the frame centre, in CSS px. Motion
     values so the drag never re-renders and we can clamp programmatically. */
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const frameRef = useRef<HTMLDivElement>(null);

  /* Latest-ref for the error callback so the decode effect depends only on
     `file`; an inline callback prop must not retrigger a decode. */
  const onDecodeErrorRef = useRef(onDecodeError);
  useEffect(() => {
    onDecodeErrorRef.current = onDecodeError;
  });

  /* Decode on open, release on close: the bitmap is closed and the preview
     URL revoked the moment the file changes or the dialog unmounts. */
  useEffect(() => {
    if (!file) return;
    let cancelled = false;
    let owned: { bitmap: ImageBitmap; url: string } | null = null;
    createImageBitmap(file, { imageOrientation: "from-image" })
      .then((bitmap) => {
        if (cancelled) {
          bitmap.close();
          return;
        }
        owned = { bitmap, url: URL.createObjectURL(file) };
        setImage({ bitmap, url: owned.url, width: bitmap.width, height: bitmap.height });
        setZoom(MIN_ZOOM);
        x.set(0);
        y.set(0);
      })
      .catch(() => {
        if (!cancelled) onDecodeErrorRef.current(file);
      });
    return () => {
      cancelled = true;
      if (owned) {
        owned.bitmap.close();
        URL.revokeObjectURL(owned.url);
      }
      setImage(null);
    };
  }, [file, x, y]);

  /* Zoom to a target, keeping the image point under the circle's centre put:
     offsets are measured from the centre, so they scale linearly with zoom.
     Then re-clamp so the new travel range can never expose an edge (zooming
     OUT tightens the range; without the clamp the photo could sit off-edge). */
  const changeZoom = useCallback(
    (next: number) => {
      const target = clamp(next, MIN_ZOOM, MAX_ZOOM);
      if (image && target !== zoom) {
        const ratio = target / zoom;
        const { maxX, maxY } = panLimits(image.width, image.height, target);
        x.set(clamp(x.get() * ratio, -maxX, maxX));
        y.set(clamp(y.get() * ratio, -maxY, maxY));
      }
      setZoom(target);
    },
    [image, zoom, x, y]
  );

  /* Wheel-to-zoom needs a NATIVE non-passive listener: React registers wheel
     as passive, and a passive handler cannot preventDefault, so the page
     would scroll behind the dialog while zooming. */
  useEffect(() => {
    const el = frameRef.current;
    if (!el || !image) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      changeZoom(zoom * Math.exp(-e.deltaY * WHEEL_ZOOM_RATE));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [image, zoom, changeZoom]);

  async function handleConfirm() {
    if (!image || !file || confirming) return;
    setConfirming(true);
    try {
      const { bitmap, width: nw, height: nh } = image;
      const s = (FRAME / Math.min(nw, nh)) * zoom;
      /* Confirm can land mid rubber-band (dragElastic lets the photo overhang
         its limits until the spring returns), so clamp to the true limits
         before mapping; the outer clamps only absorb float dust. */
      const { maxX, maxY } = panLimits(nw, nh, zoom);
      const ox = clamp(x.get(), -maxX, maxX);
      const oy = clamp(y.get(), -maxY, maxY);
      const side = FRAME / s;
      const sx = clamp(nw / 2 - (FRAME / 2 + ox) / s, 0, nw - side);
      const sy = clamp(nh / 2 - (FRAME / 2 + oy) / s, 0, nh - side);

      const canvas = document.createElement("canvas");
      canvas.width = OUT_SIZE;
      canvas.height = OUT_SIZE;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        /* No 2D context means we cannot crop at all; hand the original to the
           plain upload path rather than dead-ending the user. */
        onDecodeError(file);
        return;
      }
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, OUT_SIZE, OUT_SIZE);
      /* A browser without WebP encode support silently hands back PNG here
         (per spec), which the server converts to WebP anyway; it only costs
         bytes, never correctness. A null blob means encoding failed outright,
         so fall back like the no-context case above. */
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/webp", WEBP_QUALITY)
      );
      if (!blob) {
        onDecodeError(file);
        return;
      }
      await onConfirm(blob);
    } finally {
      setConfirming(false);
    }
  }

  /* Display geometry for the current zoom (null while decoding). */
  const stage = image
    ? (() => {
        const s = (FRAME / Math.min(image.width, image.height)) * zoom;
        const dw = image.width * s;
        const dh = image.height * s;
        const { maxX, maxY } = panLimits(image.width, image.height, zoom);
        return { dw, dh, maxX, maxY };
      })()
    : null;

  return (
    <Dialog
      open={file !== null}
      onOpenChange={(open) => {
        /* Ignore dismissals while the crop is uploading; the buttons are
           already disabled and a half-saved close would strand the caller. */
        if (!open && !confirming) onCancel();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Frame your photo</DialogTitle>
          <DialogDescription>
            Drag to reposition, zoom to fit. The circle is what everyone sees.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-1">
          {/* The one sanctioned way a picture moves: inside its own
              overflow-hidden frame (DESIGN-SYSTEM sec 7). The circle IS the
              final crop; nothing outside it survives. While decoding, the
              circle wears the warm shimmer, never a grey pulse. */}
          <div
            ref={frameRef}
            className={
              image ? "relative overflow-hidden rounded-full" : "skeleton-warm rounded-full"
            }
            style={{ width: FRAME, height: FRAME }}
          >
            {image && stage && (
              /* Drag precedent: pinch-zoom.ts's SWIPE_FOLLOW, 0.14, the house
                 rubber-band. The viewer itself no longer uses Motion's drag --
                 it knows about one pointer, so a second finger kept dragging
                 instead of pinching -- but the number it was tuned with is
                 still the one a hand expects. Momentum is off because a crop is precise
                 placement: a glide that keeps travelling after the finger
                 stops fights the "put THIS pixel in the middle" intent. The
                 constraints keep every image edge at or outside the circle at
                 rest; the elastic overhang is transient and springs back.
                 max-w-none beats the preflight img { max-width: 100% }, which
                 would otherwise cap the pan range. */
              <m.img
                src={image.url}
                alt=""
                draggable={false}
                drag
                dragConstraints={{
                  left: -stage.maxX,
                  right: stage.maxX,
                  top: -stage.maxY,
                  bottom: stage.maxY,
                }}
                dragElastic={0.14}
                dragMomentum={false}
                style={{
                  x,
                  y,
                  width: stage.dw,
                  height: stage.dh,
                  left: (FRAME - stage.dw) / 2,
                  top: (FRAME - stage.dh) / 2,
                }}
                className="absolute max-w-none cursor-grab select-none active:cursor-grabbing"
              />
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              aria-label="Zoom out"
              disabled={!image || confirming || zoom <= MIN_ZOOM}
              onClick={() => changeZoom(zoom - ZOOM_STEP)}
            >
              <Minus />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              aria-label="Zoom in"
              disabled={!image || confirming || zoom >= MAX_ZOOM}
              onClick={() => changeZoom(zoom + ZOOM_STEP)}
            >
              <Plus />
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" disabled={confirming} onClick={onCancel}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            disabled={!image || confirming}
            onClick={handleConfirm}
          >
            {confirming ? "Saving..." : "Use this photo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
