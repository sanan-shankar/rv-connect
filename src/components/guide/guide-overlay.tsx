"use client";

/* ------------------------------------------------------------------ *
 *  <GuideOverlay> — the chapter, over the page you were on.
 *
 *  The app's one bottom sheet (ui/sheet's BottomSheet), so it wears the
 *  same X and swipe-down as every other panel that rises from the foot
 *  of the screen.
 *
 *  THE SHAPE. The sign-in page's, on a laptop: a photograph on the
 *  left and the writing in a column beside it. The owner, 2026-09-27:
 *  "it's just overall a bit bland [...] On desktop with an image and
 *  then a column of content [...] so that it feels more homely. Because
 *  right now, it's, like, just black and white." A phone has no room
 *  beside the column, so the photograph runs the sheet's full width
 *  under the title and scrolls away with the writing. Each chapter has
 *  its own (guide-photos.ts).
 *
 *  THE HEADER is the chapter's title with the X centred on it. There was
 *  a small "Guide" label here, and above the title a paragraph about
 *  the guide, which put the title a third of the way down (owner: "I
 *  think we can just ditch the guide thing [...] the feed is, like, the
 *  primary element. But it's so far down"). The margins are 24px on a
 *  phone and 48px on a laptop; they were the 16px every list sheet
 *  uses ("The margins are way too tight").
 *
 *  THE SWAP. Next changes the chapter without closing the sheet: the old
 *  one fades out, the body goes back to its top while nothing is showing,
 *  and the new one rises in. Focus moves to the new title so a screen
 *  reader starts there.
 *
 *  THE TWO THINGS THAT MADE IT FEEL CHEAP, both measured:
 *
 *  1. No entrance. A sheet born open has no closed-to-open transition to
 *     run: traced at 30ms intervals it went from absent to fully opaque
 *     in one sample. So it mounts shut and opens on the next frame.
 *
 *  2. No exit. The sheet closes first, and the store lets go once the
 *     animation has actually finished.
 *
 *  One fixed height, not sized to content, so every chapter opens at the
 *  same height (owner: "the panels all start at different heights").
 * ------------------------------------------------------------------ */

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import Image from "next/image";
import { AnimatePresence, m } from "motion/react";
import { BottomSheet, BOTTOM_SHEET_MS } from "@/components/ui/sheet";
import { EASE_OUT_SMOOTH } from "@/components/common/motion";
import { closeGuide } from "@/lib/guide-open";
import { cn } from "@/lib/utils";
import type { GuidePhoto } from "./guide-photos";

/** Where the sheet turns into photograph-and-column: BottomSheet's own lg. */
const WIDE = "(min-width: 1024px)";
function subscribeWide(onChange: () => void) {
  const query = window.matchMedia(WIDE);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}
/** One photograph is rendered, not both behind a media query: an <img> in a
 *  display:none box still downloads, and each is a few hundred KB. */
export function useWide() {
  return useSyncExternalStore(
    subscribeWide,
    () => window.matchMedia(WIDE).matches,
    () => false,
  );
}

/** The phone's collapsed bar: 12px, the X's 32px box, 12px. */
const BAR_PX = 56;

const TITLE_IN = { opacity: 1, transition: { duration: 0.24, ease: EASE_OUT_SMOOTH } };
const TITLE_OUT = { opacity: 0, transition: { duration: 0.12, ease: "easeOut" as const } };

export function GuideOverlay({
  slug,
  title,
  photo,
  nextPhoto,
  cover,
  footer,
  children,
}: {
  slug: string;
  title: string;
  /** The tour's welcome page (guide-cover.tsx): a layer over the whole
   *  sheet, with the first chapter already laid out beneath it, so Next
   *  fades the cover away and nothing under it has to move. Handed the
   *  sheet's close for its own X. */
  cover?: (close: () => void) => React.ReactNode;
  photo?: GuidePhoto;
  /** Fetched while this chapter is read, so Next never waits on it. */
  nextPhoto?: GuidePhoto;
  /** The tour's footer. Handed the sheet's own close, so Done leaves the same
   *  way the X does: the sheet falls, then the store lets go. */
  footer?: (close: () => void) => React.ReactNode;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const body = useRef<HTMLDivElement>(null);
  const wide = useWide();
  /* A phone sets the chapter's title on its photograph, which starts at the
     sheet's top edge. Once the photograph has scrolled away under the X, a
     slim bar fades in behind it with the title small, so the X is never white
     on white. Which layout is showing is CSS's call alone (every phone rule
     below is `max-lg:`), not this component's: a window dragged across the
     breakpoint changes CSS in the same frame, while a matchMedia listener
     answers a frame or more later, and in that gap the laptop's white header
     showed over the phone's layout (owner: "for a brief second [...] there
     flashes a white row on top saying feed"). */
  const banner = Boolean(photo);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    if (!banner) return;
    /* Scroll heard at the document, in the capture phase, because the sheet's
       body mounts in a portal a beat after this runs (the sheet opens on the
       next frame), so there is no element yet to listen on. Scroll does not
       bubble; capture still sees it. A resize asks again, because the band
       has no height at all while a laptop has it hidden. */
    const measure = () => {
      const el = body.current;
      if (!el) return;
      const band = el.querySelector<HTMLElement>("[data-guide-band]")?.offsetHeight ?? 0;
      setScrolled(band > 0 && el.scrollTop > band - BAR_PX);
    };
    const onScroll = (e: Event) => {
      if (e.target === body.current) measure();
    };
    document.addEventListener("scroll", onScroll, { capture: true, passive: true });
    window.addEventListener("resize", measure);
    return () => {
      document.removeEventListener("scroll", onScroll, { capture: true });
      window.removeEventListener("resize", measure);
    };
  }, [banner]);

  useEffect(() => {
    if (!nextPhoto) return;
    const warm = new window.Image();
    warm.src = wide ? nextPhoto.tall : nextPhoto.wide;
  }, [nextPhoto, wide]);

  // Shut on the first paint, open on the next frame. Without this there is no
  // enter transition at all: see the note at the top.
  useEffect(() => {
    const frame = requestAnimationFrame(() => setOpen(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  /* Close, then clear the store once the sheet has left. The back gesture
     needs no special case: the Sheet owns a history entry while open, so back
     arrives here through onOpenChange, the same road as the X. */
  const onOpenChange = useCallback((next: boolean) => {
    if (next) return;
    setOpen(false);
    window.setTimeout(closeGuide, BOTTOM_SHEET_MS);
  }, []);

  /* Runs in the gap between the old chapter leaving and the new one arriving,
     so the jump to the top is never seen. The new chapter is not mounted yet
     at this point (mode="wait" mounts it after this fires), so focus is only
     promised here and handed over once it has arrived. */
  const focusNext = useRef(false);
  const onSwapped = useCallback(() => {
    if (body.current) body.current.scrollTop = 0;
    focusNext.current = true;
  }, []);
  const onArrived = useCallback(() => {
    if (!focusNext.current) return;
    focusNext.current = false;
    document.querySelector<HTMLElement>("[data-guide-title]")?.focus({ preventScroll: true });
  }, []);
  const close = useCallback(() => onOpenChange(false), [onOpenChange]);
  /* The cover has gone and the chapter under it is in view: its title takes
     focus, as it would after any other Next. */
  const onUncovered = useCallback(() => {
    document.querySelector<HTMLElement>("[data-guide-title]")?.focus({ preventScroll: true });
  }, []);

  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title={
        /* On a phone the title is on the photograph until that scrolls away;
           this one is the bar's, and only shows with it. */
        <span
          className={cn(
            "block",
            /* Fades in with the bar; gone at once otherwise, so a window
               dragged across the breakpoint never shows it fading out over
               the photograph. */
            banner && (scrolled ? "max-lg:transition-opacity max-lg:duration-200" : "max-lg:opacity-0"),
          )}
        >
        <AnimatePresence mode="wait" initial={false}>
          <m.span
            key={slug}
            data-guide-title=""
            /* The swap moves focus here, so a screen reader starts the new
               chapter at its title. */
            tabIndex={-1}
            className={cn(
              "block truncate font-heading font-bold text-foreground outline-none",
              "text-[1.75rem] leading-[1.15] tracking-[-0.028em] lg:text-[2rem]",
              banner && "max-lg:text-[1.0625rem] max-lg:leading-8 max-lg:tracking-[-0.01em]",
            )}
            initial={{ opacity: 0 }}
            animate={TITLE_IN}
            exit={TITLE_OUT}
          >
            {title}
          </m.span>
        </AnimatePresence>
        </span>
      }
      /* Rendered at every width: the sheet shows it from lg up, and its image
         is lazy, so a phone, where it is display:none, never downloads it. */
      media={photo ? <PhotoPane slug={slug} photo={photo} /> : undefined}
      /* The X's glyph is 20px in a 32px box, so the box stands 6px short of
         the margin for the glyph's edge to meet the writing's. */
      headerClassName={cn(
        "pt-5 pr-[18px] pb-4 pl-6 lg:pt-10 lg:pr-[42px] lg:pl-12",
        banner && [
          "max-lg:absolute max-lg:inset-x-0 max-lg:top-0 max-lg:z-10 max-lg:isolate max-lg:py-3",
          // The bar's paper, faded in rather than switched on.
          "max-lg:before:absolute max-lg:before:inset-0 max-lg:before:-z-10 max-lg:before:bg-popover max-lg:before:shadow-[0_1px_0_var(--border)] max-lg:before:transition-opacity max-lg:before:duration-200",
          scrolled
            ? "max-lg:before:opacity-100"
            : "max-lg:before:opacity-0 max-lg:[&_[data-slot=sheet-close]]:text-white/90 max-lg:[&_[data-slot=sheet-close]]:drop-shadow-[0_1px_2px_rgb(0_0_0/0.45)]",
        ],
      )}
      /* A phone keeps the sheet that rises from the bottom. A laptop gets a
         window that floats clear of every edge, with the blur all round it
         (owner, 2026-09-27: "on laptop I think a floating window is better
         than this dialog from the bottom. [...] End it early and let the
         bottom be blurred like the other sides"). It rises 16px and fades
         in rather than travelling up from below the screen. */
      className={cn(
        "h-[calc(100svh-2rem)] max-h-none",
        "lg:inset-y-0 lg:my-auto lg:h-[min(54rem,calc(100svh-4rem))] lg:max-w-[1120px] lg:overflow-hidden lg:rounded-2xl",
        "lg:data-starting-style:translate-y-4 lg:data-starting-style:opacity-0 lg:data-ending-style:translate-y-4 lg:data-ending-style:opacity-0",
        /* The cover's photograph runs under the sheet's rounded corners. */
        "overflow-hidden",
      )}
      overlay={
        <AnimatePresence onExitComplete={onUncovered}>
          {cover && (
            <m.div
              key="cover"
              className="absolute inset-0 z-20"
              exit={{ opacity: 0, transition: { duration: 0.4, ease: EASE_OUT_SMOOTH } }}
            >
              {cover(close)}
            </m.div>
          )}
        </AnimatePresence>
      }
      overlayed={Boolean(cover)}
      bodyClassName={cn("px-6 pt-0 lg:px-12 lg:pt-1", footer ? "pb-8" : "pb-14")}
      footerClassName="px-6 lg:px-12"
      bodyRef={body}
      footer={footer?.(close)}
    >
      <AnimatePresence mode="wait" initial={false} onExitComplete={onSwapped}>
        <m.div
          key={slug}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0, transition: { duration: 0.24, ease: EASE_OUT_SMOOTH } }}
          exit={{ opacity: 0, transition: { duration: 0.12, ease: "easeOut" } }}
          onAnimationComplete={onArrived}
        >
          {banner && photo && (
            /* The sheet's full width (-mx-6 undoes the body's margin) from its
               top edge, with the chapter's title at its foot on a shade that
               rises from there, so the page goes from photograph to paper once
               (owner, 2026-09-27: "we just have one shift between picture and
               white [...] the picture is part of this experience rather than
               we're just tacking on a picture"). A faint shade at the head
               keeps the X readable on sky. */
            <div
              data-guide-band=""
              className="relative -mx-6 mb-6 aspect-[4/3] overflow-hidden lg:hidden"
              style={{ backgroundColor: photo.tint }}
            >
              <Image src={photo.wide} alt="" fill unoptimized sizes="100vw" className="object-cover" />
              <div
                aria-hidden
                className="absolute inset-0 bg-gradient-to-t from-black/80 from-0% via-black/35 via-40% to-transparent to-68%"
              />
              <div
                aria-hidden
                className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/35 to-transparent"
              />
              <p
                aria-hidden
                className="absolute inset-x-6 bottom-5 font-heading text-[1.75rem] font-bold leading-[1.15] tracking-[-0.028em] text-white"
              >
                {title}
              </p>
            </div>
          )}
          {children}
        </m.div>
      </AnimatePresence>
    </BottomSheet>
  );
}

/** The laptop's photograph. The next one fades in OVER this one, which
 *  stays at full strength beneath it until it is covered: two photographs
 *  crossing at half strength each let the sheet show through the middle. */
function PhotoPane({ slug, photo }: { slug: string; photo: GuidePhoto }) {
  return (
    <AnimatePresence initial={false}>
      <m.div
        key={slug}
        className="absolute inset-0"
        style={{ backgroundColor: photo.tint }}
        initial={{ opacity: 0, zIndex: 1 }}
        animate={{ opacity: 1, zIndex: 1, transition: { duration: 0.45, ease: EASE_OUT_SMOOTH } }}
        exit={{ opacity: 0, zIndex: 0, transition: { delay: 0.45, duration: 0 } }}
      >
        <Image
          src={photo.tall}
          alt=""
          fill
          unoptimized
          sizes="44vw"
          className="object-cover"
          style={{ objectPosition: photo.focus }}
        />
      </m.div>
    </AnimatePresence>
  );
}
