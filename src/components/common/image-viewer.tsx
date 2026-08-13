"use client";

/* ------------------------------------------------------------------ *
 *  ImageViewer - the one full-screen image experience, shared by the
 *  feed's post photos, a letter's photo stack, and the Valley
 *  Collection.
 *
 *  The shape of it: the photo owns the screen on a warm near-black
 *  wash. Moving forward or back cross-dissolves one frame into the
 *  next. No x drift, no scale, no spring anywhere in the step (owner,
 *  2026-08-03: "don't do that slide transition ... just have a simple
 *  delightful cross dissolve with[out] any bouncing or other jarring
 *  motion"). The two neighbouring images are pre-decoded the moment a
 *  frame settles, off the main path, so the step never waits on the
 *  network.
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
import { SPRINGS, EASE_OUT_SMOOTH } from "@/components/common/motion";
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

/* The step: a straight cross dissolve, opacity and nothing else.
 *
 * The two legs are deliberately opposite curves, and that pairing is the
 * whole trick. Both frames are mounted at once (AnimatePresence mode="sync")
 * over BACKDROP, so what the eye actually sees of the backdrop through the
 * cross is (1 - outgoing) * (1 - incoming). Run both legs linear and that
 * product peaks at 0.25 halfway: a visible quarter-strength flash of empty
 * backdrop between two photographs. The previous version was worse than
 * linear, because it faded the OUTGOING frame faster than the incoming one
 * (140ms against 200ms) while its comment claimed the opposite.
 *
 * So: the incoming frame rises on EASE_OUT_SMOOTH (fast off the mark, ~0.85
 * opaque by the midpoint) and the outgoing one falls on "easeIn" (holds near
 * full early, ~0.88 at the midpoint). Their product at the midpoint is about
 * 0.02, so the backdrop never meaningfully shows and the dissolve reads as
 * one photograph becoming another. Equal 220ms durations keep it symmetric,
 * so forward and back feel identical.
 *
 * "easeIn" is passed as Motion's named curve rather than a hand-typed
 * cubic-bezier (banned: DESIGN-SYSTEM sec. 7, and eslint.config.mjs warns).
 * motion.tsx has no ease-IN twin to import; if one is ever added, use it. */
const STEP_SECONDS = 0.22;
const FRAME_VARIANTS = {
  enter: { opacity: 0 },
  center: {
    opacity: 1,
    transition: { duration: STEP_SECONDS, ease: EASE_OUT_SMOOTH },
  },
  exit: {
    opacity: 0,
    transition: { duration: STEP_SECONDS, ease: "easeIn" as const },
  },
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
  /* Every control below hovers with a white wash (white/12 -> white/20), NOT the
     app's shared `state-layer`. That is deliberate and should stay: the state
     layer paints an INK tint, which is correct on every warm surface in the app
     and useless here, because this chrome floats on BACKDROP (rgba(24,25,20,.94))
     where a darker tint has nothing left to darken. This is the one region whose
     surface does not follow the theme, so it is the one region with its own
     hover. */
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
                className="flex h-10 w-10 items-center justify-center rounded-full text-white/80 transition-colors duration-150 hover:bg-white/12 hover:text-white active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                <ArrowUpRight className="h-[18px] w-[18px]" />
              </Link>
            )}
            <button
              type="button"
              onClick={download}
              aria-label="Download photo"
              className="flex h-10 w-10 items-center justify-center rounded-full text-white/80 transition-colors duration-150 hover:bg-white/12 hover:text-white active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              <Download className="h-[18px] w-[18px]" />
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close viewer"
              className="flex h-10 w-10 items-center justify-center rounded-full text-white/80 transition-colors duration-150 hover:bg-white/12 hover:text-white active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              <X className="h-[18px] w-[18px]" />
            </button>
          </div>
        </div>

        {/* STAGE. The step animation lives on the keyed frame (FRAME_VARIANTS,
            top of file); sync mode keeps both frames mounted through the cross,
            which is what makes it a true dissolve rather than a hard cut.
            The swipe gesture lives on a stable wrapper, not the keyed frame: a
            keyed frame that exits mid-swipe would carry its drag offset into
            the exit, which is the mobile-only bounce the owner reported. Here
            the wrapper follows the finger and returns to rest while the frames
            inside dissolve independently. The desktop arrows sit outside the
            wrapper so they never move with a drag. */}
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
            /* Release returns to rest with NO overshoot. Motion's default
               drag-release spring rebounds past 0 and back, which is exactly
               the "bouncing" the owner rejected; damping this high is
               critically damped, so the photo settles and stops. */
            dragTransition={{ bounceStiffness: 600, bounceDamping: 60 }}
            onDragEnd={(_, info) => {
              if (info.offset.x < -70 || info.velocity.x < -420) step(1);
              else if (info.offset.x > 70 || info.velocity.x > 420) step(-1);
            }}
          >
            <AnimatePresence mode="sync" initial={false}>
              <motion.div
                key={index}
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
                "absolute left-4 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white/85 transition-[background-color,opacity] duration-150 hover:bg-white/20 hover:text-white active:scale-95 sm:flex focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white",
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
                "absolute right-4 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white/85 transition-[background-color,opacity] duration-150 hover:bg-white/20 hover:text-white active:scale-95 sm:flex focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white",
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
          {current.author &&
            // The byline walks to the author's profile when we know who they
            // are (id is optional on AvatarUser); navigating naturally closes
            // the viewer with the page. One link here covers feed photos,
            // letter plates and the Collection at once.
            (current.author.id ? (
              <Link
                href={`/profile/${current.author.id}`}
                className="flex min-w-0 items-center gap-2.5 rounded-full transition-opacity duration-150 hover:opacity-80 active:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70"
              >
                <BirdAvatar user={current.author} size={30} />
                <span className="min-w-0 leading-tight">
                  <span className="block truncate text-[13px] font-semibold text-white">
                    {current.author.name}
                  </span>
                  {current.date && (
                    <span className="block text-[11.5px] text-white/65">{current.date}</span>
                  )}
                </span>
              </Link>
            ) : (
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
            ))}
          {hasCaption && (
            <button
              type="button"
              onClick={() => setCaptionOpen((c) => !c)}
              aria-expanded={captionOpen}
              className={cn(
                "ml-auto flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[12.5px] font-semibold transition-colors duration-150 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white",
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
                  className="mx-auto mb-3 block h-1.5 w-10 rounded-full bg-white/25 transition-colors duration-150 hover:bg-white/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
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
