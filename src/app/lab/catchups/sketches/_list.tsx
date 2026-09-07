"use client";

/* ------------------------------------------------------------------ *
 *  /catchups, the list.
 *
 *  WHAT IS GONE, AND WHY IT IS GONE RATHER THAN REDRAWN.
 *
 *  The right rail. "Fresh off the press" is deleted, not restyled, and
 *  with it go the curved divider, the hover with no padding on three
 *  sides, the teaser truncated twice, the empty Round promoted above a
 *  Round with 133 answers, and the fact that the whole rail is
 *  `display: none` on a phone and always was (recon I9, section 12). Its
 *  job was to say what is new to read. A Catch-up showing its own newest
 *  Round says that better, in the place you were already looking. That
 *  also answers I1 -- "sort out the stuff in the left column and the
 *  stuff on the right" -- by removing the right column.
 *
 *  The View button, the three dots, and the hover that darkened a shape
 *  nobody could name. A card is a door and the whole card is the target
 *  (_cover.tsx), so there is nothing to right-align beside anything.
 *  "Why do we have this View button? Why are there so many elements here
 *  and clicking on all of them does the same thing?" (para 3)
 *
 *  The row of birds and "+18". "That's pretty much all the information
 *  this is giving me, because I am not identifying the birds or the
 *  people." (para 23) The roster lives on the Catch-up's own home, where
 *  R2 put it, in full, with names.
 *
 *  Two of the three calls to action. There is one, and it is the app's
 *  own page-header action: "I have 3 different calls to action, okay?
 *  It's overpowering." (para 23)
 *
 *  THE MEASURED FAULT, and what replaces it. 63 to 76% of every tile was
 *  the gap between the title at one end and the View button at the other,
 *  and 67 to 82% of the window was neither sidebar nor card (recon I2).
 *  There is no gap here because there is nothing at the other end: a
 *  panel is a heading, a state line and the Round's own contents, and its
 *  height is set by what is in it. At a laptop's width two panels sit
 *  side by side, which is how a page with two or three Catch-ups on it
 *  fills a screen without anything being padded out.
 * ------------------------------------------------------------------ */

import { useState } from "react";
import { CaretRight } from "@phosphor-icons/react";
import { AnimatePresence, m } from "motion/react";
import { Button } from "@/components/ui/button";
import { EASE_OUT_SMOOTH } from "@/components/common/motion";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { Door } from "./_cover";
import { dayAndDate, shortDate, type SketchCatchup } from "./_shelf";

/* ── the one line under a Catch-up's name ──────────────────────────── *
 *  Cinnamon for the Round, the app's own dot, then the fact. One line,
 *  one place, in the same shape in every state, so the eye learns where
 *  to look once. No counts: not answers, not photographs, not people.
 *  "You're trying so hard to include useless information." (R32) */
function State({ c, phone }: { c: SketchCatchup; phone: boolean }) {
  const r = c.round;
  const fact =
    c.state === "ended" && c.endedAt
      ? `Ended on ${shortDate(c.endedAt)}`
      : !r
        ? "No Rounds yet"
        : c.state === "published" && r.publishedAt
          ? shortDate(r.publishedAt)
          : c.state === "collecting"
            ? "open for questions"
            : c.state === "answering" && r.closesAt
              ? `answers close on ${dayAndDate(r.closesAt)}`
              : c.state === "preparing" && r.comesOutAt
                ? `out on ${dayAndDate(r.comesOutAt)}`
                : "";

  const round = r && c.state !== "ended" && (
    <span className="font-medium text-cinnamon">Round {r.number}</span>
  );
  /* A pause is a mark on whatever the Round is doing, never a state of
     its own and never a banner over the top of one. Today's pause
     replaces the whole column, and "in the loop" is paused right now with
     a Round 2 in `collecting` that no member can see. */
  const pause = c.paused && <span className="font-medium text-muted-foreground">Paused</span>;

  /* Stacked in the laptop's 240px margin, on one line on a phone. Joined
     by the app's dot, "Round 4 · answers close on Thursday 20 August"
     wraps after the dot in 240px and leaves it hanging at the end of a
     line, and a separator with nothing after it is worse than none. At
     350px it fits, so it is one line and the panel is a line shorter. */
  if (phone) {
    return (
      <p className="flex flex-wrap items-center gap-2 text-[13.5px]">
        {round}
        {round && (pause || fact) && (
          <span className="dotsep" aria-hidden>
            ·
          </span>
        )}
        {pause}
        {pause && fact && (
          <span className="dotsep" aria-hidden>
            ·
          </span>
        )}
        {fact && <span className="text-muted-foreground">{fact}</span>}
      </p>
    );
  }
  return (
    <div className="space-y-0.5 text-[13.5px]">
      {round && <p>{round}</p>}
      {pause && <p>{pause}</p>}
      {fact && <p className="leading-snug text-muted-foreground">{fact}</p>}
    </div>
  );
}

/* ── one Catch-up ──────────────────────────────────────────────────── *
 *  A picture, a name, one line. Nothing else.
 *
 *  This page carried the Round's questions until he saw it, 2026-09-07:
 *  "I'm not too happy with having questions ... I just feel like it's
 *  overcrowding, there's just too much text going on for something that
 *  should just be a navigation for all your catch-ups ... it just seems a
 *  bit overwhelming." He is right, and the questions lose nothing by
 *  going: they are still on the Catch-up's home, on Now and on every
 *  cover in Earlier Rounds, which is where you are when you are choosing
 *  what to read rather than which Catch-up to open.
 *
 *  And the picture is the card, not a thumbnail on it: "I wanted it to
 *  kind of be more of an expensive thing, where it's just kind of a
 *  spectacle and it's just so cute ... just makes you wanna click it. I
 *  don't think that the picture is doing that job now." So it is 3:2,
 *  edge to edge, the card's own width, and the type sits under it on
 *  paper rather than over it, because a name in the heading face is
 *  worth reading and a scrim over a photograph is how it stops being.
 *
 *  NO BUTTONS HERE. Every card is the same three things at the same
 *  height, so the page is a shelf rather than a form. Answering is one
 *  tap further in, on the home, next to the Round it belongs to -- which
 *  is also the only place it has ever belonged.
 * ------------------------------------------------------------------ */

export function Panel({
  c,
  onOpen,
  phone,
}: {
  c: SketchCatchup;
  /** Where the card goes. A published Round opens the reader; anything
   *  else opens the home, because that is where the thing you would do
   *  next lives. Para 18 on landing straight in a finished Round: "it is
   *  a nice thought", and the fault he named was the missing way back,
   *  which the reader's title now fixes. */
  onOpen: (c: SketchCatchup) => void;
  phone: boolean;
}) {
  const r = c.round;
  return (
    <Door
      label={c.state === "published" ? `Read ${c.name}, Round ${r?.number}` : `Open ${c.name}`}
      onOpen={() => onOpen(c)}
      className="group"
    >
      {/* The one motion the design system allows on a photograph: the
          picture scales inside a frame that does not itself move. */}
      <span className="relative block aspect-[3/2] w-full overflow-hidden bg-muted">
        <Image
          src={c.picture}
          alt=""
          fill
          sizes="(min-width: 1180px) 540px, 400px"
          className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
        />
      </span>
      {/* A shade more under the type than over it: the name's cap sits
          a pixel below its own line box, so equal padding reads top-heavy. */}
      <div className={phone ? "px-4 pb-[18px] pt-3.5" : "px-5 pb-5 pt-4"}>
        <h2
          className="min-w-0 font-heading text-foreground"
          style={{ fontSize: phone ? 20 : 22, lineHeight: 1.25, letterSpacing: "-0.015em" }}
        >
          {c.name}
        </h2>
        <div className="mt-1.5">
          <State c={c} phone />
        </div>
      </div>
    </Door>
  );
}

/* ── archived ──────────────────────────────────────────────────────── *
 *  "I don't want to fucking see archived things. And then there's a Put
 *  back button, which is right there." (para 5) So: one quiet row at the
 *  very foot of the page, present only when at least one exists, and Put
 *  back only after you have opened it. */
function Archived({ names }: { names: string[] }) {
  const [open, setOpen] = useState(false);
  if (names.length === 0) return null;
  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="state-layer -ml-2 flex items-center gap-1.5 rounded-full px-2 py-1.5 text-[13.5px] font-medium text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <CaretRight
          size={13}
          weight="bold"
          className={cn("transition-transform duration-300 ease-out", open && "rotate-90")}
        />
        Archived
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <m.div
            key="archived"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{
              height: { duration: 0.28, ease: EASE_OUT_SMOOTH },
              opacity: { duration: 0.18, ease: EASE_OUT_SMOOTH },
            }}
            className="overflow-hidden"
          >
            <ul className="pt-1">
              {names.map((n) => (
                <li
                  key={n}
                  className="flex items-center justify-between gap-4 py-2 text-[14.5px] text-foreground"
                >
                  <span className="truncate font-heading">{n}</span>
                  <button
                    type="button"
                    className="shrink-0 text-[13.5px] font-medium text-canopy hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  >
                    Put back
                  </button>
                </li>
              ))}
            </ul>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── the page ──────────────────────────────────────────────────────── */

/** The page's own width, and it is the home's too (see _home.tsx): 260 of
 *  margin, 40 of gutter, 796 of contents. At his 1512 the shell leaves
 *  1184, so this fills it with 88px to spare; past it a television gets
 *  air on the right rather than a 2,000-pixel line of question. That is
 *  the fault he named in his very first sentence about this page: "if
 *  you're on a widescreen or on a TV or something, they just expand and
 *  take up the whole space. It's not a very scalable, nicely fitting
 *  thing." */
const PAGE_MAX = 1096;

export function List({
  shelf,
  onOpen,
  phone,
  archived = ["the reading group", "Batch of 2019"],
}: {
  shelf: SketchCatchup[];
  onOpen: (c: SketchCatchup) => void;
  phone: boolean;
  archived?: string[];
}) {
  return (
    <div style={{ maxWidth: phone ? undefined : PAGE_MAX }}>
      <header className="mb-6 flex items-start justify-between gap-4">
        <h1 className="font-heading text-[30px] leading-[1.2] tracking-[-0.02em] text-foreground">
          Catch-ups
        </h1>
        <div className="mt-px shrink-0">
          <Button size="sm">Start a Catch-up</Button>
        </div>
      </header>

      {/* Every card is the same height, because every card is the same
          three things, so a grid has no holes in it -- which is what made
          a grid impossible while the cards carried their Rounds' contents
          and were 350 and 500 pixels tall. Two up on a laptop, one on a
          phone. A member has two or three of these (para 1), so two up is
          a screen. */}
      <div
        className={cn(
          "grid gap-6",
          phone ? "grid-cols-1" : "grid-cols-1 min-[1180px]:grid-cols-2",
        )}
      >
        {shelf.map((c) => (
          <Panel key={c.id} c={c} onOpen={onOpen} phone={phone} />
        ))}
      </div>

      <Archived names={archived} />
    </div>
  );
}
