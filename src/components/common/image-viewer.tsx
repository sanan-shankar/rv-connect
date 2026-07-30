"use client";

/* ------------------------------------------------------------------ *
 *  ImageViewer - the one full-screen image experience, shared by the
 *  feed's post photos, a letter's photo stack, and the Valley
 *  Collection.
 *
 *  The shape of it: the photo owns the screen on a warm near-black
 *  wash. Moving forward or back advances the film one frame: the
 *  incoming photo drifts in from the side you are heading toward while
 *  the outgoing one slips the opposite way and fades out faster than
 *  the newcomer fades in (so the cross never dips to a see-through
 *  midpoint). No scale anywhere in the step -- equal-size frames read
 *  as one photograph replacing another; any size mismatch reads as a
 *  zoom-and-settle, which is the exact bounce the owner rejected
 *  (2026-07-30). The two neighbouring images are pre-decoded the
 *  moment a frame settles, off the main path, so the step never waits
 *  on the network.
 *
 *  Chrome stays out of the photo's way: a counter and the actions sit
 *  in slim bars top and bottom, and a tap on the photo puts them away
 *  entirely. The caption, when there is one, stays folded: pressing
 *  the caption affordance turns the bottom of the screen up into a
 *  panel with the words on it.
 *
 *  Input map: arrow keys step, Esc closes, the backdrop closes, a
 *  horizontal drag on the photo steps (mobile's whole navigation), and
 *  every control is a real focusable button.
 * ------------------------------------------------------------------ */

import { useCallback, useEffect, useRef, useState } from "react";
import { AlignLeft, ArrowUpRight, ChevronLeft, ChevronRight, Download, X } from "lucide-react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { BirdAvatar, type AvatarUser } from "@/components/common/bird-avatar";
import { SPRINGS, EASE_OUT_SMOOTH, EASE_IN_OUT_SCENE } from "@/components/common/motion";
import { cn, metaLine } from "@/lib/utils";

export interface ViewerImage {
  src: string;
  alt?: string;
  /** Shown in the fold-up caption panel. */
  caption?: string | null;
  /** Who posted it; drawn as a bird chip in the bottom bar. */
  author?: (AvatarUser & { name: string }) | null;
  /** Pre-formatted display date, e.g. "22 May 2026". */
  date?: string | null;
  /** Optional permalink ("open its page"), e.g. a Collection photo's route. */
  href?: string | null;
  /** Filename for the download action; defaults to the src's basename. */
  downloadName?: string;
}

const BACKDROP = "rgba(24, 25, 20, 0.94)"; // warm ink, never pure black

/* The step: one frame of film advancing. The incoming photo drifts in from
 * the side you are heading toward (+x when stepping forward) and the
 * outgoing one slips the opposite way, so forward and back read
 * differently and a step between two similar valley photographs still
 * visibly HAPPENS. Distances are a whisper (28px in, 18px out, on a
 * viewport-scale move) because the drift is a cue, not a slide. The x legs
 * ride EASE_IN_OUT_SCENE -- the documented curve for viewport-scale travel
 * (DESIGN-SYSTEM sec. 7); an out-only curve here reads as a lurch. The
 * opacity legs are asymmetric on purpose: 140ms out vs 200ms in keeps the
 * cross from dipping to a half-transparent midpoint where the backdrop
 * shows through both frames. No scale anywhere -- see the header comment. */
const STEP_X_IN = 28;
const STEP_X_OUT = 18;
const FRAME_VARIANTS = {
  enter: (dir: 1 | -1) => ({ x: dir * STEP_X_IN, opacity: 0 }),
  center: {
    x: 0,
    opacity: 1,
    transition: {
      x: { duration: 0.26, ease: EASE_IN_OUT_SCENE },
      opacity: { duration: 0.2, ease: EASE_OUT_SMOOTH },
    },
  },
  exit: (dir: 1 | -1) => ({
    x: dir * -STEP_X_OUT,
    opacity: 0,
    transition: {
      x: { duration: 0.26, ease: EASE_IN_OUT_SCENE },
      opacity: { duration: 0.14, ease: EASE_OUT_SMOOTH },
    },
  }),
};

function basename(src: string): string {
  try {
    const clean = src.split("?")[0];
    return clean.slice(clean.lastIndexOf("/") + 1) || "photo";
  } catch {
    return "photo";
  }
}

export function ImageViewer({
  images,
  initialIndex = 0,
  open,
  onClose,
}: {
  images: ViewerImage[];
  initialIndex?: number;
  open: boolean;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(initialIndex);
  const [chromeHidden, setChromeHidden] = useState(false);
  const [captionOpen, setCaptionOpen] = useState(false);
  /* Which way the last step went; feeds the frame variants (via `custom`)
     so the drift matches the direction of travel. */
  const [stepDir, setStepDir] = useState<1 | -1>(1);
  const stageRef = useRef<HTMLDivElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  const count = images.length;
  const current = images[Math.min(Math.max(index, 0), Math.max(count - 1, 0))];

  const step = useCallback(
    (dir: 1 | -1) => {
      setIndex((i) => {
        const next = i + dir;
        if (next < 0 || next >= count) return i;
        return next;
      });
      setStepDir(dir);
      setCaptionOpen(false);
    },
    [count]
  );

  /* Fresh session each open: land on the pressed image, chrome shown.
     Adjusted during render (React's sanctioned adjust-state-on-prop-change
     pattern) rather than in an effect, so there is no flash of stale state. */
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setIndex(initialIndex);
      setChromeHidden(false);
      setCaptionOpen(false);
    }
  }

  /* Scroll lock + focus containment while open. */
  useEffect(() => {
    if (!open) return;
    restoreFocusRef.current = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    stageRef.current?.focus();
    return () => {
      document.body.style.overflow = prevOverflow;
      restoreFocusRef.current?.focus?.();
    };
  }, [open]);

  /* Keyboard: arrows step, Esc closes. */
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") step(1);
      else if (e.key === "ArrowLeft") step(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, step]);

  /* Pre-decode the neighbours as soon as a frame settles, so stepping
     never waits. decode() failures are irrelevant here (the real <img>
     will surface them); this is purely a cache warmer. */
  useEffect(() => {
    if (!open) return;
    for (const n of [index + 1, index - 1]) {
      const neighbour = images[n];
      if (!neighbour) continue;
      const img = new window.Image();
      img.src = neighbour.src;
      img.decode?.().catch(() => {});
    }
  }, [open, index, images]);

  async function download() {
    if (!current) return;
    const name = current.downloadName ?? basename(current.src);
    try {
      const res = await fetch(current.src);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      window.open(current.src, "_blank", "noopener,noreferrer");
    }
  }

  const hasCaption = Boolean(current?.caption?.trim());
  const chromeClass = cn(
    "absolute inset-x-0 z-10 flex items-center gap-2 px-4 py-3 sm:px-6 sm:py-4 transition-opacity duration-200",
    chromeHidden ? "pointer-events-none opacity-0" : "opacity-100"
  );

  /* AnimatePresence stays mounted across open/close so the closing fade
     actually plays; only the dialog inside it comes and goes. */
  return (
    <AnimatePresence>
      {open && current && (
      <motion.div
        key="viewer"
        role="dialog"
        aria-modal="true"
        aria-label={current.alt || current.caption || "Photo viewer"}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.22, ease: EASE_OUT_SMOOTH }}
        className="fixed inset-0 z-[var(--z-overlay)] flex flex-col"
        style={{ background: BACKDROP, backdropFilter: "blur(6px)" }}
        onClick={onClose}
      >
        {/* TOP BAR: counter left, actions right. */}
        <div className={cn(chromeClass, "top-0")} onClick={(e) => e.stopPropagation()}>
          {count > 1 && (
            <span className="rounded-full bg-white/10 px-3 py-1 text-[12.5px] font-semibold tabular-nums text-white/90">
              {index + 1} of {count}
            </span>
          )}
          <div className="ml-auto flex items-center gap-1.5">
            {current.href && (
              <Link
                href={current.href}
                aria-label="Open this photo's page"
                className="flex h-10 w-10 items-center justify-center rounded-full text-white/80 transition-colors duration-150 hover:bg-white/12 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 active:scale-95"
              >
                <ArrowUpRight className="h-[18px] w-[18px]" />
              </Link>
            )}
            <button
              type="button"
              onClick={download}
              aria-label="Download photo"
              className="flex h-10 w-10 items-center justify-center rounded-full text-white/80 transition-colors duration-150 hover:bg-white/12 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 active:scale-95"
            >
              <Download className="h-[18px] w-[18px]" />
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close viewer"
              className="flex h-10 w-10 items-center justify-center rounded-full text-white/80 transition-colors duration-150 hover:bg-white/12 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 active:scale-95"
            >
              <X className="h-[18px] w-[18px]" />
            </button>
          </div>
        </div>

        {/* STAGE. The step animation lives on the keyed frame (FRAME_VARIANTS,
            top of file); sync mode keeps both frames mounted through the cross.
            The swipe gesture lives on a stable wrapper, not the keyed frame:
            drag and an animated `x` on the same node fight over one
            MotionValue, and a keyed frame that exits mid-swipe would carry its
            drag offset and momentum snap-back into the exit -- the second,
            mobile-only bounce the owner reported. Here the wrapper rubber-bands
            under the finger and springs home while the frames inside advance
            independently. The desktop arrows sit outside the wrapper so they
            never move with a drag. */}
        <div
          ref={stageRef}
          tabIndex={-1}
          className="relative flex-1 outline-none"
          onClick={(e) => e.stopPropagation()}
        >
          <motion.div
            className="absolute inset-0"
            drag={count > 1 ? "x" : false}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.14}
            onDragEnd={(_, info) => {
              if (info.offset.x < -70 || info.velocity.x < -420) step(1);
              else if (info.offset.x > 70 || info.velocity.x > 420) step(-1);
            }}
          >
            <AnimatePresence mode="sync" initial={false} custom={stepDir}>
              <motion.div
                key={index}
                custom={stepDir}
                variants={FRAME_VARIANTS}
                initial="enter"
                animate="center"
                exit="exit"
                className="absolute inset-0 flex items-center justify-center p-4 pb-16 pt-16 sm:p-14"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={current.src}
                  alt={current.alt ?? current.caption ?? ""}
                  draggable={false}
                  onClick={() => setChromeHidden((h) => !h)}
                  className="max-h-full max-w-full select-none rounded-[var(--radius-sm)] object-contain"
                  style={{ boxShadow: "0 24px 80px -24px rgba(0,0,0,0.8)" }}
                />
              </motion.div>
            </AnimatePresence>
          </motion.div>

          {/* Desktop step arrows; mobile navigates by dragging the photo. */}
          {index > 0 && (
            <button
              type="button"
              onClick={() => step(-1)}
              aria-label="Previous photo"
              className={cn(
                "absolute left-4 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white/85 transition-[background-color,opacity] duration-150 hover:bg-white/20 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 active:scale-95 sm:flex",
                chromeHidden && "pointer-events-none opacity-0"
              )}
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          )}
          {index < count - 1 && (
            <button
              type="button"
              onClick={() => step(1)}
              aria-label="Next photo"
              className={cn(
                "absolute right-4 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white/85 transition-[background-color,opacity] duration-150 hover:bg-white/20 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 active:scale-95 sm:flex",
                chromeHidden && "pointer-events-none opacity-0"
              )}
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* BOTTOM BAR: who posted it; the caption affordance on the right. */}
        <div
          className={cn(chromeClass, "bottom-0")}
          style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}
          onClick={(e) => e.stopPropagation()}
        >
          {current.author && (
            <span className="flex min-w-0 items-center gap-2.5">
              <BirdAvatar user={current.author} size={30} />
              <span className="min-w-0 leading-tight">
                <span className="block truncate text-[13px] font-semibold text-white">
                  {current.author.name}
                </span>
                {current.date && (
                  <span className="block text-[11.5px] text-white/65">{current.date}</span>
                )}
              </span>
            </span>
          )}
          {hasCaption && (
            <button
              type="button"
              onClick={() => setCaptionOpen((c) => !c)}
              aria-expanded={captionOpen}
              className={cn(
                "ml-auto flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[12.5px] font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 active:scale-95",
                captionOpen
                  ? "bg-white/90 text-ink"
                  : "bg-white/10 text-white/85 hover:bg-white/20 hover:text-white"
              )}
            >
              <AlignLeft className="h-[15px] w-[15px]" />
              Caption
            </button>
          )}
        </div>

        {/* THE FOLD: the bottom of the screen turns up into the caption. */}
        <AnimatePresence>
          {captionOpen && hasCaption && (
            <motion.div
              key="caption"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={SPRINGS.gentle}
              className="absolute inset-x-0 bottom-0 z-20"
              onClick={(e) => e.stopPropagation()}
            >
              <div
                className="mx-auto max-w-2xl rounded-t-[var(--radius-xl)] border-t border-white/12 bg-[rgba(30,31,25,0.97)] px-6 pt-5 sm:px-8"
                style={{ paddingBottom: "max(20px, env(safe-area-inset-bottom))" }}
              >
                <button
                  type="button"
                  onClick={() => setCaptionOpen(false)}
                  aria-label="Close caption"
                  className="mx-auto mb-3 block h-1.5 w-10 rounded-full bg-white/25 transition-colors duration-150 hover:bg-white/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                />
                <p className="text-[15px] leading-[1.65] text-white/92">{current.caption}</p>
                {(current.author || current.date) && (
                  <p className="mt-3 text-[12.5px] text-white/55">
                    {metaLine(current.author?.name, current.date)}
                  </p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
      )}
    </AnimatePresence>
  );
}
