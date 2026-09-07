"use client";

/* ------------------------------------------------------------------ *
 *  The front runner: one reader, live.
 *
 *  What it bets. Every rejected design spent its invention on the
 *  answers. He kept saying the answers were fine: "The tiles are tried
 *  and tested across the app" (brief para 27), "I like the question font.
 *  Decent" (R37), "Everything in its separate tile. And the navigation
 *  stays on screen, which is something you don't seem to have got right"
 *  (R37). What no design solved was moving through the thing. So the
 *  answers here are quiet and correct, and the one bespoke object is the
 *  strip under the bar, which is the navigator (_navigator.tsx).
 *
 *  NOTHING IS SCALED. The room used to draw at a fixed 390 or 1512 and
 *  scale the result to fit, and that one convenience produced the fault
 *  he opened with on 2026-09-07: "the in the loop and the question are
 *  supposed to be fixed, but they actually move very slowly ... so that
 *  by the time I'm on the 6th question, it's totally out of the screen."
 *  Measured: a `position: sticky` element inside a `transform: scale(s)`
 *  drifts at exactly (1 - s) of the scroll, because the browser resolves
 *  the sticky offset in the untransformed coordinate space and the scale
 *  then shrinks the correction. At 0.92 that is 1,487px of drift over
 *  20,000px, and at 0.95 on the laptop frame it is 914px. There is no
 *  compensating for it honestly; the frame is gone, both views are fluid,
 *  and sticky is native again.
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
 *  The masthead on a phone is those two bars: the name in the green one
 *  and the date in the strip. Nothing else, so the first screen holds a
 *  whole answer, which the shipped reader's does not. On a laptop nothing
 *  is pinned, so the same two facts are the page's title (see `head`, and
 *  N11). No row of birds, no counts, no ROUND NUMBERS, no timestamps,
 *  nothing about Round 2, no rule under anything.
 * ------------------------------------------------------------------ */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, m } from "motion/react";
import { EASE_OUT_SMOOTH } from "@/components/common/motion";
import { cn } from "@/lib/utils";
import type {
  SketchEntry,
  SketchQuestion,
  SketchRound,
  SketchViewport,
} from "./_types";
import { PhoneBar, PhoneShell, DesktopShell } from "./_shell";
import {
  AskedBy,
  Body,
  Byline,
  longDate,
  Media,
  Photographs,
  Reactions,
  said,
} from "./_parts";
import {
  BAR,
  QuestionList,
  RoundMeta,
  Strip,
  UnfoldedPanel,
} from "./_navigator";

/** The phone's page gutter, the app's own. */
export const GUTTER = 20;
/** The laptop's rail, and the gutter between it and the reading. */
export const RAIL = 280;
export const RAIL_GAP = 48;
/** The narrowest a column of answers may be before the rail is not worth
 *  its room. Below this the laptop stops being a laptop and reads like a
 *  wide phone, which is what the strip is for. */
const READING_MIN = 520;
/** The widest a column of answers gets, however wide the window is.
 *
 *  Brief para 1 and para 6: "if you're on a widescreen or on a TV or
 *  something, they just expand and take up the whole space. It's not a
 *  very scalable, nicely fitting thing." Capping the PAIR and centring it
 *  was tried first and was worse: at 2560 the reader and its rail became
 *  an island with a thousand pixels of nothing beside them. So both
 *  columns stay flush to the page's gutters and only the space BETWEEN
 *  them grows. At his 1512 the reading column is 856 and this never
 *  bites. */
const READING_MAX = 900;
const COLUMN_MAX = 900;
/** The strip at rest is one line: 44px. */
const STRIP_REST = 44;
const STRIP_TOP_LAPTOP = 16;
/** A picked heading lands this far under the strip. */
const LANDING = 14;

/* Where the rail stops fitting, as a window width, because that is what a
   media query can ask about. The app's shell takes 248px of sidebar and
   40px of gutter either side, so the room left for the page is
   `window - 328`. The rail needs the reading column, the gutter and
   itself: 520 + 48 + 280 = 848. Hence 1176, rounded to 1180. */
const RAIL_FITS = `(min-width: ${READING_MIN + RAIL_GAP + RAIL + 328}px)`;

/** Live, and false on the server and the first client frame so nothing
 *  flips shell during hydration. Same shape as
 *  `src/components/common/use-wide-viewport.ts`, which does this for the
 *  house picker; the query differs, so the hook is not shared. */
function useRailFits(): boolean {
  const [fits, setFits] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(RAIL_FITS);
    const sync = () => setFits(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return fits;
}

/* ── one answer ────────────────────────────────────────────────────── *
 *  A short answer gets a tight tile, not a smaller one and not bigger
 *  type. Both of those were drawn and rejected. What made his three-word
 *  tile 85% empty (brief para 31) was 26px of padding, a two-line byline
 *  and a thick band under the heart. Here the byline is one line, the
 *  words sit 10px under the name (R20: "the name is close to their
 *  answer"), and the heart is 6px under the words. */
export function Tile({ entry, phone }: { entry: SketchEntry; phone: boolean }) {
  /* `entry.text` and nothing else. It used to fall back to `entry.body`
     when `text` was empty, and that fallback undid the one rule this
     design has about links: "I think it should just not show the link at
     all. Let it just show the button" (R31). `text` is the body with the
     links that became cards taken out, so it is empty for exactly the
     answer that is ONLY a link -- and the fallback then printed the raw
     url above the card it had just been turned into. The pressure corpus
     put three of them on one screen, a 123-character Spotify url among
     them. An answer with nothing but a link is now its card. */
  const body = entry.text;
  return (
    /* The padding is the phone's 16 and the laptop's 20: LiftKit's card
       rule is that the inset answers to the largest type in the box, and
       a 17px name in an 828px tile cannot sit 16px from its edge without
       looking dropped in. */
    <article className="card-elevated overflow-hidden rounded-[var(--radius)] border border-border bg-card">
      <div className={phone ? "px-4 pt-3.5" : "px-5 pt-4"}>
        <Byline person={entry.author} />
        {body && <Body text={body} phone={phone} className="mt-2.5" />}
      </div>
      {entry.images.length > 0 && (
        <Photographs
          entry={entry}
          className="mt-3"
          maxHeight={phone ? 460 : 560}
        />
      )}
      {entry.media.length > 0 && (
        <Media
          items={entry.media}
          className={phone ? "mx-4 mt-3" : "mx-5 mt-3"}
        />
      )}
      <div className={phone ? "px-4 pb-2 pt-1.5" : "px-5 pb-2.5 pt-2"}>
        <Reactions entry={entry} />
      </div>
    </article>
  );
}

/* ── one question and its answers ──────────────────────────────────── *
 *  The mark above the heading is the same cinnamon as the line on the
 *  strip: when the heading docks, this is the line that grows. Between
 *  questions there is air and the mark, not a rule (brief para 27: "Can
 *  totally delete that"). */
export function Section({
  q,
  phone,
  sectionRef,
  headingRef,
}: {
  q: SketchQuestion;
  phone: boolean;
  sectionRef?: (el: HTMLElement | null) => void;
  headingRef?: (el: HTMLDivElement | null) => void;
}) {
  return (
    <section ref={sectionRef} id={`q-${q.id}`}>
      <div ref={headingRef}>
        <span
          aria-hidden
          className="block h-[2px] w-8 rounded-full bg-cinnamon"
        />
        <h2
          /* A question is member-written and may be a pasted link. Same
             reason as the answer body: without this one 90-character token
             lays the heading out past the column. */
          className="mt-3 font-heading text-foreground [overflow-wrap:anywhere]"
          /* 24px on both, which is `h2` on the documented scale
             (DESIGN-SYSTEM section 5). It used to be 30 on a laptop, which
             is the app's PAGE-title size and therefore the same size as
             the Catch-up's name above it. One element, one size, on the
             ladder: "we've chosen font sizes extremely randomly and we
             have to kind of standardize that" (R15). */
          style={{
            fontSize: 24,
            lineHeight: 1.2,
            letterSpacing: "-0.015em",
            maxWidth: phone ? undefined : "26ch",
          }}
        >
          {q.text}
        </h2>
        <AskedBy name={q.askedBy} className="mt-2" />
      </div>
      <div className="mt-4 space-y-3">
        {said(q.entries).map((e) => (
          <Tile key={e.id} entry={e} phone={phone} />
        ))}
      </div>
    </section>
  );
}

/* ── where am I ────────────────────────────────────────────────────── *
 *  Read off the real headings every scroll frame, in screen coordinates,
 *  which is honest now that nothing is scaled.
 *
 *  Two lines, and the difference between them was found by looking. The
 *  first rule used one line at the bar's foot, so a picked question
 *  landed with its heading under the strip while the strip still named
 *  the question before it, two questions stacked. `line` is where a
 *  question becomes CURRENT: the strip's foot plus the landing breath.
 *  `dock` is where a heading has GONE: under the strip's foot. */
type Spy = {
  current: number;
  docked: boolean;
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
  const [spy, setSpy] = useState<Spy>({
    current: 0,
    docked: false,
    within: 0,
    progress: 0,
  });

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
      const s = sections.current[current];
      const h = headings.current[current];
      const sTop = s ? s.getBoundingClientRect().top : 0;
      const docked = Boolean(
        s && h && top < 0 && h.getBoundingClientRect().bottom <= dockOffset,
      );
      const within = s
        ? Math.max(
            0,
            Math.min(1, (lineOffset - sTop) / Math.max(1, s.offsetHeight)),
          )
        : 0;
      const travel = Math.max(1, el.offsetHeight - window.innerHeight);
      const progress = Math.max(0, Math.min(1, -top / travel));

      setSpy((prev) =>
        prev.current === current &&
        prev.docked === docked &&
        Math.abs(prev.within - within) < 0.005 &&
        Math.abs(prev.progress - progress) < 0.002
          ? prev
          : { current, docked, within, progress },
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
 *  His, 2026-09-07: "when you click the navigator and click a question,
 *  we need to make sure it's a really lovely animation to move to that
 *  question. Right now it's kind of skipping through everything and it
 *  looks a bit too much like a fast forward. And it's not a beautiful
 *  fast forward. It's just like, oh, it's just overstimulating."
 *
 *  He is right, and the fix is not a slower scroll. Thirty thousand
 *  pixels of other people's answers flying past is noise whatever speed
 *  it runs at, because nothing in it is meant to be seen. So there are
 *  two moves, and which one you get depends on whether the journey is
 *  worth watching:
 *
 *    NEAR (under two screens): a glide, eased both ends, because you can
 *      follow it and the continuity tells you where you went.
 *    FAR: the page dims and lets go (150ms), the jump happens with
 *      nothing on screen to smear, and the new question arrives rising
 *      12px into place (260ms). One cut instead of a fast forward.
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
  const ease = (t: number) =>
    t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const step = (now: number) => {
    const p = Math.min(1, (now - t0) / ms);
    window.scrollTo(0, from + dist * ease(p));
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

/* ── the reader ────────────────────────────────────────────────────── */

export function Reader({
  round,
  viewport,
  onHome,
}: {
  round: SketchRound;
  viewport: SketchViewport;
  /** The Catch-up's name is the way up, at every scroll depth: the green
   *  bar carries it on a phone and the page title carries it on a laptop.
   *  Not a Back button, which he ruled out by name (para 18). */
  onHome?: () => void;
}) {
  const phone = viewport === "phone";
  const root = useRef<HTMLDivElement>(null);
  const sections = useRef<Array<HTMLElement | null>>([]);
  const headings = useRef<Array<HTMLDivElement | null>>([]);
  const [open, setOpen] = useState(false);
  const [arriving, setArriving] = useState(false);

  /* A QUESTION NOBODY ANSWERED IS NOT IN THE PUBLISHED ROUND. Not as a
     heading with nothing under it, and not as a row in the navigator that
     lands you on one.

     His rule, R21, given about an answer that was empty: "Just delete it.
     If it's empty, just delete it." A question is the same object one
     level up, and the pressure corpus is where it shows: the fixture has a
     Round whose only question nobody wrote in, and the reader drew 71px of
     heading, an "Asked by", and then the next question. A member reads
     that as a page that failed to load.

     Filtered ONCE, here, so the sections, the strip, the rail and the
     panel cannot disagree about how many questions there are -- which they
     would the moment one of them filtered and another did not. `said()` is
     the same test the answers themselves are drawn through, so a question
     whose only answers are empty counts as unanswered too. */
  const shown = useMemo(
    () => ({
      ...round,
      questions: round.questions.filter((q) => said(q.entries).length > 0),
    }),
    [round],
  );

  /* Three layouts, not two, and the third is what he asked for on
     2026-09-07: "at some point you might [want] to remove the navigation
     and swap it to the phone method of questions to save space."

       phone    the app's green bar, the strip under it, one column
       rail     two columns, the questions open in a rail on the right,
                and NO floating question: "on desktop don't have the
                question floating. I can see it in the sidebar."
       column   a laptop too narrow for both. The rail goes, and the
                strip comes back as a floating card at the top of the
                one column, exactly the phone's mechanism.

     So the rail is not a breakpoint that happens to be true at 1512; it
     is on whenever there is room for it and off whenever there is not. */
  const railFits = useRailFits();
  const mode: "phone" | "rail" | "column" = phone
    ? "phone"
    : railFits
      ? "rail"
      : "column";

  /* A picked heading lands here, clear of whatever is pinned above it,
     and this is also where a question becomes current. */
  const landing =
    mode === "phone"
      ? BAR + STRIP_REST + LANDING
      : mode === "column"
        ? STRIP_TOP_LAPTOP + STRIP_REST + LANDING
        : 40;
  /* Where a heading counts as gone, for the strip. In rail mode nothing
     docks, because nothing floats. */
  const dock =
    mode === "phone"
      ? BAR + STRIP_REST
      : mode === "column"
        ? STRIP_TOP_LAPTOP + STRIP_REST
        : 0;
  const spy = useSpy(root, sections, headings, landing, dock);

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

  const q = shown.questions[spy.current];
  const showQuestion = spy.docked && !open && q;

  const questions = shown.questions.map((question, i) => (
    <Section
      key={question.id}
      q={question}
      phone={phone}
      sectionRef={(el) => {
        sections.current[i] = el;
      }}
      headingRef={(el) => {
        headings.current[i] = el;
      }}
    />
  ));

  /* The dim-and-arrive wrapper. It holds only the answers: the strip is
     its sibling above, so the navigator never blinks.

     The gap between questions lives HERE, on the wrapper's children, and
     not on the box outside it. Outside, it applied to a list of one and
     silently did nothing, which ran every question into the one before
     it. On a phone it is 60px for a second reason: a landed heading sits
     14px under the strip, so the card above it ends 60px higher, which is
     2px behind the green bar. Nothing of the previous answer shows
     through the glass, which is the spill he named in the shipped
     version ("there's like stuff from the card above that's spilling
     onto here"). */
  const body = (
    <m.div
      className={phone ? "space-y-[60px]" : "space-y-[72px]"}
      animate={arriving ? { opacity: 0, y: 12 } : { opacity: 1, y: 0 }}
      transition={{ duration: arriving ? 0.15 : 0.26, ease: EASE_OUT_SMOOTH }}
    >
      {questions}
    </m.div>
  );

  if (phone) {
    return (
      <PhoneShell>
        <PhoneBar title={round.catchupName} position="sticky" onTitle={onHome} />
        <div ref={root} className="relative">
          {/* Zero height, sticky under the bar, so the strip and whatever
              unfolds from it overlay the page without displacing it. */}
          <div className="sticky z-30 h-0" style={{ top: BAR }}>
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
                  className="absolute inset-x-0 top-0 h-[100vh] bg-black/25"
                />
              )}
            </AnimatePresence>
            <div className="absolute inset-x-0 top-0">
              <Strip
                label={showQuestion ? q.text : <RoundMeta round={shown} />}
                docked={Boolean(showQuestion)}
                progress={spy.progress}
                open={open}
                onToggle={() => setOpen((v) => !v)}
              />
              {/* Unfolding is animated, which he asked for by name: "when
                  you pull it down, it should animate. Everything very
                  nicely." Height and opacity, and the close is faster than
                  the open so it never lags the finger. */}
              <AnimatePresence initial={false}>
                {open && (
                  <m.div
                    key="panel"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{
                      height: { duration: 0.3, ease: EASE_OUT_SMOOTH },
                      opacity: { duration: 0.16, ease: EASE_OUT_SMOOTH },
                    }}
                    className="overflow-hidden"
                  >
                    <UnfoldedPanel
                      round={shown}
                      current={spy.current}
                      within={spy.within}
                      onPick={pick}
                      maxHeight={560}
                    />
                  </m.div>
                )}
              </AnimatePresence>
            </div>
          </div>
          <div
            className="pb-16"
            style={{
              paddingTop: STRIP_REST + 20,
              paddingLeft: GUTTER,
              paddingRight: GUTTER,
            }}
          >
            {body}
          </div>
        </div>
      </PhoneShell>
    );
  }

  /* Laptop. Two columns, the reading on the left, the list on the right,
     and they FILL the page: "the margins are totally messed up ... what
     is there in the shipped version now has much better margins. It like
     fills up the screen." The shipped reader's grid is
     minmax(0,1fr) + a fixed rail inside the shell's own gutter, so this
     is that, with a wider rail because the list is set in the heading
     face now. The paragraph inside a tile still caps at 68ch (see Body);
     the photographs use the whole width. */
  /* ── the masthead ────────────────────────────────────────────────── *
   *  N11, and it is the last note of his from the first review that had
   *  not been answered: "I'm not too pleased with the title though. Like,
   *  In the Loop Round 1, 15th August. It's super basic. It works okay. I
   *  feel like we can still make it much prettier. The title. It's just
   *  not that beautiful."
   *
   *  What was actually wrong, which took looking rather than reading. The
   *  head was a name in the heading face over a MIDDLE-DOT META ROW --
   *  "Round 1 · 15 August 2026" -- which is the app's most generic
   *  construction and the one he has attacked by name three separate
   *  times: "'In the loop, Round 1', middle dot, and the date. I think
   *  that can be just laid out so much better" (R4); "You just have to add
   *  a middle dot, right? Because without a middle dot, life would be
   *  incomplete" (R32); "Does it have to be middle dots?" (R44). It also
   *  put 67px of ink in the corner of an 856px column with nothing using
   *  the width, which is why it read as a label rather than a title.
   *
   *  Three things fix it, and none of them is a bigger font. 30px stays:
   *  it is `PageHeader`'s size on every other page, and "random massive
   *  fonts" is a thing he has stopped twice (R38, R44).
   *
   *  1. THE ROUND NUMBER GOES. `architecture.md` section 5 already says
   *     it -- "No Round numbers, anywhere. A Round is identified by its
   *     date" -- on his own words, "Why do we need to have the round 4? It
   *     doesn't matter what round, it's going to be round 15." The reader
   *     was the last surface still printing one, from a decision (D51)
   *     made before the architecture was settled. With it goes the dot,
   *     and the head becomes two facts instead of three.
   *  2. THE DATE JOINS THE TITLE instead of labelling it. Same line, same
   *     face, one baseline: a masthead is a name and a date, and this is
   *     one object rather than a heading with a caption. Not at the far
   *     right of the column, which would recreate the very fault this page
   *     exists to remove -- 63 to 76% of every shipped index tile was the
   *     gap between a title at one end and a control at the other (recon
   *     I2).
   *  3. THE ROUND OPENS THE WAY ITS QUESTIONS DO. Every question below is
   *     announced by a 32px cinnamon mark. The Round is announced by the
   *     same mark at the width of the whole column: one vocabulary, two
   *     scales, so the page says "this is the whole thing, those are its
   *     parts" without a word. That is R28's line given a job -- "if we
   *     can create some use for that line, that could be good" -- and it
   *     is the abstraction he asked for rather than a new ornament (para
   *     42). It fades out to the right because 856px of solid cinnamon is
   *     twenty-seven times the ink of a question's mark and would be the
   *     loudest thing on a page of other people's writing; fading also
   *     points it the way you are about to read.
   *
   *  Above the name, never below it. A rule UNDER a masthead is a divider,
   *  and the one the shipped reader has is the one he deleted on sight:
   *  "there's a weird horizontal bar, which is barely visible, firstly.
   *  Can totally delete that" (para 27). A mark above a heading is how
   *  every question on this page already begins.
   *
   *  Considered and not taken: the Catch-up's picture as a banner here
   *  (the reader is the Round, not the Catch-up, and he rejected the
   *  picture as "this tiny hanging thing" anywhere it was decoration); the
   *  Round's photographs as a frieze (that is the cover you just tapped to
   *  get here, said twice); the date at the far right end of the rule
   *  (the stranded-gap fault above); and the date as the head of the rail
   *  (it would make the navigation the Round's masthead, which is a second
   *  identity for one object).
   *
   *  The date is printed here only in `rail` mode. In `column` mode the
   *  floating strip carries it, and the strip has a cinnamon line of its
   *  own along the top edge, so a masthead rule 30px under it would be two
   *  cinnamon lines stacked. On a phone the green bar has the name and the
   *  strip has the date, which is the same lockup at that size. Once each,
   *  per screen: "in the loop is said twice, Round 1 is said twice, the
   *  date is said twice. It's just so much horrible" (R13). */
  const head = (
    <header>
      {mode === "rail" && (
        <span
          aria-hidden
          className="block h-[2px] w-full rounded-full bg-gradient-to-r from-cinnamon to-transparent"
        />
      )}
      <div
        className={cn(
          "flex flex-wrap items-baseline gap-x-5 gap-y-1",
          mode === "rail" && "mt-5",
        )}
      >
        {/* 30px, which is what `PageHeader` sets on every other page in the
            app (Feed, Directory, Collection, Letters) and what the Support
            page hand-writes to match. A Catch-up's name is a page title, so
            it is THE page title size. */}
        <h1 className="min-w-0 font-heading text-[30px] leading-[1.2] tracking-[-0.02em] text-foreground">
          {onHome ? (
            <button
              type="button"
              onClick={onHome}
              className="text-left transition-opacity duration-150 hover:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              {round.catchupName}
            </button>
          ) : (
            round.catchupName
          )}
        </h1>
        {mode === "rail" && (
          /* The heading face, not the body's: a dateline set in the same
             type as the name is part of the title, and Libre Baskerville's
             numerals are the reason to do it here rather than anywhere
             else. 20px, which is `h3` on the documented ladder
             (DESIGN-SYSTEM section 5) -- one rung under the 24px question
             headings and two under the name. Drawn at 17 first and it read
             as a caption hung off the title rather than as half of it;
             the rung above is where the two words become one object. */
          <p className="font-heading text-[20px] leading-[1.3] text-muted-foreground">
            {longDate(round.publishedAt)}
          </p>
        )}
      </div>
    </header>
  );

  /* Narrow laptop: one column, and the phone's own instrument. The strip
     and the list it opens are one floating card here rather than a bar
     welded to the top of the screen, because there is no green app bar on
     a laptop for it to sit under. */
  if (mode === "column") {
    return (
      <DesktopShell>
        <div className="mx-auto" style={{ maxWidth: COLUMN_MAX }}>
          <div ref={root} className="relative min-w-0">
            <div className="sticky z-30 h-0" style={{ top: STRIP_TOP_LAPTOP }}>
              {open && (
                <button
                  type="button"
                  aria-label="Close the questions"
                  onClick={() => setOpen(false)}
                  className="fixed inset-0 bg-black/20"
                />
              )}
              {/* The strip floats 16px down, so without this an answer
                  slides through the gap above it on its way off the
                  screen. The page colour fades in over that gap and the
                  words disappear into it instead of being sliced by the
                  window's edge. */}
              <div
                aria-hidden
                className="absolute inset-x-0 bottom-full h-4 bg-gradient-to-t from-background to-transparent"
              />
              <div className="card-elevated absolute inset-x-0 top-0 overflow-hidden rounded-[12px] border border-border">
                <Strip
                  label={
                    spy.docked && !open && q ? (
                      q.text
                    ) : (
                      <RoundMeta round={shown} />
                    )
                  }
                  docked={Boolean(spy.docked && !open && q)}
                  progress={spy.progress}
                  open={open}
                  onToggle={() => setOpen((v) => !v)}
                />
                <AnimatePresence initial={false}>
                  {open && (
                    <m.div
                      key="panel"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{
                        height: { duration: 0.3, ease: EASE_OUT_SMOOTH },
                        opacity: { duration: 0.16, ease: EASE_OUT_SMOOTH },
                      }}
                      className="overflow-hidden"
                    >
                      <UnfoldedPanel
                        round={shown}
                        current={spy.current}
                        within={spy.within}
                        onPick={pick}
                        maxHeight={480}
                        bare
                      />
                    </m.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
            <div style={{ paddingTop: STRIP_TOP_LAPTOP + STRIP_REST + 28 }}>
              {head}
            </div>
            <div className="pb-20 pt-9">{body}</div>
          </div>
        </div>
      </DesktopShell>
    );
  }

  /* Wide laptop. Two columns, the reading on the left, the list on the
     right, and both flush to the page's own gutters at every width:
     "the margins are totally messed up ... what is there in the shipped
     version now has much better margins. It like fills up the screen."
     Past READING_MAX the reading stops growing and the gutter between
     the two columns takes the extra, so a television gets a wide spread
     instead of a 1,500px line or an island floating in the middle. */
  return (
    <DesktopShell>
      <div
        className="grid items-start"
        style={{
          gridTemplateColumns: `minmax(0,1fr) ${RAIL}px`,
          columnGap: RAIL_GAP,
        }}
      >
        <div
          ref={root}
          className="relative min-w-0"
          style={{ maxWidth: READING_MAX }}
        >
          {/* Nothing floats here. The rail beside this column already
                names the question you are in and marks it, and a second
                copy of it hovering over the answers was one thing said
                twice: "on desktop don't have the question floating. I can
                see it in the sidebar." */}
          {head}

          {/* 48px, and it is a number that has moved twice for a reason
              each time. It was 56, which he read as loose against a
              two-line head: "there's still a weirdly big gap under the
              round and date and the first orange line ... right now it
              looks totally imbalanced." It went to 36. Then the masthead
              became ONE line (see `head`) and 36 was too tight the other
              way: the head is 58px of ink and the questions keep 72px from
              one another, so a 36px gap said the title belonged to
              question one more than question one belongs to question two.
              48 sits between the head's own height and the Round's own
              rhythm, and it is the only gap on the page that is neither. */}
          <div className="pb-20 pt-12">{body}</div>
        </div>

        {/* The list, left open, fixed. Not scrolling at a tenth of the
              page's speed (R13, R23), which is the same drift the strip
              had and the same cause. */}
        <aside className="sticky self-start" style={{ top: 40 }}>
          <QuestionList
            questions={shown.questions}
            current={spy.current}
            within={spy.within}
            size="rail"
            onPick={pick}
          />
        </aside>
      </div>
    </DesktopShell>
  );
}
