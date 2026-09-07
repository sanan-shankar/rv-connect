"use client";

/* ------------------------------------------------------------------ *
 *  The front runner: one reader, live.
 *
 *  What it bets. Every rejected design spent its invention on the
 *  answers. He kept saying the answers were fine: "The tiles are tried and
 *  tested across the app" (brief para 27), "I like the question font.
 *  Decent" (R37), "Everything in its separate tile. And the navigation
 *  stays on screen, which is something you don't seem to have got right"
 *  (R37). What no design solved was moving through the thing. So the
 *  answers here are quiet and correct, and the one bespoke object is the
 *  strip under the bar, which is the navigator (_navigator.tsx).
 *
 *  Why it is live and not a still. "A mobile navigation cannot be judged
 *  from a PNG" (handover, D21). The strip has to dock, the line has to
 *  grow, and a tap on a question has to glide there slower than a jump
 *  (R37: "too jumpy. It could be slower"). So the tall phone drawing
 *  really scrolls, spies on its own headings, and opens.
 *
 *  The page, top to bottom, on a phone:
 *
 *    the app's green bar, with the Catch-up's name where the wordmark is
 *    the strip: "Round 1 · 15 August 2026", or the question you are in
 *    a question: a short cinnamon mark, the heading in the heading face,
 *      "Asked by" when a member wrote it
 *    its answers, each a tile: bird, name, the words, the pictures bled to
 *      the tile's edges, a small card for a pasted link, heart and replies
 *    the next question
 *
 *  Nothing else. No masthead (the bar and the strip are the masthead, so
 *  the first screen holds a whole answer, which the shipped reader's does
 *  not: recon R18). No row of birds, no "13 wrote in", no question
 *  numbers, no timestamps, nothing about Round 2, no rule under anything.
 *
 *  On a laptop the same page sits in a 600px column with the list of
 *  questions left open in a fixed rail on the RIGHT (R22), the pair
 *  centred as one block so the margins match. The strip floats over the
 *  column only once a heading has gone, because the rail already names
 *  the question at rest.
 * ------------------------------------------------------------------ */

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import type { SketchEntry, SketchQuestion, SketchRound, SketchViewport } from "./_types";
import { VIEWPORT_WIDTH } from "./_types";
import { PhoneBar, PhoneShell, DesktopShell } from "./_shell";
import { AskedBy, Body, Byline, Media, Photographs, Reactions, said } from "./_parts";
import { BAR, QuestionList, RoundMeta, Strip, UnfoldedPanel } from "./_navigator";

/** The phone's page gutter, the app's own. */
export const GUTTER = 20;
/** The laptop's reading column: 80 characters of the body size inside the
 *  tile's padding. Built OUT from the measure, not left over by a grid. */
export const MEASURE = 600;
export const RAIL = 260;
export const RAIL_GAP = 48;
/** The strip at rest is one line: 44px. Content starts under it. */
const STRIP_REST = 44;
const STRIP_TOP_LAPTOP = 16;
/** Where a heading lands after a pick: a breath under the bar. */
const LANDING = 16;

/* ── one answer ────────────────────────────────────────────────────── *
 *  A short answer gets a tight tile, not a smaller one and not bigger
 *  type. Both of those were drawn and rejected ("made super small because
 *  the answer was short. Don't like that"; "the 'enough padel to conclude
 *  squash is better' tile is atrocious on mobile", R14). What made his
 *  three-word tile 85% empty (para 31) was 26px of padding, a two-line
 *  byline and a thick band under the heart. Here the byline is one line,
 *  the words sit 10px under the name (R20: "the name is close to their
 *  answer"), and the heart is 6px under the words. */
export function Tile({ entry, phone }: { entry: SketchEntry; phone: boolean }) {
  const body = entry.text || (entry.body?.trim() ?? "");
  return (
    <article className="card-elevated overflow-hidden rounded-[var(--radius)] border border-border bg-card">
      <div className="px-4 pt-3.5">
        <Byline person={entry.author} />
        {body && <Body text={body} phone={phone} className="mt-2.5" />}
      </div>
      {entry.images.length > 0 && (
        <Photographs entry={entry} className="mt-3" maxHeight={phone ? 460 : 520} />
      )}
      {entry.media.length > 0 && <Media items={entry.media} className="mx-4 mt-3" />}
      <div className="px-4 pb-2 pt-1.5">
        <Reactions entry={entry} />
      </div>
    </article>
  );
}

/* ── one question and its answers ──────────────────────────────────── *
 *  The mark above the heading is the same cinnamon as the line on the
 *  strip: when the heading docks, this is the line that grows. Between
 *  questions there is air and the mark, not a rule (para 27: "Can totally
 *  delete that"). */
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
          style={{ fontSize: phone ? 24 : 30, lineHeight: 1.2, letterSpacing: "-0.015em" }}
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
 *  Read off the real headings on every scroll frame, in the frame's own
 *  coordinates, so it holds inside the scaled drawing and on his phone at
 *  1:1 alike.
 *
 *  Two lines, and the difference between them was found by looking, not
 *  reasoning: the first version used one line at the bar's foot, so a
 *  picked question landed with its heading under the strip while the
 *  strip still named the question before it, two questions stacked.
 *
 *  `line` is where a question becomes CURRENT: the strip's foot plus the
 *  breath a picked heading lands at, so landing on a question makes it
 *  current at once. `dock` is where a heading has GONE: under the strip's
 *  foot. While the current question's heading is still on screen the
 *  strip shows the Round, which is the same state as the top of the page;
 *  once the heading passes `dock` the strip takes the question. `within`
 *  is how far through the current question's answers the line is, and
 *  `progress` how far through the whole Round. */
type Spy = { current: number; docked: boolean; within: number; progress: number };

function useSpy(
  root: React.RefObject<HTMLDivElement | null>,
  sections: React.MutableRefObject<Array<HTMLElement | null>>,
  headings: React.MutableRefObject<Array<HTMLDivElement | null>>,
  frameWidth: number,
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
      const rect = el.getBoundingClientRect();
      const scale = rect.width / frameWidth || 1;
      const scrolled = -rect.top / scale;
      const line = scrolled + lineOffset;
      const dock = scrolled + dockOffset;

      let current = 0;
      for (let i = 0; i < sections.current.length; i += 1) {
        const s = sections.current[i];
        if (s && s.offsetTop <= line + 4) current = i;
      }
      const s = sections.current[current];
      const h = headings.current[current];
      const docked = Boolean(s && h && scrolled > 0 && h.offsetTop + h.offsetHeight <= dock);
      const within = s ? Math.max(0, Math.min(1, (line - s.offsetTop) / Math.max(1, s.offsetHeight))) : 0;
      const travel = Math.max(1, el.offsetHeight - window.innerHeight / scale);
      const progress = Math.max(0, Math.min(1, scrolled / travel));

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
  }, [root, sections, headings, frameWidth, lineOffset, dockOffset]);

  return spy;
}

/* ── going somewhere ───────────────────────────────────────────────── *
 *  Not `scrollIntoView`. A native smooth scroll covers 8,000px in the
 *  time it covers 800, which is the "too jumpy" he named (R37). This one
 *  takes longer for a longer trip, to a ceiling, and eases both ends so
 *  the eye can pick the movement up (the same reasoning motion.tsx gives
 *  for EASE_IN_OUT_SCENE on a viewport-scale move). */
function glideTo(root: HTMLElement, localY: number, frameWidth: number) {
  const rect = root.getBoundingClientRect();
  const scale = rect.width / frameWidth || 1;
  const start = window.scrollY;
  const target = start + rect.top + localY * scale;
  const dist = target - start;
  const ms = Math.min(950, 420 + Math.abs(dist) * 0.05);
  const t0 = performance.now();
  const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const step = (now: number) => {
    const p = Math.min(1, (now - t0) / ms);
    window.scrollTo(0, start + dist * ease(p));
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

  const frameWidth = phone ? VIEWPORT_WIDTH.phone : MEASURE;
  /* A picked heading lands here, under the bar and the resting strip on
     a phone, at the gutter on a laptop; and this is where a question
     becomes current. */
  const landing = phone ? BAR + STRIP_REST + LANDING : 40;
  /* Where a heading counts as gone: under the strip's foot on a phone,
     under the floating strip's top on a laptop. */
  const dock = phone ? BAR + STRIP_REST : STRIP_TOP_LAPTOP;
  const spy = useSpy(root, sections, headings, frameWidth, landing, dock);

  /* Scrolling puts the list away, so a pick can close it first and glide. */
  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    window.addEventListener("scroll", close, { passive: true });
    return () => window.removeEventListener("scroll", close);
  }, [open]);

  const pick = useCallback(
    (i: number) => {
      setOpen(false);
      const el = root.current;
      const s = sections.current[i];
      if (!el || !s) return;
      glideTo(el, s.offsetTop - landing, frameWidth);
    },
    [landing, frameWidth]
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

  if (phone) {
    return (
      <PhoneShell>
        <PhoneBar title={round.catchupName} position="sticky" />
        <div ref={root} className="relative">
          {/* Zero height, sticky under the bar, so the strip and everything
              that unfolds from it overlays the page without displacing it. */}
          <div className="sticky z-30 h-0" style={{ top: BAR }}>
            {open && (
              <button
                type="button"
                aria-label="Close the questions"
                onClick={() => setOpen(false)}
                className="absolute inset-x-0 top-0 h-[100vh] bg-black/25"
              />
            )}
            <div className="absolute inset-x-0 top-0">
              <Strip
                label={showQuestion ? q.text : <RoundMeta round={round} />}
                docked={Boolean(showQuestion)}
                progress={spy.progress}
                open={open}
                onToggle={() => setOpen((v) => !v)}
              />
              {open && (
                <UnfoldedPanel
                  round={round}
                  current={spy.current}
                  within={spy.within}
                  onPick={pick}
                  maxHeight={620}
                />
              )}
            </div>
          </div>
          <div className="space-y-10 pb-16" style={{ paddingTop: STRIP_REST + 20, paddingLeft: GUTTER, paddingRight: GUTTER }}>
            {questions}
          </div>
        </div>
      </PhoneShell>
    );
  }

  return (
    <DesktopShell>
      <div className="mx-auto" style={{ width: MEASURE + RAIL_GAP + RAIL }}>
        <div
          className="grid items-start"
          style={{ gridTemplateColumns: `${MEASURE}px ${RAIL}px`, columnGap: RAIL_GAP }}
        >
          <div ref={root} className="relative min-w-0">
            <div className="sticky z-30 h-0" style={{ top: STRIP_TOP_LAPTOP }}>
              <div
                className={cn(
                  "absolute inset-x-0 top-0 transition-opacity duration-200",
                  spy.docked && q ? "opacity-100" : "pointer-events-none opacity-0"
                )}
              >
                <Strip label={q?.text ?? ""} docked progress={spy.progress} floating interactive={false} />
              </div>
            </div>
            <h1
              className="font-heading text-foreground"
              style={{ fontSize: 34, lineHeight: 1.1, letterSpacing: "-0.015em" }}
            >
              {round.catchupName}
            </h1>
            <p className="mt-2 text-[14px] text-muted-foreground">
              <RoundMeta round={round} />
            </p>
            <div className="mt-9 space-y-12 pb-16">{questions}</div>
          </div>

          {/* The list, left open. Fixed: it does not scroll at a tenth of
              the page's speed (R13, R23). */}
          <aside className="sticky" style={{ top: 40 }}>
            <QuestionList
              questions={round.questions}
              current={spy.current}
              within={spy.within}
              size="rail"
              onPick={pick}
            />
          </aside>
        </div>
      </div>
    </DesktopShell>
  );
}
