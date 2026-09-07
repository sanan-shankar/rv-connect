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
function stageOf(c: SketchCatchup): string {
  const r = c.round;
  if (c.paused) return "Paused";
  if (c.state === "ended" && c.endedAt) return `Ended ${shortDate(c.endedAt)}`;
  if (!r) return "No Rounds yet";
  if (c.state === "collecting") return "Open for questions";
  if (c.state === "answering" && r.closesAt) return `Answers close ${dayAndDate(r.closesAt)}`;
  if (c.state === "published" && r.publishedAt) return `Out ${shortDate(r.publishedAt)}`;
  return "";
}

/* ── one Catch-up ──────────────────────────────────────────────────── *
 *  The picture, and the words written on it.
 *
 *  His, 2026-09-07, on the version with the picture above and the words
 *  under it: "I'm just wondering whether having the entire thing as an
 *  image and then fading to black, kind of like a Spotify thing, might be
 *  nicer than this." And: "the picture is too small. I wanted it to kind
 *  of be more of an expensive thing, where it's just kind of a spectacle
 *  and it's just so cute ... just makes you wanna click it."
 *
 *  So the card IS the photograph. The name and the stage sit on it, over
 *  a fade, which is what lets the picture run the card's whole height
 *  instead of two thirds of it.
 *
 *  LANDSCAPE, and that is his too: "on a laptop it is kind of vertically
 *  long. I think it might be better to make it more landscape ... I can't
 *  even see 4 catch-ups." 5:2, which puts four on his screen.
 *
 *  NO ROUND NUMBER: "I don't think we need to say the round over there. I
 *  don't think that's too relevant. It can just be whatever stage it's
 *  going through."
 * ------------------------------------------------------------------ */

export function Panel({
  c,
  onOpen,
  phone,
}: {
  c: SketchCatchup;
  /** ALWAYS the home. It used to be the reader for a published Round and
   *  the home for everything else, and the thing he says he hates most
   *  about what ships is exactly that unpredictability: "I still can't
   *  predict where it's gonna open when I click it. It just does whatever
   *  it wants and I don't have a sense of it in my head." One rule costs
   *  a tap on the way to a Round and buys knowing where you will land. */
  onOpen: (c: SketchCatchup) => void;
  phone: boolean;
}) {
  return (
    <Door label={`Open ${c.name}`} onOpen={() => onOpen(c)} className="group">
      <span
        className="relative block w-full overflow-hidden bg-muted"
        style={{ aspectRatio: phone ? "16 / 9" : "5 / 2" }}
      >
        <Image
          src={c.picture}
          alt=""
          fill
          sizes="(min-width: 1180px) 540px, 400px"
          className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
        />
        {/* The fade. Two stops rather than one: a single linear gradient
            over 55% of a light photograph leaves the name sitting on a
            grey wash halfway up the picture, which reads as a bug. This
            is transparent for the top half and then falls away quickly,
            so the picture is a picture and the words have ground. */}
        <span
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to top, rgb(0 0 0 / 0.82) 0%, rgb(0 0 0 / 0.5) 24%, rgb(0 0 0 / 0.12) 50%, transparent 72%)",
          }}
        />
        <span className={cn("absolute inset-x-0 bottom-0", phone ? "p-4" : "p-5")}>
          <span
            className="block font-heading text-white"
            style={{
              fontSize: phone ? 21 : 24,
              lineHeight: 1.2,
              letterSpacing: "-0.015em",
              textShadow: "0 1px 12px rgb(0 0 0 / 0.4)",
            }}
          >
            {c.name}
          </span>
          <span className="mt-1 block text-[13.5px] text-white/80">{stageOf(c)}</span>
        </span>
      </span>
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

      {/* Every card is the same three things at the same height, so a
          grid has no holes in it. Two up on a laptop, one on a phone. */}
      <div className={cn("grid gap-5", phone ? "grid-cols-1" : "grid-cols-1 min-[1180px]:grid-cols-2")}>
        {shelf.map((c) => (
          <Panel key={c.id} c={c} onOpen={onOpen} phone={phone} />
        ))}
      </div>

      <Archived names={archived} />
    </div>
  );
}
