"use client";

/* ------------------------------------------------------------------ *
 *  The published Edition, read.
 *
 *  This is the front runner, transplanted from
 *  `/lab/catchups/sketches/_reader.tsx` rather than re-derived. He
 *  reviewed it twice and it is the first thing in this campaign he liked:
 *  "for the first time in two days and a million sessions I feel like this
 *  is coming together." The Support redesign was re-derived during its
 *  ship once and every divergence cost a correction round, so the rule for
 *  this file is that a number here came out of the room, and a number that
 *  differs from the room is a decision with a sentence beside it.
 *
 *  WHAT IT BETS. Every rejected design spent its invention on the answers.
 *  He kept saying the answers were fine (brief 27, R37, R40) and that the
 *  navigator was the same mediocre sheet fifteen times (R24). So the
 *  answers are quiet paper tiles at the feed's own sizes and the one
 *  bespoke object is the strip under the app's green bar, which is the
 *  navigator (`navigator.tsx`).
 *
 *  The page, top to bottom, on a phone:
 *
 *    the app's green bar, with the Catch-up's name where the wordmark is
 *    the strip: "15 August 2026", or the question you are in
 *    a question: a short cinnamon mark, the heading, "Asked by" when a
 *      member wrote it
 *    its answers, each a tile
 *    the next question
 *
 *  No masthead (the bar and the strip are the masthead, so the first
 *  screen holds a whole answer, which the shipped reader's did not, recon
 *  R18). No row of birds, no counts, no question numbers, no timestamps,
 *  nothing about the next Edition, no rule under anything.
 *
 *  THE ONE THING THAT IS NOT THE ROOM'S, and it is a correction rather
 *  than a change of design. The room chose between its three layouts in
 *  JavaScript, from a prop, because a room draws inside a fixed frame and
 *  Tailwind's breakpoints answer to the real window instead. A page does
 *  not have that problem and does have the opposite one: a layout chosen
 *  after mount means the SERVER renders one of the three and the browser
 *  paints it before swapping. On a cold load of an Edition on a laptop
 *  that would be the phone layout, full-bleed, with a strip pinned under a
 *  bar that is not there. He has already caught exactly this shape of
 *  fault once, in the lab: "when I click on reader it shows me some
 *  different UI for a second before showing the correct one we've
 *  developed."
 *
 *  So every structural choice below is made in CSS -- which column count,
 *  which chrome, which paddings, even the photo run's band height, through
 *  a custom property -- and the server's single render is correct at every
 *  width. JavaScript still decides the two SCROLL OFFSETS, because those
 *  are only ever read inside an effect or a click handler, where the
 *  window is real and no paint depends on them.
 *
 *  THE CLASSES ARE WRITTEN OUT IN FULL, and they have to be: Tailwind
 *  reads this file as text to decide what CSS to emit, so a class built
 *  from a template literal produces a name with no rule behind it. Each
 *  one that mirrors a constant says so, and
 *  `reader-geometry.test.mjs` fails if the two ever drift.
 *
 *  NOTHING IS SCALED, and nothing ever should be. A `position: sticky`
 *  element inside a `transform: scale(s)` drifts at exactly (1 - s) of the
 *  scroll, because the browser resolves the sticky offset in the
 *  untransformed coordinate space (F34). That is what produced the fault
 *  he opened with on 2026-09-07: "the in the loop and the question are
 *  supposed to be fixed, but they actually move very slowly."
 *
 *  AND NO ANCESTOR MAY CARRY `overflow: hidden`, which silently becomes
 *  the scrollport and kills every sticky in here (F31, F33).
 *  `overflow-x: clip` does not.
 * ------------------------------------------------------------------ */

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "@/components/common/link";
import { AnimatePresence, m } from "motion/react";
import { EASE_OUT_SMOOTH } from "@/components/common/motion";
import { cn } from "@/lib/utils";
import { useBackCloses } from "@/lib/back-closes";
import { AppBarTitle } from "@/components/layout/app-bar-title";
import { LinkCard } from "@/components/common/link-card";
import { BAR, EditionMeta, QuestionList, Strip, UnfoldedPanel } from "./navigator";
import { PhotoRun } from "./photo-run";
import { AskedBy, Body, Byline, Photographs, Reactions, said } from "./reader-parts";
import type { ReaderEdition, ReaderQuestion } from "./reader-types";
import type { EditionEntry } from "@/lib/catchups-edition-view";

/** The phone's page gutter, the app shell's own (`p-5` on <main>). Drawn as
 *  `px-5` on the reading column and `-m-5` on the box around it. */
const GUTTER = 20;
/** The strip at rest is one line: 44px (`min-h-[44px]` in navigator.tsx). */
const STRIP_REST = 44;
/** Where the strip floats on a laptop: `md:top-4`. */
const STRIP_TOP_LAPTOP = 16;
/** A picked heading lands this far under the strip. */
const LANDING = 14;
/** Where the rail's own list is pinned on a wide laptop: `top-10`. */
const RAIL_TOP = 40;

/* Where the rail stops fitting, as a window width, because that is what a
   media query can ask about. The app's shell takes 248px of sidebar and 40px
   of gutter either side, so the room left for the page is `window - 328`. The
   rail is 280 wide with a 48px gutter, and under a 520px reading column the
   laptop stops being a laptop and reads like a wide phone -- which is what the
   strip is for. 520 + 48 + 280 + 328 = 1176.

   And then it is raised to `rail-grid.ts`'s own 1180, so this app never has
   two "the rail appears here" thresholds four pixels apart. Written as a max
   rather than as a bare 1180 so that changing a number here still moves it. */
const RAIL = 280;
const RAIL_GAP = 48;
const READING_MIN = 520;
const SHELL_CHROME = 328;
const RAIL_GRID_FLOOR = 1180;
export const RAIL_MIN_WINDOW = Math.max(
  READING_MIN + RAIL_GAP + RAIL + SHELL_CHROME,
  RAIL_GRID_FLOOR,
);
const RAIL_FITS = `(min-width: ${RAIL_MIN_WINDOW}px)`;
/* Below `md` the app draws its green bar (`md:hidden` on the header in
   layout/sidebar.tsx) and the sidebar becomes a drawer. That is the same line
   the reader's phone layout is drawn to, so it is asked about rather than
   guessed: one breakpoint, two consumers. */
const IS_PHONE = "(max-width: 767.98px)";

/** Live, and read ONLY where no paint depends on it: the scroll offsets below.
 *
 *  `useSyncExternalStore` rather than `useState` + an effect, because React
 *  reads `getServerSnapshot` on the server and during hydration -- so nothing
 *  mismatches -- and reads `getSnapshot` directly on a client mount, so a
 *  client-side navigation gets the right number on its first render. */
function useMedia(query: string, serverValue: boolean): boolean {
  return useSyncExternalStore(
    useCallback(
      (onChange: () => void) => {
        const mq = window.matchMedia(query);
        mq.addEventListener("change", onChange);
        return () => mq.removeEventListener("change", onChange);
      },
      [query],
    ),
    useCallback(() => window.matchMedia(query).matches, [query]),
    () => serverValue,
  );
}

/* ── one answer ────────────────────────────────────────────────────── *
 *  A short answer gets a tight tile, not a smaller one and not bigger
 *  type. Both of those were drawn and rejected ("made super small because
 *  the answer was short. Don't like that"; "the 'enough padel to conclude
 *  squash is better' tile is atrocious on mobile", R14). What made his
 *  three-word tile 85% empty (brief 31) was 26px of padding, a two-line
 *  byline and a thick band under the heart. Here the byline is one line,
 *  the words sit 10px under the name (R20: "the name is close to their
 *  answer"), and the heart is 6px under the words. */
function Tile({ entry, viewerIsAdmin }: { entry: EditionEntry; viewerIsAdmin: boolean }) {
  const body = entry.body?.trim() ?? "";
  return (
    /* The padding is the phone's 16 and the laptop's 20: LiftKit's card rule
       is that the inset answers to the largest type in the box, and a 17px
       name in an 828px tile cannot sit 16px from its edge without looking
       dropped in. */
    <article
      id={`entry-${entry.id}`}
      className="card-elevated overflow-hidden rounded-[var(--radius)] border border-border bg-card"
    >
      <div className="px-4 pt-3.5 md:px-5 md:pt-4">
        <Byline person={entry.author} />
        {body && <Body text={body} className="mt-2.5" />}
      </div>
      {entry.images.length > 0 && (
        <Photographs entry={entry} className="mt-3 max-h-[460px] md:max-h-[560px]" />
      )}
      {/* Under the words and the photographs, one card per pasted link that
          resolved, 8px apart: the lab's approved Media stack. */}
      {entry.links.length > 0 && (
        <div className="mx-4 mt-3 space-y-2 md:mx-5">
          {entry.links.map((link) => (
            <LinkCard key={link.url} link={link} />
          ))}
        </div>
      )}
      {/* Tighter by about a tenth, top and bottom, and it is his arithmetic:
          "there is definite padding above and below the heart icon and the
          comment icon ... let's decrease that padding by 10%. 10% on both the
          top and the bottom ... it'll be a very marginal change, but I think
          we should make it a bit tighter because it seems a bit loose."

          Measured, so the tenth is a tenth of something real. Above the
          heart's INK sits this box's top padding, the LoveButton's own 6px,
          and the 7px the 18px glyph is inset inside its 32px box: 8 + 6 + 7 =
          21 on a laptop. Below it: 7 + 6 + 10 = 23. A tenth of each is about
          2px, so both paddings come down 2. The side padding is untouched,
          which he asked for by name. The feed's half of the same change
          shipped separately as 2a6f7d25 so he can revert it alone. */}
      <div className="px-4 pb-1.5 pt-1 md:px-5 md:pb-2 md:pt-1.5">
        <Reactions entry={entry} viewerIsAdmin={viewerIsAdmin} />
      </div>
    </article>
  );
}

/* ── one question and its answers ──────────────────────────────────── *
 *  The mark above the heading is the same cinnamon as the line on the
 *  strip: when the heading docks, this is the line that grows. Between
 *  questions there is air and the mark, not a rule (brief 27: "Can totally
 *  delete that").
 *
 *  A `photo` question is a WALL and prints as the run instead of as a
 *  stack of tiles (spec 10.1, his pick). An answer with no photograph on a
 *  wall question still gets a tile, so nothing anybody wrote is dropped. */
function Section({
  q,
  viewerIsAdmin,
  sectionRef,
  headingRef,
}: {
  q: ReaderQuestion;
  viewerIsAdmin: boolean;
  sectionRef?: (el: HTMLElement | null) => void;
  headingRef?: (el: HTMLDivElement | null) => void;
}) {
  const entries = said(q.entries);
  const isWall = q.kind === "photo";
  const wall = isWall ? entries.filter((e) => e.images.length > 0) : [];
  const tiles = isWall ? entries.filter((e) => e.images.length === 0) : entries;

  return (
    <section ref={sectionRef} id={`q-${q.id}`}>
      <div ref={headingRef}>
        <span aria-hidden className="block h-[2px] w-8 rounded-full bg-cinnamon" />
        <h2
          /* A question is member-written and may be a pasted link, which is one
             unbreakable 54-character run. Without a break rule it lays the
             heading out past the column (F18).

             24px at both widths, which is `h2` on the documented scale
             (DESIGN-SYSTEM section 5). It used to be 30 on a laptop, which is
             the app's PAGE-title size and therefore the same size as the
             Catch-up's name above it. One element, one size, on the ladder:
             "we've chosen font sizes extremely randomly and we have to kind of
             standardize that" (R15).

             NO MEASURE CAP. The room set one at 26ch on a laptop and he threw
             it out on sight, 2026-09-10: "the questions wrap weirdly. i'm on
             desktop and the question What is a fun thing you did this summer?
             and summer goes onto the next line when there's plenty of space.
             idk why that's fixed like that." He is right that it looked like a
             fault rather than a measure: a heading is short enough that a
             book's line length only ever costs it one awkward break. The
             column caps at 900 and that is the measure. */
          className="mt-3 break-words font-heading text-[24px] leading-[1.2] tracking-[-0.015em] text-foreground [overflow-wrap:anywhere]"
        >
          {q.text}
        </h2>
        <AskedBy asker={q.asker} />
      </div>
      {entries.length === 0 ? (
        /* Plain line, no dashed box: it was the page's only dashed rule and it
           framed four words (owner review 2026-07-25). The section is never
           hidden -- a question nobody took is still part of the Edition. */
        <p className="mt-4 text-sm italic text-muted-foreground">No one took this one.</p>
      ) : (
        <div className="mt-4 space-y-3">
          {wall.length > 0 && <PhotoRun entries={wall} gutter={GUTTER} />}
          {tiles.map((e) => (
            <Tile key={e.id} entry={e} viewerIsAdmin={viewerIsAdmin} />
          ))}
        </div>
      )}
    </section>
  );
}

/* ── where am I ────────────────────────────────────────────────────── *
 *  Read off the real headings every scroll frame, in screen coordinates,
 *  which is honest because nothing is scaled.
 *
 *  Two lines, and the difference between them was found by looking. The
 *  first rule used one line at the bar's foot, so a picked question landed
 *  with its heading under the strip while the strip still named the
 *  question before it, two questions stacked. `line` is where a question
 *  becomes CURRENT: the strip's foot plus the landing breath. `dock` is
 *  where a heading has GONE: under the strip's foot. */
type Spy = {
  /** Which question you are READING: the last one whose top has crossed the
   *  landing line. Drives the rail's mark and the measure's fill. */
  current: number;
  /** Which question the STRIP names: the last one whose heading has gone
   *  under the bar, or -1 while none has. A separate number on purpose, and
   *  the difference is the whole of "it should just seamlessly switch".
   *
   *  Tied to `current`, the strip went blank between every pair of questions:
   *  the next question becomes current the moment its SECTION reaches the
   *  landing line, which is a screen and a half before its HEADING slides
   *  under the bar -- and in that window there was no docked heading to name,
   *  so the bar fell back to the date and then returned. Counted off the
   *  headings and the dock line instead, the label changes at exactly the
   *  moment one heading disappears under the bar, so it hands over rather
   *  than dropping out, and it never names a question whose heading you can
   *  still read on the page. */
  labelled: number;
  within: number;
  progress: number;
};

function useSpy(
  root: React.RefObject<HTMLDivElement | null>,
  sections: React.MutableRefObject<Array<HTMLElement | null>>,
  headings: React.MutableRefObject<Array<HTMLDivElement | null>>,
  lineOffset: number,
  dockOffset: number,
): Spy {
  const [spy, setSpy] = useState<Spy>({ current: 0, labelled: -1, within: 0, progress: 0 });

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      raf = 0;
      const el = root.current;
      if (!el) return;
      const top = el.getBoundingClientRect().top;

      let current = 0;
      for (let i = 0; i < sections.current.length; i += 1) {
        const s = sections.current[i];
        if (s && s.getBoundingClientRect().top <= lineOffset + 4) current = i;
      }
      let labelled = -1;
      for (let i = 0; i < headings.current.length; i += 1) {
        const h = headings.current[i];
        if (h && h.getBoundingClientRect().bottom <= dockOffset) labelled = i;
      }

      const s = sections.current[current];
      const sTop = s ? s.getBoundingClientRect().top : 0;
      const within = s
        ? Math.max(0, Math.min(1, (lineOffset - sTop) / Math.max(1, s.offsetHeight)))
        : 0;
      const travel = Math.max(1, el.offsetHeight - window.innerHeight);
      const progress = Math.max(0, Math.min(1, -top / travel));

      setSpy((prev) =>
        prev.current === current &&
        prev.labelled === labelled &&
        Math.abs(prev.within - within) < 0.005 &&
        Math.abs(prev.progress - progress) < 0.002
          ? prev
          : { current, labelled, within, progress },
      );
    };
    const ask = () => {
      if (!raf) raf = requestAnimationFrame(tick);
    };
    ask();
    window.addEventListener("scroll", ask, { passive: true });
    window.addEventListener("resize", ask);
    const ro = root.current ? new ResizeObserver(ask) : null;
    if (root.current) ro?.observe(root.current);
    return () => {
      window.removeEventListener("scroll", ask);
      window.removeEventListener("resize", ask);
      ro?.disconnect();
      if (raf) cancelAnimationFrame(raf);
    };
  }, [root, sections, headings, lineOffset, dockOffset]);

  return spy;
}

/* ── going somewhere ───────────────────────────────────────────────── *
 *  His, 2026-09-07: "when you click the navigator and click a question, we
 *  need to make sure it's a really lovely animation to move to that
 *  question. Right now it's kind of skipping through everything and it
 *  looks a bit too much like a fast forward. And it's not a beautiful fast
 *  forward. It's just like, oh, it's just overstimulating."
 *
 *  He is right, and the fix is not a slower scroll. Thirty thousand pixels
 *  of other people's answers flying past is noise whatever speed it runs
 *  at, because nothing in it is meant to be seen. So there are two moves,
 *  and which one you get depends on whether the journey is worth watching:
 *
 *    NEAR (under two screens): a glide, eased both ends, because you can
 *      follow it and the continuity tells you where you went.
 *    FAR: the page dims and lets go (150ms), the jump happens with nothing
 *      on screen to smear, and the new question arrives rising 12px into
 *      place (260ms). One cut instead of a fast forward.
 */
const NEAR_SCREENS = 2;

function scrollTargetOf(el: HTMLElement, landing: number) {
  return window.scrollY + el.getBoundingClientRect().top - landing;
}

function glide(to: number) {
  const from = window.scrollY;
  const dist = to - from;
  const ms = Math.min(900, 380 + Math.abs(dist) * 0.06);
  const t0 = performance.now();
  const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const step = (now: number) => {
    const p = Math.min(1, (now - t0) / ms);
    window.scrollTo(0, from + dist * ease(p));
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

/* ── the reader ────────────────────────────────────────────────────── */

export function EditionReader({ edition }: { edition: ReaderEdition }) {
  const root = useRef<HTMLDivElement>(null);
  const sections = useRef<Array<HTMLElement | null>>([]);
  const headings = useRef<Array<HTMLDivElement | null>>([]);
  const [open, setOpen] = useState(false);
  const [arriving, setArriving] = useState(false);

  /* Three layouts, not two, and the third is what he asked for on 2026-09-07:
     "at some point you might [want] to remove the navigation and swap it to
     the phone method of questions to save space."

       phone    the app's green bar, the strip welded under it, one column
       column   a laptop too narrow for both. The rail goes and the strip comes
                back, as a floating card rather than a bar welded to the top,
                because there is no green app bar on a laptop to weld it to
       rail     two columns, the questions open in a rail on the right, and NO
                floating question: "on desktop don't have the question
                floating. I can see it in the sidebar."

     So the rail is not a breakpoint that happens to be true at 1512; it is on
     whenever there is room for it. Which layout you get is CSS (see the
     docblock); these two booleans exist only for the scroll offsets. */
  const phone = useMedia(IS_PHONE, true);
  const railFits = useMedia(RAIL_FITS, false);

  /* A picked heading lands here, clear of whatever is pinned above it, and
     this is also where a question becomes current. On a wide laptop nothing is
     pinned, so it is just a breath under the top of the window. */
  const landing = railFits ? RAIL_TOP : (phone ? BAR : STRIP_TOP_LAPTOP) + STRIP_REST + LANDING;
  /* Where a heading counts as gone, for the strip. On a wide laptop nothing
     docks, because nothing floats. */
  const dock = railFits ? 0 : (phone ? BAR : STRIP_TOP_LAPTOP) + STRIP_REST;
  const spy = useSpy(root, sections, headings, landing, dock);

  /* The open list dims the page, so back puts it away rather than leaving the Edition. */
  useBackCloses(open, () => setOpen(false));

  /* Scrolling puts the list away, so a pick can close it first and move. */
  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    window.addEventListener("scroll", close, { passive: true });
    return () => window.removeEventListener("scroll", close);
  }, [open]);

  const pick = useCallback(
    (i: number) => {
      setOpen(false);
      const s = sections.current[i];
      if (!s) return;
      const to = scrollTargetOf(s, landing);
      if (Math.abs(to - window.scrollY) < window.innerHeight * NEAR_SCREENS) {
        glide(to);
        return;
      }
      setArriving(true);
      window.setTimeout(() => {
        const el = sections.current[i];
        if (el) window.scrollTo(0, scrollTargetOf(el, landing));
        setArriving(false);
      }, 160);
    },
    [landing],
  );

  const home = `/catchups/${edition.catchupId}`;

  /* WHAT THE STRIP SAYS, and it is his, 2026-09-10: "let that bar on top that
     appears when there's no siderail space fade in only after you scroll past
     the first question. let it never show the date. and then let it switch
     from question to question instead of going to the date in the middle."

     Three things in one note. The strip used to say the date whenever no
     heading was docked -- so between two questions it fell back to the date
     and then returned to a question, which is the flicker he means by "going
     to the date in the middle". Now, once you are past the first heading, it
     names the question you are in and keeps naming it.

     ON A LAPTOP it is not there at all until then, because the page header
     above it already carries the name and the date, so an idle bar repeating
     them is the "said twice" fault he has listed before. ON A PHONE it stays,
     because there is no page header and the strip is the only place the
     Edition's date is printed. Same rule, one exception, stated. */
  const past = spy.labelled >= 0;
  const labelled = edition.questions[spy.labelled];
  const showQuestion = past && !open && Boolean(labelled);

  return (
    <>
      {/* The Catch-up's name in the phone's green bar, and it is the way up
          out of an Edition (architecture 7). The bar it writes into is itself
          `md:hidden`, so this is rendered unconditionally: deciding twice is
          how the two come to disagree. */}
      <AppBarTitle title={edition.catchupName} href={home} />

      {/* `-m-5 md:m-0` cancels the shell's own phone gutter so the strip can
          run the full width of the window under the bar; `px-5` further down
          puts the reading back inside it. The shell pads `p-5` at this width
          and `sm:p-7 lg:p-10` above it, where the reader adds none of its
          own. */}
      <div ref={root} className="relative -m-5 md:m-0">
        {/* The floating instrument: the phone's, and the narrow laptop's. Gone
            at RAIL_MIN_WINDOW, where the rail beside the column already names
            the question you are in.

            `top-14` is BAR (56px) and `md:top-4` is STRIP_TOP_LAPTOP (16).
            Zero height and sticky, so the strip and whatever unfolds from it
            overlay the page without displacing it. */}
        <div
          className={cn(
            /* It FADES, and rises 8px as it comes, which is the note he sent
               back: "I said it should beautifully animate fade in or something
               not just suddenly appear." Opacity and transform only, which is
               the design system's whole list.

               The state is a class rather than a motion value on purpose: the
               server has to render this correctly at both widths without
               knowing the window (see the docblock), and a class the CSS
               transition then animates does that. `hidden` would not -- there
               is nothing to fade from. */
            "sticky top-14 z-30 h-0 transition-[opacity,transform] duration-300 ease-out md:top-4 min-[1180px]:hidden",
            !past && "md:pointer-events-none md:-translate-y-2 md:opacity-0",
          )}
        >
          <AnimatePresence>
            {open && (
              <m.button
                type="button"
                aria-label="Close the questions"
                onClick={() => setOpen(false)}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2, ease: EASE_OUT_SMOOTH }}
                className="absolute inset-x-0 top-0 h-[100vh] bg-black/25 md:fixed md:inset-0 md:h-auto md:bg-black/20"
              />
            )}
          </AnimatePresence>
          {/* On a laptop the strip floats 16px down, so without this an answer
              slides through the gap above it on its way off the screen. The
              page colour fades in over that gap and the words disappear into
              it instead of being sliced by the window's edge. A phone needs
              none of it: the strip is welded to the bar. */}
          <div
            aria-hidden
            className="absolute inset-x-0 bottom-full hidden h-4 bg-gradient-to-t from-background to-transparent md:block"
          />
          {/* All the chrome for the strip AND the panel under it, so the pair
              reads as one object -- and NONE OF IT CHANGES WHEN THE LIST
              OPENS. It used to gain a border and a rounded foot on `open`,
              which flipped instantly while the panel took 300ms to collapse:
              "when I minimise it, it minimises but then there's this outline
              that follows it a beat late." One box, one appearance, at every
              moment.

              `card-elevated` is unconditional: it is a plain class rather than
              a Tailwind utility, so it takes no `md:` prefix, and a soft
              shadow under a glass bar overlapping the answers behind it is
              right at both widths. */}
          <div className="card-elevated absolute inset-x-0 top-0 overflow-hidden md:rounded-[12px] md:border md:border-border">
            <Strip
              label={
                showQuestion ? labelled.text : <EditionMeta publishedAt={edition.publishedAt} />
              }
              docked={showQuestion}
              progress={spy.progress}
              open={open}
              onToggle={() => setOpen((v) => !v)}
            />
            {/* ONE MOTION, and it is the height. His, 2026-09-10: "the opening
                and closing of the menu in general does have a lot of motion.
                if there's a way that it's more gradual not too slow but also
                just less motion in general".

                What made it busy was three clocks. The height ran 300ms and
                the opacity 160, so on the way OUT the rows vanished and an
                empty box went on collapsing for another 140ms with nothing in
                it -- which is the outline that "follows it a beat late". The
                caret span and the scrim were each on a fourth and fifth.

                Now the height is the only thing animating and it carries the
                opacity with it on the same clock, so the list and the box it
                is in arrive and leave as one object. 260 in, 200 out: an
                enter you can follow, an exit that never lags the finger. */}
            <AnimatePresence initial={false}>
              {open && (
                <m.div
                  key="panel"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{
                    height: 0,
                    opacity: 0,
                    /* On the element, not on the shared `transition`: while it
                       is exiting it still holds the props it had when open, so
                       a ternary on `open` would read `true` and never fire. */
                    transition: { duration: 0.2, ease: EASE_OUT_SMOOTH },
                  }}
                  transition={{ duration: 0.26, ease: EASE_OUT_SMOOTH }}
                  className="overflow-hidden"
                >
                  <UnfoldedPanel
                    questions={edition.questions}
                    current={spy.current}
                    within={spy.within}
                    onPick={pick}
                  />
                </m.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* The grid. One column until the rail fits, then the reading and the
            list, both flush to the page's own gutters at every width: "the
            margins are totally messed up ... what is there in the shipped
            version now has much better margins. It like fills up the screen."
            Past 900 the reading stops growing and the gutter between the two
            columns takes the extra, so a television gets a wide spread instead
            of a 1,500px line or an island floating in the middle. 280px and
            48px are RAIL and RAIL_GAP. */}
        <div className="grid grid-cols-1 items-start min-[1180px]:grid-cols-[minmax(0,1fr)_280px] min-[1180px]:gap-x-[48px]">
          <div className="min-w-0 px-5 md:max-w-[900px] md:px-0">
            {/* The strip's own height plus a breath, so the first question
                clears it: 44 + 20. A PHONE ONLY.

                A laptop reserves nothing, and that is his: "right now there's
                a massive gap above the title because you removed that
                navigation tile above it." It used to hold 88px for a bar that
                was drawn at rest; the bar is invisible now until you are past
                the first question, so the 88 was a hole above the title. From
                the moment it appears it floats over the answers -- the same
                relationship the rail has to the reading column -- and the page
                starts at the shell's own gutter.

                AND WHERE THREE RANGES ARE NEEDED THEY ARE MUTUALLY EXCLUSIVE.
                `h-16 md:h-[88px] min-[1180px]:h-0` reads correctly and is
                wrong: Tailwind emits the `md` rule AFTER the arbitrary
                `min-[1180px]` one, so at 1440 both matched and the narrow
                laptop's 88px won -- measured, the page title sat 88px below
                the shell's own 40px gutter. `reader-geometry.test.mjs` fails
                on any rule in this file that leaves its middle range
                unbounded. */}
            <div className="max-md:h-16" />

            {/* The name and, under it, the date -- but only where nothing else
                is carrying them. On a phone the green bar has the name and the
                strip has the date; on a wide laptop nothing is pinned, so the
                header carries both; on a narrow laptop the strip is back, so
                the header would be saying the date a second time. That is the
                fault he listed twice in the first review: "in the loop is said
                twice, Round 1 is said twice, the date is said twice." */}
            <header className="hidden md:block">
              {/* 30px, which is what `PageHeader` sets on every other page in
                  the app (Feed, Directory, Collection, Letters). A Catch-up's
                  name is a page title, so it is THE page title size. And it is
                  the way up on a laptop, exactly as the green bar is on a
                  phone. */}
              <h1 className="font-heading text-[30px] leading-[1.2] tracking-[-0.02em] text-foreground">
                <Link
                  href={home}
                  className="rounded-sm transition-opacity duration-150 hover:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  {edition.catchupName}
                </Link>
              </h1>
              {/* The date, in cinnamon, and no Edition number: "let's ditch the
                  round 1. Let's only have the date, and then let the date be
                  orange ... The round number is irrelevant." With the number
                  gone the middle dot goes too, because there is nothing left
                  for it to separate. */}
              <p className="mt-2.5 hidden text-[14px] min-[1180px]:block">
                <EditionMeta publishedAt={edition.publishedAt} />
              </p>
            </header>

            {/* 24px on a wide laptop, and it has come down twice. 56 first,
                then 36, and he looked again on 2026-09-07: "decrease the gap
                between the orange date and the first orange line. it's a
                weirdly big gap and there's no reason for it. keep it something
                sensible."

                The reason it kept being too big is that it was being measured
                against the wrong thing. 36 was half of the 72 between one
                question and the next -- but that 72 separates two peers, and
                this gap separates an Edition's name from the Edition's own
                first item, which is a heading to its content. A third of the
                between-questions distance is the proportion the rest of the
                app uses for exactly that relationship, and 24 is what a 72
                gives. On a narrow laptop the name sits under a floating strip
                rather than at the top of the page, so it keeps the 36. */}
            <div className="pb-16 md:max-[1179px]:pt-9 md:pb-20 min-[1180px]:pt-6">
              {/* The dim-and-arrive wrapper. It holds only the answers: the
                  strip is its sibling above, so the navigator never blinks.

                  The gap between questions lives HERE, on the wrapper's
                  children, and not on the box outside it. Outside, it applied
                  to a list of one and silently did nothing, which ran every
                  question into the one before it. On a phone it is 60px for a
                  second reason: a landed heading sits 14px under the strip, so
                  the card above it ends 60px higher, which is 2px behind the
                  green bar. Nothing of the previous answer shows through the
                  glass, which is the spill he named in the shipped version
                  ("there's like stuff from the card above that's spilling onto
                  here"). */}
              <m.div
                className="space-y-[60px] md:space-y-[72px]"
                animate={arriving ? { opacity: 0, y: 12 } : { opacity: 1, y: 0 }}
                transition={{ duration: arriving ? 0.15 : 0.26, ease: EASE_OUT_SMOOTH }}
              >
                {edition.questions.map((question, i) => (
                  <Section
                    key={question.id}
                    q={question}
                    viewerIsAdmin={edition.viewerIsAdmin}
                    sectionRef={(el) => {
                      sections.current[i] = el;
                    }}
                    headingRef={(el) => {
                      headings.current[i] = el;
                    }}
                  />
                ))}
              </m.div>
            </div>
          </div>

          {/* The list, left open, fixed. Not scrolling at a tenth of the
              page's speed (R13, R23), which is the same drift the strip had
              and the same cause. `top-10` is RAIL_TOP. */}
          <aside className="hidden self-start top-10 min-[1180px]:sticky min-[1180px]:block">
            <QuestionList
              questions={edition.questions}
              current={spy.current}
              within={spy.within}
              size="rail"
              onPick={pick}
            />
          </aside>
        </div>
      </div>
    </>
  );
}
