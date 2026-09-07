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
 *    the strip: "Round 1 · 15 August 2026", or the question you are in
 *    a question: a short cinnamon mark, the heading, "Asked by" when a
 *      member wrote it
 *    its answers, each a tile
 *    the next question
 *
 *  No masthead (the bar and the strip are the masthead, so the first
 *  screen holds a whole answer, which the shipped reader's does not).
 *  No row of birds, no counts, no question numbers, no timestamps,
 *  nothing about Round 2, no rule under anything.
 * ------------------------------------------------------------------ */

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, m } from "motion/react";
import { EASE_OUT_SMOOTH } from "@/components/common/motion";
import { cn } from "@/lib/utils";
import type { SketchEntry, SketchQuestion, SketchRound, SketchViewport } from "./_types";
import { PhoneBar, PhoneShell, DesktopShell } from "./_shell";
import { AskedBy, Body, Byline, Media, Photographs, Reactions, said } from "./_parts";
import { BAR, QuestionList, RoundMeta, Strip, UnfoldedPanel } from "./_navigator";

/** The phone's page gutter, the app's own. */
export const GUTTER = 20;
/** The laptop's rail. Wider than the shipped 220 because the list is set
 *  in the heading face now, which he asked for and which needs the room. */
export const RAIL = 300;
export const RAIL_GAP = 56;
/** The strip at rest is one line: 44px. */
const STRIP_REST = 44;
const STRIP_TOP_LAPTOP = 16;
/** A picked heading lands this far under the strip. */
const LANDING = 14;

/* ── one answer ────────────────────────────────────────────────────── *
 *  A short answer gets a tight tile, not a smaller one and not bigger
 *  type. Both of those were drawn and rejected. What made his three-word
 *  tile 85% empty (brief para 31) was 26px of padding, a two-line byline
 *  and a thick band under the heart. Here the byline is one line, the
 *  words sit 10px under the name (R20: "the name is close to their
 *  answer"), and the heart is 6px under the words. */
export function Tile({ entry, phone }: { entry: SketchEntry; phone: boolean }) {
  const body = entry.text || (entry.body?.trim() ?? "");
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
        <Photographs entry={entry} className="mt-3" maxHeight={phone ? 460 : 560} />
      )}
      {entry.media.length > 0 && (
        <Media items={entry.media} className={phone ? "mx-4 mt-3" : "mx-5 mt-3"} />
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
        <span aria-hidden className="block h-[2px] w-8 rounded-full bg-cinnamon" />
        <h2
          className="mt-3 font-heading text-foreground"
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
type Spy = { current: number; docked: boolean; within: number; progress: number };

function useSpy(
  root: React.RefObject<HTMLDivElement | null>,
  sections: React.MutableRefObject<Array<HTMLElement | null>>,
  headings: React.MutableRefObject<Array<HTMLDivElement | null>>,
  lineOffset: number,
  dockOffset: number
): Spy {
  const [spy, setSpy] = useState<Spy>({ current: 0, docked: false, within: 0, progress: 0 });

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
        s && h && top < 0 && h.getBoundingClientRect().bottom <= dockOffset
      );
      const within = s
        ? Math.max(0, Math.min(1, (lineOffset - sTop) / Math.max(1, s.offsetHeight)))
        : 0;
      const travel = Math.max(1, el.offsetHeight - window.innerHeight);
      const progress = Math.max(0, Math.min(1, -top / travel));

      setSpy((prev) =>
        prev.current === current &&
        prev.docked === docked &&
        Math.abs(prev.within - within) < 0.005 &&
        Math.abs(prev.progress - progress) < 0.002
          ? prev
          : { current, docked, within, progress }
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
  const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const step = (now: number) => {
    const p = Math.min(1, (now - t0) / ms);
    window.scrollTo(0, from + dist * ease(p));
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

/* ── the reader ────────────────────────────────────────────────────── */

export function Reader({ round, viewport }: { round: SketchRound; viewport: SketchViewport }) {
  const phone = viewport === "phone";
  const root = useRef<HTMLDivElement>(null);
  const sections = useRef<Array<HTMLElement | null>>([]);
  const headings = useRef<Array<HTMLDivElement | null>>([]);
  const [open, setOpen] = useState(false);
  const [arriving, setArriving] = useState(false);

  /* A picked heading lands here, under the bar and the resting strip on a
     phone, at the gutter on a laptop; and this is where a question
     becomes current. */
  const landing = phone ? BAR + STRIP_REST + LANDING : 40;
  /* Where a heading counts as gone: under the strip's foot. */
  const dock = phone ? BAR + STRIP_REST : STRIP_TOP_LAPTOP + STRIP_REST;
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
    [landing]
  );

  const q = round.questions[spy.current];
  const showQuestion = spy.docked && !open && q;

  const questions = round.questions.map((question, i) => (
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
        <PhoneBar title={round.catchupName} position="sticky" />
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
                label={showQuestion ? q.text : <RoundMeta round={round} />}
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
                      round={round}
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
            style={{ paddingTop: STRIP_REST + 20, paddingLeft: GUTTER, paddingRight: GUTTER }}
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
  return (
    <DesktopShell>
      <div
        className="grid items-start"
        style={{ gridTemplateColumns: `minmax(0,1fr) ${RAIL}px`, columnGap: RAIL_GAP }}
      >
        <div ref={root} className="relative min-w-0">
          <div className="sticky z-30 h-0" style={{ top: STRIP_TOP_LAPTOP }}>
            <div
              className={cn(
                "absolute inset-x-0 top-0 transition-opacity duration-200",
                spy.docked && q ? "opacity-100" : "pointer-events-none opacity-0"
              )}
            >
              <Strip
                label={q?.text ?? ""}
                docked
                progress={spy.progress}
                floating
                interactive={false}
              />
            </div>
          </div>

          {/* The title. His: "In the Loop Round 1, 15th August. It's super
              basic ... I feel like we can still make it much prettier."
              The name is the headline and stays the headline (R30: "why
              would we say Round 1 in such use font. That's good to know
              but that's not the name!!"). What lifts it is the meta: the
              Round is set in the same cinnamon as the measure that runs
              down the whole reader, so the page opens on the colour it is
              going to keep using, and the date stays quiet beside it. */}
          <header>
            {/* 30px, which is what `PageHeader` sets on every other page in
                the app (Feed, Directory, Collection, Letters) and what the
                Support page hand-writes to match. It was 44, and he was
                right about it: "make sure in the loop isn't some absurdly
                large font and fits the sizes in the rest of the ui." A
                Catch-up's name is a page title, so it is THE page title
                size, and the questions under it drop to the scale's h2 so
                the two are a step apart rather than the same size. */}
            <h1
              className="font-heading text-[30px] leading-[1.2] tracking-[-0.02em] text-foreground"
            >
              {round.catchupName}
            </h1>
            <p className="mt-2.5 flex items-center gap-2 text-[14px]">
              <span className="font-medium text-cinnamon">Round {round.number}</span>
              <span className="dotsep" aria-hidden>
                ·
              </span>
              <span className="text-muted-foreground">
                {new Date(round.publishedAt).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </span>
            </p>
          </header>

          {/* 56px, and it is the same distance the questions keep from one
              another, so the first mark is not an odd beat: "there's a
              weird spacing on Round one and then the first cinnamon line
              is, it doesn't look visually balanced." */}
          <div className="pb-20 pt-14">{body}</div>
        </div>

        {/* The list, left open, fixed. Not scrolling at a tenth of the
            page's speed (R13, R23), which is the same drift the strip had
            and the same cause. */}
        <aside className="sticky self-start" style={{ top: 40 }}>
          <QuestionList
            questions={round.questions}
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
