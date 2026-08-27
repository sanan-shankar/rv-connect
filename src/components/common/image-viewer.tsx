"use client";

/* ------------------------------------------------------------------ *
 *  ImageViewer - the one full-screen image experience, shared by the
 *  feed's post photos, a letter's photo stack, and the Valley
 *  Collection.
 *
 *  Rebuilt 2026-08-28 (collection rework, spec sec. 5). What the owner
 *  said about the version before this one, looking at his own
 *  photographs:
 *
 *    "I really wanted the image to go from edge to edge... I know that
 *     people have figured a way to get it more full screen and more
 *     whatever ratio of photo to white space than we do."
 *
 *    "You click caption. And then in this extremely low frame rate, you
 *     get this bottom bar pop up and there is no way to make it
 *     disappear except click a very exact small pill to get it to go.
 *     It's so, so hard to use... It's like the worst design ever."
 *
 *  So three things changed and each answers one of those.
 *
 *  1. THE PHOTOGRAPH TOUCHES THE EDGES. There is no inset and no
 *     letterbox: the frame is the whole viewport and the photograph is
 *     fitted into it, so a landscape reaches the left and right edges
 *     and a portrait reaches the top and bottom. The chrome FLOATS over
 *     it on gradient scrims rather than reserving bands beside it. The
 *     old `sm:p-14` plus its two 64px bands kept a 1600x1067 photograph
 *     to 1258x839 on a 1440x900 screen, 81% of the glass; the same
 *     photograph is now 1350x900, and after a moment of stillness there
 *     is nothing on screen at all but the picture.
 *
 *     What it will NOT do is enlarge a photograph past its own file.
 *     That is the one thing the owner has objected to twice ("when the
 *     images are themselves not the highest resolution... we get
 *     extremely grainy things"), and a 980px panorama blown across a
 *     1440px screen is that complaint arriving in the one place a
 *     photograph is meant to be at its best. A small file sits at its
 *     true size on the wash, sharp. The answer to a photograph that
 *     cannot fill a big screen is a bigger derivative, which is spec
 *     sec. 4, not a bigger box.
 *  2. THE CAPTION IS ALWAYS THERE AND IS NEVER A PANEL. Two lines over
 *     the bottom scrim, at rest. Everything the deleted /collection/[id]
 *     page had that this did not -- the rest of a long caption, Where,
 *     the buckets -- is one press on the caption itself away, and the
 *     same press puts it back. The fold-up panel and its dismiss pill
 *     are gone entirely: there is no small exact target anywhere in
 *     this component.
 *  3. THE CHROME GETS OUT OF THE WAY BY ITSELF. It fades after 2.6s of
 *     stillness and returns on any movement; a press on the photograph
 *     dismisses it outright and a second press brings it back. Nothing
 *     is ever hidden while the caption is open or while a keyboard user
 *     is inside the chrome.
 *
 *  What did not change, because the owner settled it: moving between
 *  photographs is a straight cross dissolve, no x drift, no scale, no
 *  spring (2026-08-03: "don't do that slide transition ... just have a
 *  simple delightful cross dissolve with[out] any bouncing or other
 *  jarring motion"). The two neighbours are pre-decoded the moment a
 *  frame settles, so the step never waits on the network.
 *
 *  It renders through a portal on `document.body`, and that is not
 *  tidiness: a full-screen overlay nested in the page tree is only above
 *  what its own ancestors are, and the mobile header (`sticky z-40` in
 *  the sidebar) painted straight over the top of it -- the close button
 *  included. z-index cannot reach across a stacking context; leaving the
 *  tree can.
 *
 *  Input map: arrows step, Esc closes the caption if it is open and the
 *  viewer if it is not, a horizontal drag steps (mobile's whole
 *  navigation), Tab cycles inside the dialog, and every control is a
 *  real focusable button.
 * ------------------------------------------------------------------ */

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, Download, Trash2, X } from "lucide-react";
import Link from "next/link";
import { AnimatePresence, m } from "motion/react";
import { BirdAvatar, type AvatarUser } from "@/components/common/bird-avatar";
import { LoveButton } from "@/components/common/love-button";
import { ShareButton } from "@/components/common/share-button";
import { EASE_OUT_SMOOTH } from "@/components/common/motion";
import { cn } from "@/lib/utils";

export interface ViewerImage {
  src: string;
  alt?: string;
  /** The words under the photograph. Two lines at rest, all of it on a press. */
  caption?: string | null;
  /** Who posted it; drawn as a bird chip in the bottom row. */
  author?: (AvatarUser & { name: string }) | null;
  /** Pre-formatted date. For a Collection photograph this is when it was TAKEN
   *  ("May 1978", "the 1970s") and never when it was uploaded, which was the
   *  owner's complaint #21; where the contributor gave nothing, pass null and
   *  nothing is shown rather than a stand-in. */
  date?: string | null;
  /** Where in the school, as the contributor typed it. Shown with the rest. */
  where?: string | null;
  /** The buckets this photograph is filed under. Shown with the rest. */
  tags?: string[];
  /** A shareable address for this photograph, if it has one. */
  href?: string | null;
  /** Filename for the download action; defaults to the src's basename. */
  downloadName?: string;
  /** The love state, when the surface has one to give. */
  loved?: boolean;
  loveCount?: number;
  /** Whether this member may take this photograph down. The caller owns the
   *  confirmation and the action; this only draws the affordance. */
  canRemove?: boolean;
  removeLabel?: string;
}

const BACKDROP = "rgba(24, 25, 20, 0.94)"; // warm ink, never pure black

/* The scrims. Warm ink rather than black, the same colour the backdrop is, so
   the chrome reads as one material with the room it sits in.

   The bottom one is the one that has to work: it carries white text over
   whatever the photograph happens to be, and the first cut ramped to nothing
   too early, which left the caption sitting on sunlit grass. It now holds most
   of its weight through the band the words actually occupy and only lets go
   above them. The top one has three icons to keep legible and nothing else. */
const TOP_SCRIM = "linear-gradient(to bottom, rgba(20,21,17,0.66), rgba(20,21,17,0))";
const BOTTOM_SCRIM =
  "linear-gradient(to top, rgba(20,21,17,0.9) 0%, rgba(20,21,17,0.78) 34%, rgba(20,21,17,0.42) 66%, rgba(20,21,17,0) 100%)";

/** How long the chrome waits for stillness before it withdraws. Long enough
 *  to read a caption and to find the close button on a phone, where no mouse
 *  ever moves to bring it back and a press on the photograph is the only way
 *  in. Short enough that looking at the picture clears it. */
const IDLE_MS = 3600;

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

/** Every icon button in the chrome. The wash is white (white/12 to white/20),
 *  NOT the app's shared `state-layer`, and that is deliberate: the state layer
 *  paints an INK tint, which is right on every warm surface in the app and
 *  useless here, because this chrome floats on a near-black wash where a
 *  darker tint has nothing left to darken. This is the one region whose
 *  surface does not follow the theme, so it is the one region with its own
 *  hover. */
const ICON_BUTTON =
  "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white/80 transition-colors duration-150 hover:bg-white/12 hover:text-white active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white";

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
  showCount = true,
  onToggleLove,
  onRemove,
}: {
  images: ViewerImage[];
  initialIndex?: number;
  open: boolean;
  onClose: () => void;
  /** "3 of 12" is a real fact about a post and a meaningless one about an
   *  archive of twenty thousand photographs, so the Collection turns it off
   *  (owner: "I don't know if showing that two of two thing is important, at
   *  least in collection"). */
  showCount?: boolean;
  onToggleLove?: (index: number) => void;
  onRemove?: (index: number) => void;
}) {
  const [index, setIndex] = useState(initialIndex);
  /* "shown" is the resting state; "idle" is the chrome having withdrawn on its
     own, which any movement undoes; "off" is the member having put it away
     with a press, which only another press undoes. Keeping those two apart is
     what stops a mouse twitch instantly re-drawing chrome somebody just
     dismissed. */
  const [chrome, setChrome] = useState<"shown" | "idle" | "off">("shown");
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);
  /* Where the overlay is actually drawn. Null until mount, so the server and
     the first client render agree (this component is imported directly by
     /lab/viewer, which renders it on the server). */
  const [portal, setPortal] = useState<HTMLElement | null>(null);
  useEffect(() => setPortal(document.body), []);
  const stageRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const captionRef = useRef<HTMLParagraphElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const lastNudge = useRef(0);

  const count = images.length;
  const at = Math.min(Math.max(index, 0), Math.max(count - 1, 0));
  const current = images[at];

  const step = useCallback(
    (dir: 1 | -1) => {
      setIndex((i) => {
        const next = i + dir;
        if (next < 0 || next >= count) return i;
        return next;
      });
      setExpanded(false);
      setChrome("shown");
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
      setChrome("shown");
      setExpanded(false);
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

  /* Keyboard. Esc takes the topmost thing: the caption if it is open, the
     viewer otherwise -- so the words never trap somebody the way the old
     dismiss pill did. Tab wraps inside the dialog, because `aria-modal` is a
     promise that focus stays here, and without this the next Tab off the last
     control lands on the page behind the photograph. */
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (expanded) setExpanded(false);
        else onClose();
        return;
      }
      if (e.key === "ArrowRight") step(1);
      else if (e.key === "ArrowLeft") step(-1);
      else if (e.key === "Tab") {
        const root = dialogRef.current;
        if (!root) return;
        const focusable = root.querySelectorAll<HTMLElement>(
          'a[href],button:not([disabled]),[tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        const active = document.activeElement;
        if (e.shiftKey && (active === first || !root.contains(active))) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && (active === last || !root.contains(active))) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, step, expanded]);

  /* The chrome withdraws on stillness and comes back on movement. Movement is
     read through a ref and a single slow interval rather than state, because a
     pointermove handler that sets state runs at the rate of the mouse and
     would re-render this whole component a hundred times a second. The
     functional updater below bails out when the value has not changed, so a
     mouse moving over already-visible chrome costs nothing at all. */
  useEffect(() => {
    if (!open) return;
    const nudge = () => {
      lastNudge.current = performance.now();
      setChrome((c) => (c === "idle" ? "shown" : c));
    };
    window.addEventListener("pointermove", nudge, { passive: true });
    window.addEventListener("keydown", nudge);
    return () => {
      window.removeEventListener("pointermove", nudge);
      window.removeEventListener("keydown", nudge);
    };
  }, [open]);

  useEffect(() => {
    if (!open || chrome !== "shown" || expanded) return;
    lastNudge.current = performance.now();
    const id = setInterval(() => {
      /* Never while a control has focus: a keyboard user tabbing through the
         chrome is not idle, however still their mouse is. */
      const active = document.activeElement;
      if (active && active !== stageRef.current && dialogRef.current?.contains(active)) return;
      if (performance.now() - lastNudge.current >= IDLE_MS) setChrome("idle");
    }, 400);
    return () => clearInterval(id);
  }, [open, chrome, expanded]);

  /* Pre-decode the neighbours as soon as a frame settles, so stepping
     never waits. decode() failures are irrelevant here (the real <img>
     will surface them); this is purely a cache warmer. */
  useEffect(() => {
    if (!open) return;
    for (const n of [at + 1, at - 1]) {
      const neighbour = images[n];
      if (!neighbour) continue;
      const img = new window.Image();
      img.src = neighbour.src;
      img.decode?.().catch(() => {});
    }
  }, [open, at, images]);

  /* Does the caption run past its two lines? Measured rather than guessed
     from a character count, because the answer depends on the glyphs and on
     how wide the screen is. Layout effect, so "More" never flickers in.
     `portal` is in the dependencies and has to be: the first render returns
     null while it is still null, so this ran once against nothing and, with
     every other dependency already settled, never ran again -- a clamped
     caption with no way to open it, measured at 90px in a 45px box. */
  useLayoutEffect(() => {
    const el = captionRef.current;
    if (!el || expanded) return;
    setOverflows(el.scrollHeight - el.clientHeight > 1);
  }, [open, at, expanded, current?.caption, portal]);

  async function download() {
    if (!current) return;
    const name = current.downloadName ?? basename(current.src);
    try {
      const res = await fetch(current.src);
      /* A 404 or a 5xx RESOLVES, so without this the XML or HTML of the error
         was saved to disk under the photograph's own name and the member was
         told nothing went wrong (audit C-157). Throwing puts it into the catch
         below, which opens the URL in a tab -- where at least the browser
         says what happened. */
      if (!res.ok) throw new Error(String(res.status));
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

  const caption = current?.caption?.trim() ?? "";
  const tags = current?.tags?.filter(Boolean) ?? [];
  const where = current?.where?.trim() ?? "";
  /* There is more to read if the caption is cut off, or if this photograph
     carries anything the resting state has no room for. */
  const hasMore = overflows || Boolean(where) || tags.length > 0;
  const hidden = chrome !== "shown";

  const chromeClass = cn(
    "absolute inset-x-0 z-10 transition-opacity duration-200",
    hidden ? "pointer-events-none opacity-0" : "opacity-100"
  );

  /* Avatar, name, date: the same three whether or not the byline is a link. */
  const byline = current?.author && (
    <>
      <BirdAvatar user={current.author} size={30} />
      <span className="min-w-0 leading-tight">
        <span className="block truncate text-[13px] font-semibold text-white">
          {current.author.name}
        </span>
        {current.date && (
          <span className="block text-[11.5px] text-white/65">{current.date}</span>
        )}
      </span>
    </>
  );

  /* AnimatePresence stays mounted across open/close so the closing fade
     actually plays; only the dialog inside it comes and goes. */
  if (!portal) return null;
  return createPortal(
    <AnimatePresence>
      {open && current && (
        <m.div
          key="viewer"
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-label={current.alt || caption || "Photo viewer"}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22, ease: EASE_OUT_SMOOTH }}
          className="fixed inset-0 z-[var(--z-overlay)]"
          /* The blur is not decoration. At 94% the page behind still shows
             through at six per cent, which is enough to READ if it is text --
             the lab room's own heading ghosted through the top of the first
             screenshot of this rebuild. Blurred, six per cent is a wash. */
          style={{ background: BACKDROP, backdropFilter: "blur(6px)" }}
          onClick={onClose}
        >
          {/* THE STAGE. No padding anywhere: the photograph is fitted to the
              whole viewport, so it reaches two of the four edges whatever
              shape it is. The <img> keeps its own box (max-h/max-w rather
              than h-full/w-full with object-contain), which is what leaves
              the area beside a photograph as real backdrop -- a press there
              closes the viewer, exactly as it did before it went full bleed.

              The step animation lives on the keyed frame (FRAME_VARIANTS, top
              of file); sync mode keeps both frames mounted through the cross,
              which is what makes it a true dissolve rather than a hard cut.
              The swipe gesture lives on a stable wrapper, not the keyed frame:
              a keyed frame that exits mid-swipe would carry its drag offset
              into the exit, which is the mobile-only bounce the owner
              reported. The desktop arrows sit outside the wrapper so they
              never move with a drag. */}
          <div
            ref={stageRef}
            tabIndex={-1}
            className="absolute inset-0 outline-none"
            onClick={(e) => e.stopPropagation()}
          >
            <m.div
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
                <m.div
                  key={at}
                  variants={FRAME_VARIANTS}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  className="absolute inset-0 flex items-center justify-center"
                  onClick={onClose}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={current.src}
                    alt={current.alt ?? caption}
                    draggable={false}
                    onClick={(e) => {
                      e.stopPropagation();
                      setChrome((c) => (c === "shown" ? "off" : "shown"));
                      setExpanded(false);
                    }}
                    className="max-h-full max-w-full select-none object-contain"
                    /* The one thing drawn under the photograph. It does
                       nothing when the picture reaches the edges, which is
                       most of the time; when the file is too small to, it
                       stops it reading as something that failed to load. */
                    style={{ boxShadow: "0 24px 80px -28px rgba(0,0,0,0.75)" }}
                  />
                </m.div>
              </AnimatePresence>
            </m.div>

            {/* Desktop step arrows; mobile navigates by dragging the photo. */}
            {at > 0 && (
              <button
                type="button"
                onClick={() => step(-1)}
                aria-label="Previous photo"
                className={cn(
                  "absolute left-4 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white/85 transition-[background-color,opacity] duration-200 hover:bg-white/20 hover:text-white active:scale-95 sm:flex focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white",
                  hidden && "pointer-events-none opacity-0"
                )}
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
            )}
            {at < count - 1 && (
              <button
                type="button"
                onClick={() => step(1)}
                aria-label="Next photo"
                className={cn(
                  "absolute right-4 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white/85 transition-[background-color,opacity] duration-200 hover:bg-white/20 hover:text-white active:scale-95 sm:flex focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white",
                  hidden && "pointer-events-none opacity-0"
                )}
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            )}
          </div>

          {/* TOP: the counter, and the things you do to the file. */}
          <div className={cn(chromeClass, "top-0")} onClick={(e) => e.stopPropagation()}>
            <div
              className="pointer-events-none absolute inset-x-0 top-0 h-28"
              style={{ backgroundImage: TOP_SCRIM }}
            />
            <div className="relative flex items-center gap-2 px-3 py-3 sm:px-5 sm:py-4">
              {showCount && count > 1 && (
                <span className="rounded-full bg-white/10 px-3 py-1 text-[12.5px] font-semibold tabular-nums text-white/90">
                  {at + 1} of {count}
                </span>
              )}
              <div className="ml-auto flex items-center gap-1">
                {current.href && (
                  <ShareButton
                    href={current.href}
                    onDark
                    label="Copy a link to this photo"
                    className="h-10 w-10 justify-center px-0 py-0"
                  />
                )}
                <button type="button" onClick={download} aria-label="Download photo" className={ICON_BUTTON}>
                  <Download className="h-[18px] w-[18px]" />
                </button>
                {current.canRemove && onRemove && (
                  <button
                    type="button"
                    onClick={() => onRemove(at)}
                    aria-label={current.removeLabel ?? "Delete photo"}
                    className={cn(ICON_BUTTON, "hover:bg-heart/25 hover:text-white")}
                  >
                    <Trash2 className="h-[18px] w-[18px]" />
                  </button>
                )}
                <button type="button" onClick={onClose} aria-label="Close viewer" className={ICON_BUTTON}>
                  <X className="h-[18px] w-[18px]" />
                </button>
              </div>
            </div>
          </div>

          {/* BOTTOM: the words, who took them there, and the heart.
              One block, anchored to the bottom edge and growing upward, so
              opening it moves nothing that was already being read. */}
          {(caption || current.author || onToggleLove) && (
            <div className={cn(chromeClass, "bottom-0")} onClick={(e) => e.stopPropagation()}>
              <div
                className="pointer-events-none absolute inset-x-0 bottom-0 top-[-8rem]"
                style={{ backgroundImage: BOTTOM_SCRIM }}
              />
              {/* Aligned to the glass, not centred in it. A full-bleed
                  photograph reaches the left edge, so the words that belong to
                  it start at the left inset too; centring a column put the
                  caption 336px in from a photograph that began at 120. The
                  caption keeps a reading measure of its own, and the heart
                  stays at the far edge where it can always be found. */}
              <div
                className="relative flex w-full flex-col gap-2.5 px-4 pt-4 sm:px-6"
                style={{ paddingBottom: "max(16px, env(safe-area-inset-bottom))" }}
              >
                {/* The rest of the record: where it was, and what it is filed
                    under. It lives here rather than in a panel of its own,
                    which is the whole of the owner's complaint -- and it is
                    what the deleted /collection/[id] page used to hold. */}
                <AnimatePresence initial={false}>
                  {expanded && (where || tags.length > 0) && (
                    <m.div
                      key="record"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 6 }}
                      transition={{ duration: 0.18, ease: EASE_OUT_SMOOTH }}
                      className="flex flex-wrap items-center gap-1.5"
                    >
                      {where && (
                        <span className="mr-1 text-[12.5px] text-white/70">{where}</span>
                      )}
                      {tags.map((t) => (
                        <span
                          key={t}
                          className="rounded-full border border-white/20 bg-white/10 px-2.5 py-0.5 text-[11.5px] font-medium text-white/85"
                        >
                          {t}
                        </span>
                      ))}
                    </m.div>
                  )}
                </AnimatePresence>

                {caption &&
                  (hasMore ? (
                    /* The whole caption is the control. There is no small
                       exact pill to hit, in either direction: press the words
                       to open them and press them again to put them away. */
                    <button
                      type="button"
                      onClick={() => setExpanded((v) => !v)}
                      aria-expanded={expanded}
                      className="-mx-2 max-w-2xl rounded-[var(--radius-sm)] px-2 py-1 text-left transition-colors duration-150 hover:bg-white/8 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                    >
                      <p
                        ref={captionRef}
                        className={cn(
                          "text-[14.5px] leading-[1.55] text-white/92",
                          expanded
                            ? "max-h-[42vh] overflow-y-auto overscroll-contain pr-1"
                            : "line-clamp-2"
                        )}
                      >
                        {caption}
                      </p>
                      <span className="mt-0.5 inline-block text-[12px] font-semibold text-white/75">
                        {expanded ? "Less" : "More"}
                      </span>
                    </button>
                  ) : (
                    <p
                      ref={captionRef}
                      className="line-clamp-2 max-w-2xl text-[14.5px] leading-[1.55] text-white/92"
                    >
                      {caption}
                    </p>
                  ))}

                <div className="flex items-center gap-3">
                  {current.author &&
                    // The byline walks to the author's profile when we know who
                    // they are (id is optional on AvatarUser); navigating
                    // naturally closes the viewer with the page.
                    (current.author.id ? (
                      <Link
                        href={`/profile/${current.author.id}`}
                        className="flex min-w-0 items-center gap-2.5 rounded-full transition-opacity duration-150 hover:opacity-80 active:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70"
                      >
                        {byline}
                      </Link>
                    ) : (
                      <span className="flex min-w-0 items-center gap-2.5">{byline}</span>
                    ))}
                  {onToggleLove && (
                    <LoveButton
                      liked={Boolean(current.loved)}
                      count={current.loveCount ?? 0}
                      onToggle={() => onToggleLove(at)}
                      label="photo"
                      className="ml-auto text-white/85 hover:bg-white/12 hover:text-white"
                    />
                  )}
                </div>
              </div>
            </div>
          )}
        </m.div>
      )}
    </AnimatePresence>,
    portal
  );
}
