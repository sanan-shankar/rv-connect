"use client";

/* ------------------------------------------------------------------ *
 *  <AnnouncementWindow> — the window that opens once over the Feed:
 *  the new birds and the ask for support, on one page.
 *  docs/spec/announcement.md.
 *
 *  It wears the guide's window (guide-window.ts), as the owner asked:
 *  picture on one side, writing on the other, the same size of box. On
 *  a laptop the bird wall fills the left of it; on a phone the wall is
 *  a band across the top of the sheet with the X over it and the
 *  writing under it on paper. Once the band has scrolled away, a slim
 *  bar fades in behind the X with the title small, as in the guide.
 *
 *  ONE PAGE, and one voice on it. The first version gave each of the
 *  owner's ideas a page and a title; the second kept them on one page
 *  but still dressed each in its own type, a subheading here, a bold
 *  label there, pills of three sizes, gaps of five. So now: one title,
 *  paragraphs at one size, the amounts and the Contribute button at one
 *  height, and one gap between blocks.
 *
 *  THE ASK carries the Support page's own contribute form, so giving
 *  takes no trip to another page. On a phone its button stands in the
 *  sheet's footer, always in view; on a laptop it sits under the
 *  amounts. A payment that goes through lands on the bird picker,
 *  exactly as from Support, and that navigation closes this window
 *  (announcement-layer.tsx).
 * ------------------------------------------------------------------ */

import { useCallback, useEffect, useRef, useState } from "react";
import { BottomSheet, BOTTOM_SHEET_MS } from "@/components/ui/sheet";
import { P } from "@/components/guide/guide-kit";
import { GUIDE_FOOTER, GUIDE_HEADER, GUIDE_WINDOW, useWide } from "@/components/guide/guide-window";
import { AmountChoice, ContributeButton, useContribution } from "@/components/support/support-contribute";
import { headcountPhrase } from "@/lib/announcement";
import { closeAnnouncement } from "@/lib/announcement-open";
import { cn } from "@/lib/utils";
import { BirdWall } from "./bird-wall";

const TITLE = "Twenty new birds just flew in!";

/** The phone's collapsed bar: 12px, the X's 32px box, 12px. */
const BAR_PX = 56;

/* The one height every control here shares, the amounts and the button
   alike, so the ask reads as one row of one kind of thing. */
const CONTROL = "h-11 py-0 text-[15px]";

export function AnnouncementWindow({
  headcount,
  admissionNumber,
}: {
  headcount: number;
  admissionNumber: number | null;
}) {
  /* With the member's admission number among the amounts, because the words
     offer it. */
  const contribution = useContribution(admissionNumber);
  const wide = useWide();

  /* Shut on the first paint, open on the next frame: a sheet born open has
     no entrance to run (guide-overlay.tsx measured it). */
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setOpen(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  /* Close, then let the store go once the sheet has left. The X, escape,
     the scrim, back and a swipe down all arrive here. */
  const onOpenChange = useCallback((next: boolean) => {
    if (next) return;
    setOpen(false);
    window.setTimeout(closeAnnouncement, BOTTOM_SHEET_MS);
  }, []);

  /* The phone's bar: heard at the document in the capture phase, because
     the sheet's body mounts in a portal a beat after this runs. */
  const body = useRef<HTMLDivElement>(null);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const measure = () => {
      const el = body.current;
      if (!el) return;
      const band = el.querySelector<HTMLElement>("[data-announcement-band]")?.offsetHeight ?? 0;
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
  }, []);

  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title={
        <span
          className={cn(
            "block font-heading font-bold text-balance text-foreground",
            "text-[2rem] leading-[1.15] tracking-[-0.028em]",
            "max-lg:truncate max-lg:text-[1.0625rem] max-lg:leading-8 max-lg:tracking-[-0.01em]",
            scrolled ? "max-lg:transition-opacity max-lg:duration-200" : "max-lg:opacity-0",
          )}
        >
          {TITLE}
        </span>
      }
      /* The wall is drawn only in the shape on screen: forty-odd moving
         drawings twice over is too much to keep in the one CSS hides. */
      media={<div className="absolute inset-0 bg-card">{wide && <BirdWall gap={4} top={14} bottom={14} />}</div>}
      headerClassName={cn(
        GUIDE_HEADER,
        "max-lg:absolute max-lg:inset-x-0 max-lg:top-0 max-lg:z-10 max-lg:isolate max-lg:py-3",
        "max-lg:before:absolute max-lg:before:inset-0 max-lg:before:-z-10 max-lg:before:bg-popover max-lg:before:shadow-[0_1px_0_var(--border)] max-lg:before:transition-opacity max-lg:before:duration-200",
        scrolled ? "max-lg:before:opacity-100" : "max-lg:before:opacity-0",
      )}
      className={GUIDE_WINDOW}
      bodyClassName="px-6 pt-0 pb-8 lg:px-12 lg:pt-1"
      footer={<ContributeButton contribution={contribution} className="w-full sm:w-full" />}
      footerClassName={cn(GUIDE_FOOTER, "lg:hidden [--ring:var(--sky)]")}
      bodyRef={body}
    >
      {/* The phone's wall: the sheet's full width (-mx-6 undoes the body's
          margin) from its top edge, its first row starting under the X (the
          header's 12px, the X's 32px, then 8px). Four rows, so each bird is
          as big as the plate's, and they hold every bird the words below
          name. */}
      <div data-announcement-band="" className="relative -mx-6 mb-6 aspect-[10/11] overflow-hidden bg-card lg:hidden">
        {!wide && <BirdWall gap={3} top={52} bottom={10} rows={4} />}
      </div>
      <p
        aria-hidden
        className="mb-4 font-heading text-[1.75rem] font-bold leading-[1.15] tracking-[-0.028em] text-balance text-foreground lg:hidden"
      >
        {TITLE}
      </p>

      {/* The owner's own words, 2026-10-30, with the headcount kept live. */}
      <P>
        Meet the Red-vented Bulbul, the Indian Eagle-Owl, the Common Iora and even the Murukku
        bird, expanding our collection of birds to 70! We&rsquo;ve also redrawn many classics like
        the Paradise Flycatcher and the Peregrine Falcon.
      </P>
      <P>
        And you can pick any of these birds just by supporting us! We made this site purely out of
        love for the Rishi Valley community, and we&rsquo;re delighted to have{" "}
        {headcountPhrase(headcount).toLowerCase()} members in just a few months. An incredible
        amount of time and effort (and a fair bit of money) went into building this site over the
        last year. The site is not run for profit and all donations go solely toward recovering
        what it cost to build and what it takes to keep running. Any amount helps: ₹500, ₹1,000, or
        even your admission number!
      </P>
      <P>Please consider donating. We would deeply appreciate your support.</P>

      {/* The form runs on sky, as on Support, and its focus ring follows
          (support-contribute.tsx). */}
      <div className="mt-6 [--ring:var(--sky)]">
        <AmountChoice contribution={contribution} chipClassName={CONTROL} />
        <ContributeButton contribution={contribution} className={cn(CONTROL, "mt-3 hidden lg:inline-flex")} />
      </div>

    </BottomSheet>
  );
}
