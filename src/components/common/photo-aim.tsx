"use client";

/* ------------------------------------------------------------------ *
 *  Choosing what stays in frame.
 *
 *  Spec §9, and it is marked NOT OPTIONAL there for a reason that is
 *  about trust rather than convenience. Every crop in this app is aimed
 *  automatically from sharp's `attention` (§1, D9), and X shipped exactly
 *  that idea at far greater scale, measured real racial and gender bias
 *  in it, and withdrew it: *"not everything on Twitter is a good
 *  candidate for an algorithm, and in this case, how to crop an image is
 *  a decision best made by people."* Their replacement was to show the
 *  person the crop and let them move it. This is that.
 *
 *  It is also the honest half of a measurement we already have. Of the
 *  first 41 photographs measured, 14 had a focal point within 3% of an
 *  edge and only 13 fell inside the band the tall rule uses -- the
 *  clamp, not the guess, is doing most of the work (handover F15). A
 *  guess that wrong needs an override, and a person using the override
 *  is not braked by the clamp: `focalSet` turns it off for that image.
 *
 *  TWO THINGS MAKE THIS TRUTHFUL RATHER THAN DECORATIVE, and both are
 *  worth keeping if it is ever rebuilt.
 *
 *  The frame is the REAL one. Not a square, not a generic 16:9 -- the
 *  box is whatever `framePhoto` will give this photograph in a card,
 *  drawn from that function's own output, so the two cannot drift. What
 *  you drag is what the feed shows.
 *
 *  The control only exists where something is actually being cut. A
 *  photograph that keeps its whole frame has no window to move, and
 *  offering a handle for it would teach people that the app crops
 *  everything, which it does not.
 * ------------------------------------------------------------------ */

import { useCallback, useEffect, useRef, useState } from "react";
import { Crop } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { framePhoto, type PhotoFacts } from "@/lib/photo-layout";
import { aimImage } from "@/app/(main)/image-aim";
import { cn } from "@/lib/utils";

/** One press of an arrow key, as a share of the whole frame. Small enough to
 *  place a face, large enough that holding the key is not a career. */
const KEY_STEP = 0.02;

/** Whole percent, which is all `object-position` is ever given.
 *
 *  Not tidiness. The window is drawn from a rounded percentage and stored as
 *  whatever number the drag produced, so without this the two disagree: a
 *  drag that showed 53% stored 0.5747, and the card then drew 57% -- a frame
 *  three per cent from the one the person had just approved. A handle whose
 *  whole promise is "this is what everyone sees" cannot round differently
 *  from what it saves. */
const quantise = (v: number) => Math.round(Math.min(1, Math.max(0, v)) * 100) / 100;

/** Where the card is drawing this photograph's window right now.
 *
 *  Read out of `framePhoto`'s own answer rather than from `focalY`, because
 *  those are different numbers whenever the crop has not been aimed by hand:
 *  the raw guess is stored unclamped and the renderer brakes it into its band.
 *  The dialog opens on what the card SHOWS, or its first frame would be a
 *  photograph nobody has ever seen. */
function shownAim(facts: PhotoFacts): number {
  const m = framePhoto(facts).objectPosition.match(/(\d+)%\s*$/);
  return m ? Number(m[1]) / 100 : 0.5;
}

/** The frame `framePhoto` describes, as numbers a browser can draw.
 *
 *  The box's ratio is PARSED from the CSS string rather than recomputed,
 *  which is the whole reason this cannot drift from what a card renders:
 *  there is one rule, in one file, and this reads its answer. */
function stageOf(facts: PhotoFacts) {
  const frame = framePhoto(facts);
  const [a, b] = frame.aspectRatio.split("/").map((n) => Number(n.trim()));
  const boxRatio = a / b;
  const width = frame.maxWidth;
  // `aspect-ratio` asks for this height and `max-height` clamps it, exactly as
  // the CSS does. Rounded, because a fractional box shows the card's own
  // background as a hairline down the edge (brief #55).
  const height = Math.round(Math.min(width / boxRatio, frame.maxHeight));
  return { frame, width, height };
}

/**
 * The button, and the dialog behind it. Renders nothing at all when the
 * photograph is not being cut.
 *
 * `facts` is optional and the component measures the file itself when it is
 * absent, because the two callers know different amounts: a fresh upload
 * carries the server's measurements back in the response, and a RESUMED draft
 * holds nothing but URLs. Measuring costs nothing -- the browser has the bytes
 * already, since it is showing them in the preview beside this.
 */
export function PhotoAimButton({
  src,
  facts,
  className,
}: {
  /** The stored URL. What the aim is written against, and what is measured. */
  src: string;
  /** What the server measured at upload, when the caller has it. */
  facts?: PhotoFacts;
  className?: string;
}) {
  const [shape, setShape] = useState<{ width: number; height: number } | null>(
    facts ? { width: facts.width, height: facts.height } : null
  );
  const [open, setOpen] = useState(false);

  /* Measured from the file when the caller had no facts. A blob: preview and
     the stored URL are the same photograph, so either would do; `src` is used
     because it is what the aim will be written against, and measuring the
     thing you are about to describe is the version that cannot be wrong. */
  useEffect(() => {
    if (shape) return;
    let gone = false;
    const img = new Image();
    img.onload = () => {
      if (!gone) setShape({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.src = src;
    return () => {
      gone = true;
    };
  }, [src, shape]);

  if (!shape) return null;
  const known: PhotoFacts = {
    width: shape.width,
    height: shape.height,
    focalX: facts?.focalX ?? 0.5,
    focalY: facts?.focalY ?? 0.5,
    focalSet: facts?.focalSet,
  };
  // Nothing is being cut, so there is no window to move and no control to show.
  if (framePhoto(known).kept >= 1) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Choose what stays in frame"
        title="Choose what stays in frame"
        /* Always there, never on hover. A control for taking charge of
           something has to be visible before you know you want it -- the same
           lesson the contribute room's remove button cost us. */
        className={cn(
          "grid place-items-center rounded-full bg-foreground/60 text-background backdrop-blur-sm",
          "transition-[filter,transform] duration-150 hover:brightness-150 active:scale-95",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
          className
        )}
      >
        <Crop className="h-3 w-3" strokeWidth={2} />
      </button>
      <AimDialog open={open} onOpenChange={setOpen} src={src} facts={known} />
    </>
  );
}

function AimDialog({
  open,
  onOpenChange,
  src,
  facts,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  src: string;
  facts: PhotoFacts;
}) {
  const { width, height } = stageOf(facts);
  const start = shownAim(facts);
  const [aim, setAim] = useState(start);
  const [saving, setSaving] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  /* Where the window may travel, in the pixels actually on screen. The photo
     is drawn to the box's WIDTH (it is always the narrower shape here -- see
     the module comment: after D19 every cut in this app is vertical), so its
     drawn height is boxWidth / ratio and the overflow is what hangs off. */
  const overflow = useCallback(() => {
    const el = box.current;
    if (!el) return 0;
    const w = el.clientWidth;
    return Math.max(1, w / (facts.width / facts.height) - w * (height / width));
  }, [facts.width, facts.height, height, width]);

  /* Pointer events rather than a drag library: this is one axis and one
     number, and the value has to follow the finger exactly for the frame to
     be believable. Capture, so a fast drag that leaves the box keeps going. */
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

  async function save() {
    setSaving(true);
    // Failure is not worth a toast here: the aim is a refinement of a crop
    // that is already reasonable, the photograph is unaffected, and the
    // composer is mid-flight. It is logged where a developer will see it.
    const res = await aimImage(src, aim);
    if (res.error) console.error("[photo-aim]", res.error);
    setSaving(false);
    onOpenChange(false);
  }


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>What stays in frame</DialogTitle>
          {/* No percentage. It used to end "...and 62% of it fits", which is a
              number about the machine rather than about the photograph: the
              frame beneath already SHOWS what fits, and the fraction only
              invited a reader to chase it upward. Owner, 2026-08-28. */}
          <DialogDescription>
            Drag the photograph up or down. This is the shape it takes in a post.
          </DialogDescription>
        </DialogHeader>

        {/* The real frame, at the real proportions, capped at the width it
            would be drawn and free to shrink on a phone. */}
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
          className="mx-auto w-full cursor-grab touch-none select-none overflow-hidden rounded-[var(--radius)] bg-mist active:cursor-grabbing focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          style={{
            aspectRatio: `${width} / ${height}`,
            /* Two caps, and BOTH are widths.
               The first is the width a card would draw it at, which is what
               makes "this is the shape it takes in a post" a true sentence
               rather than a claim about a preview.
               The second is the window: the tallest frame this rule produces
               is 500px and the dialog around it wants another ~180 for its
               title and its buttons, so on a 700px-tall laptop window "Use
               this" fell off the bottom of the screen -- the one control the
               dialog exists to reach.
               Expressed as a width because a `max-height` clamps the box
               without narrowing it, which leaves `aspect-ratio` overruled and
               the frame drawn 375x468 for a shape that is 3:4. A frame that
               lies about the shape is worse than a frame that scrolls. */
            maxWidth: `min(${width}px, calc(52dvh * ${(width / height).toFixed(4)}))`,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- an R2 url
              drawn once inside a dialog; next/image is the metered optimiser
              this campaign spent §4 getting off (handover F1, F19). */}
          <img
            src={src}
            alt=""
            draggable={false}
            className="h-full w-full object-cover"
            /* The same two properties a card sets, so this frame and that one
               cannot disagree about anything. */
            style={{ objectPosition: `50% ${Math.round(aim * 100)}%` }}
          />
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={saving}
            /* Back to where the card was drawing it, not to the centre: that
               is the state this photograph arrived in, and a reset that lands
               somewhere it has never been is not a reset. */
            onClick={() => setAim(start)}
          >
            Put it back
          </Button>
          <Button type="button" variant="primary" disabled={saving} onClick={save}>
            {saving ? "Saving..." : "Use this"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
