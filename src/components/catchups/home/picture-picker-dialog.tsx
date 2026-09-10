"use client";

/* ------------------------------------------------------------------ *
 *  Choosing a Catch-up's photograph, and where its crop is taken from.
 *
 *  Spec 3.4 and 10.2. Every Catch-up has a picture from the day it is
 *  made, so this is never "add one" -- it is always a replacement, and
 *  the current one is on screen the whole time.
 *
 *  THE THING THAT HAS FOOLED TWO SESSIONS: THE CROP MOVES BETWEEN
 *  SCREENS. The same photograph is drawn at 6.33:1 on a wide monitor's
 *  banner, 2.5:1 on a laptop's list card and 1.78:1 on a phone's, and
 *  `object-position` is the only thing that travels with it. So the
 *  aiming frame below is the TIGHTEST of those, not the roomiest: what
 *  you place inside it is what every screen keeps. Aim inside the roomy
 *  one instead and a phone-shaped choice quietly falls out of the banner
 *  a laptop draws, which nobody would ever see happen. The band and the
 *  measurements behind it are in src/lib/catchup-pictures.ts.
 *
 *  Two other things it borrows from `photo-aim.tsx`, which solved this
 *  once already for the feed and is the reason this is assembly rather
 *  than design: the frame is the REAL one rather than a generic preview,
 *  and the number is quantised to a whole percent so what the drag showed
 *  and what the column stores cannot disagree.
 * ------------------------------------------------------------------ */

import { useCallback, useEffect, useRef, useState } from "react";
import { ImageUp, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { callAction } from "@/lib/call-action";
import { uploadOneImage } from "@/lib/upload-client";
import { MAX_UPLOAD_BYTES } from "@/lib/upload-shared";
import {
  CATCHUP_PICTURES,
  DEFAULT_PICTURE_FOCUS,
  PICTURE_BAND_RATIO,
  type CatchupPicture,
} from "@/lib/catchup-pictures";
import { setCatchupPicture } from "@/app/(main)/catchups/actions";
import { cn } from "@/lib/utils";

/** One press of an arrow key, as a share of the frame. Small enough to place a
 *  horizon, large enough that holding the key is not a career. Same step
 *  `photo-aim.tsx` settled on. */
const KEY_STEP = 0.02;

/** Whole percent, which is all an `object-position` is ever given, and the
 *  reason is not tidiness: a drag that showed 53% once stored 0.5747 and the
 *  card then drew 57%, three per cent from the frame the person had just
 *  approved. A control whose whole promise is "this is what everyone sees"
 *  cannot round differently from what it saves. */
const quantise = (v: number) => Math.round(Math.min(1, Math.max(0, v)) * 100) / 100;

/** The vertical half of an `object-position`, as a fraction. Anything this
 *  cannot read starts at the pool's own default rather than at dead centre,
 *  because centre is the one place these photographs are never aimed. */
function verticalOf(focus: string): number {
  const m = focus.match(/(\d{1,3})%\s*$/);
  if (m) return Math.min(1, Number(m[1]) / 100);
  if (/\btop\b/.test(focus)) return 0;
  if (/\bbottom\b/.test(focus)) return 1;
  return 0.85;
}

export function PicturePickerDialog({
  open,
  onOpenChange,
  catchupId,
  picture,
  onChanged,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  catchupId: string;
  picture: CatchupPicture;
  onChanged: () => void;
}) {
  const [src, setSrc] = useState(picture.src);
  const [aim, setAim] = useState(() => verticalOf(picture.focus));
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  const box = useRef<HTMLDivElement>(null);
  /* The uploaded picture, kept for as long as the dialog is open so that
     picking a pool photograph after uploading one and then changing your mind
     does not throw the upload away and make you do it again. */
  const [mine, setMine] = useState<string | null>(null);

  /* Reopening shows what is actually stored. Without this, a dialog closed
     without saving keeps whatever was being tried on, and the next opening
     opens on a picture this Catch-up has never had. */
  useEffect(() => {
    if (!open) return;
    setSrc(picture.src);
    setAim(verticalOf(picture.focus));
  }, [open, picture.src, picture.focus]);

  /* Where the window may travel, in the pixels actually on screen. The
     photograph is drawn to the frame's WIDTH (every source here is squarer
     than a 6.33:1 band, so width always binds), which makes its drawn height
     width / sourceRatio and the overflow whatever hangs off. Measured from the
     DOM rather than from the file, so it is right whatever the dialog's own
     width turned out to be on this screen. */
  const overflow = useCallback(() => {
    const el = box.current;
    if (!el) return 1;
    const img = el.querySelector("img");
    const natural =
      img && img.naturalWidth > 0 ? img.naturalWidth / img.naturalHeight : PICTURE_BAND_RATIO;
    return Math.max(1, el.clientWidth / natural - el.clientHeight);
  }, []);

  function grab(e: React.PointerEvent) {
    const el = e.currentTarget as HTMLElement;
    el.setPointerCapture(e.pointerId);
    const startY = e.clientY;
    const startAim = aim;
    const travel = overflow();
    const move = (ev: PointerEvent) => {
      // Dragging the photograph DOWN reveals what is above it, which is a
      // smaller object-position. Hence the sign.
      setAim(quantise(startAim - (ev.clientY - startY) / travel));
    };
    const drop = () => {
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", drop);
      el.removeEventListener("pointercancel", drop);
    };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", drop);
    el.addEventListener("pointercancel", drop);
  }

  async function pickFile(chosen: File | undefined) {
    if (!chosen) return;
    if (chosen.size > MAX_UPLOAD_BYTES) {
      toast.error("That picture is over the 20MB limit.");
      return;
    }
    setUploading(true);
    try {
      const url = await uploadOneImage(chosen, "That picture");
      setMine(url);
      setSrc(url);
      // A photograph nobody has aimed starts where the pool's own do, low in
      // the frame: what makes a picture of this place read as a place sits in
      // the lower quarter of nearly all of them.
      setAim(verticalOf(DEFAULT_PICTURE_FOCUS));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "That picture did not upload.");
    } finally {
      setUploading(false);
      // Cleared, so choosing the SAME file again still fires a change event.
      if (file.current) file.current.value = "";
    }
  }

  async function save() {
    setSaving(true);
    const focus = `center ${Math.round(aim * 100)}%`;
    const result = await callAction(() => setCatchupPicture(catchupId, { src, focus }));
    setSaving(false);
    if (result && "error" in result) {
      toast.error(result.error);
      return;
    }
    toast.success("Picture changed.");
    onChanged();
    onOpenChange(false);
  }

  const options: CatchupPicture[] = mine
    ? [{ src: mine, focus: DEFAULT_PICTURE_FOCUS }, ...CATCHUP_PICTURES]
    : CATCHUP_PICTURES;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-heading tracking-tight">The picture</DialogTitle>
          <DialogDescription>
            Pick one of ours, or use your own, then drag it to choose what stays in frame.
          </DialogDescription>
        </DialogHeader>

        {/* The aiming frame, and it is the real one: the tightest band any
            screen takes out of this photograph. Whatever sits inside it
            survives everywhere. */}
        <div>
          <div
            ref={box}
            onPointerDown={grab}
            onKeyDown={(e) => {
              if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
              e.preventDefault();
              setAim((v) => quantise(v + (e.key === "ArrowUp" ? -KEY_STEP : KEY_STEP)));
            }}
            role="slider"
            tabIndex={0}
            aria-label="What stays in frame"
            aria-orientation="vertical"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(aim * 100)}
            aria-valuetext={`${Math.round(aim * 100)}% down the photograph`}
            className="w-full cursor-grab touch-none select-none overflow-hidden rounded-[var(--radius)] bg-mist active:cursor-grabbing focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            style={{ aspectRatio: `${PICTURE_BAND_RATIO}` }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- one frame
                inside a dialog, and the source is a public path or an R2 url
                interchangeably; next/image is the metered optimiser the media
                work spent a campaign getting off. */}
            <img
              src={src}
              alt=""
              draggable={false}
              className="h-full w-full object-cover"
              style={{ objectPosition: `50% ${Math.round(aim * 100)}%` }}
            />
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground">
            The narrowest crop this picture gets. Wider screens show more of it, and a phone
            trims the sides.
          </p>
        </div>

        {/* The pool. Drawn at the list card's shape, because that is where the
            photograph is seen as a photograph rather than as a band. */}
        {/* Two up on a phone, three on a laptop. Three at 390 draws each
            photograph 103x41, which is a colour swatch rather than a picture.
            Two up gives 155x62 and the extra row costs 112px in a dialog that
            had 371 to spare. */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {options.map((option) => {
            const selected = option.src === src;
            return (
              <button
                key={option.src}
                type="button"
                aria-pressed={selected}
                onClick={() => {
                  setSrc(option.src);
                  setAim(verticalOf(option.focus));
                }}
                className={cn(
                  "relative overflow-hidden rounded-[calc(var(--radius)-2px)] transition-[box-shadow,transform] duration-150 active:scale-[0.98]",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                  selected
                    ? "shadow-[0_0_0_2px_var(--color-canopy)]"
                    : "opacity-80 hover:opacity-100"
                )}
                style={{ aspectRatio: "5 / 2" }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- see above */}
                <img
                  src={option.src}
                  alt=""
                  className="h-full w-full object-cover"
                  style={{ objectPosition: option.focus }}
                />
              </button>
            );
          })}
        </div>

        <div>
          <input
            ref={file}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(e) => void pickFile(e.target.files?.[0])}
          />
          <Button
            type="button"
            variant="outline"
            className="w-full justify-center"
            disabled={uploading || saving}
            onClick={() => file.current?.click()}
          >
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <ImageUp className="h-4 w-4" />
                Use your own
              </>
            )}
          </Button>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={saving || uploading}
            /* Back to the picture this Catch-up actually has, not to the first
               of the pool: that is the state it arrived in, and a reset that
               lands somewhere it has never been is not a reset. */
            onClick={() => {
              setSrc(picture.src);
              setAim(verticalOf(picture.focus));
            }}
          >
            Put it back
          </Button>
          <Button type="button" variant="primary" disabled={saving || uploading} onClick={save}>
            {saving ? "Saving..." : "Use this"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
