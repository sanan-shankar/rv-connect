"use client";

/* ------------------------------------------------------------------ *
 *  THE PLATE - "the question is printed on green, the answers on paper"
 *
 *  Rebuilt 2026-09-06 from the one idea the owner picked out of the first
 *  ten: "There are some creative ideas worth exploring like question in
 *  the green box." The green box survived. Everything around it did not,
 *  and each fault was a decision somebody made on purpose:
 *
 *    - "Round 1" was set in 40px Baskerville as the page's headline. His
 *      answer: "why would be say Round 1 in such use font. That's good to
 *      know but that's not the name!!"
 *    - The plate carried thirteen faces, then "13 ANSWERS - 4 WITH
 *      PHOTOS", then "1 OF 11". Three counts, none of which changes what a
 *      reader does next, and the faces are the row brief para 23 already
 *      threw out: "I don't really care what the bird icons are ... I am
 *      not identifying the birds or the people. This is totally useless."
 *    - The index sat in the left column and the reading in the right.
 *      "Let the main reader be on the left column. Don't have navigation
 *      on the left."
 *    - The heart sat bottom right and the word "2 comments" bottom left,
 *      so the pair straddled the column and neither was where the feed
 *      puts it.
 *    - Every question was titled "Question 4". Brief para 27: "Do we need
 *      to say Question 1? Does it matter what number the question is?"
 *
 *  What the plate is FOR: the Catch-up's green is the one colour in this
 *  app that belongs to nothing else, so a question set in it stops being
 *  a caption above a list and becomes the room you are standing in. That
 *  is para 42's test - it could not be mistaken for another app, and it
 *  is not a repeat of anything already here. And it answers the complaint
 *  the whole rework started from (para 11): scrolled deep into an answer,
 *  the plate shrinks to a bar and stays, so the question is never gone.
 * ------------------------------------------------------------------ */

import { CaretDown, X } from "@phosphor-icons/react";
import type { SketchDirection, SketchEntry, SketchProps, SketchQuestion, SketchRound } from "../_types";
import { PhoneBar, PhoneShell, DesktopShell } from "../_shell";
import {
  Byline,
  Media,
  MetaLine,
  Photographs,
  Reactions,
  said,
  bodyType,
  lengthOf,
  longDate,
  temperOf,
} from "../_parts";

/* 700px is the letters reader's measure plus a little: 62-68 characters of
   Source Sans at 16px. The laptop layout is built OUT from this number
   rather than the number being whatever the grid had left over, which is
   how the first ten came to set 120 characters to a line. */
const MEASURE = 700;
const RAIL = 220;
const GUTTER = 30;

/* ── one answer, set to its own length ─────────────────────────────── */
function Answer({
  entry,
  first,
  phone,
}: {
  entry: SketchEntry;
  first: boolean;
  phone: boolean;
}) {
  /* `text`, not `body`: the pasted Spotify and YouTube URLs have been
     lifted out into `media` and are drawn as cards below, so printing the
     body raw would show each link twice. */
  const body = entry.text || (entry.body?.trim() ?? "");
  const type = bodyType(lengthOf(entry), phone);

  /* One tall photograph, on a screen wide enough to hold it beside the
     words. Brief para 21: "right now catch-ups also have some wasted
     space: if you upload a tall image then there's a lot of wasted space
     on the sides. But if this was something custom for every single
     thing, we could have the image on one side and then this on another
     side." A portrait photograph printed full width in a 700px column
     runs about 1,000px tall and pushes every other voice off the screen. */
  const shape = entry.photos[0];
  const ratio = shape?.width && shape?.height ? shape.width / shape.height : null;
  const asideTall = !phone && entry.images.length === 1 && ratio !== null && ratio < 0.85;

  const words = body && (
    <p className={`mt-3 whitespace-pre-line ${type.className}`} style={{ fontSize: type.fontSize, lineHeight: type.lineHeight }}>
      {body}
    </p>
  );

  return (
    <article className={first ? "pt-6" : "border-t border-border pt-6"}>
      <Byline person={entry.author} />
      {/* Always on the line below the name, never beside it. */}
      {asideTall ? (
        <div className="mt-3 grid gap-4" style={{ gridTemplateColumns: "minmax(0,1fr) 250px" }}>
          <div className="min-w-0">{words}</div>
          <Photographs entry={entry} />
        </div>
      ) : (
        <>
          {words}
          {entry.images.length > 0 && <Photographs entry={entry} className="mt-3.5" />}
        </>
      )}
      <Media items={entry.media} className="mt-3.5" />
      <Reactions entry={entry} className="mt-2.5" />
      <div className="pb-6" />
    </article>
  );
}

/* ── a question whose answers are all three words long ─────────────── *
 *  "Describe your month in 3 words" has eleven answers averaging fifteen
 *  characters. Set as eleven full-width paragraphs it reproduces para 31
 *  eleven times down one page. Set as a grid of display lines it becomes
 *  the best-looking question in the Round, and it takes a fifth of the
 *  scroll. The bird drops to 28 and the name to 14 HERE and only here,
 *  because the row it sits in is a third the height of a normal one.
 */
function TerseGrid({ question, phone }: { question: SketchQuestion; phone: boolean }) {
  return (
    <div
      className="grid gap-x-5 gap-y-6 pt-6"
      style={{ gridTemplateColumns: `repeat(${phone ? 2 : 3}, minmax(0,1fr))` }}
    >
      {question.entries.map((e) => (
        <div key={e.id} className="min-w-0">
          <Byline person={e.author} size={28} nameClassName="!text-[14px]" />
          <p
            className="mt-2 font-heading text-foreground"
            style={{ fontSize: phone ? 19 : 23, lineHeight: 1.22 }}
          >
            {e.text || e.body?.trim()}
          </p>
          <Reactions entry={e} className="mt-1.5" />
        </div>
      ))}
    </div>
  );
}

function Plate({ question, size }: { question: SketchQuestion; size: number }) {
  return (
    <div className="rounded-[14px] bg-canopy px-6 py-7 text-white">
      <h2
        className="font-heading text-white"
        style={{ fontSize: size, lineHeight: 1.22, letterSpacing: "-0.01em" }}
      >
        {question.text}
      </h2>
    </div>
  );
}

/** The plate after you have scrolled past it: one line, still green, still
 *  the question. Sticks under the phone bar so para 11 cannot happen. */
function PlateBar({ question, top }: { question: string; top: number }) {
  return (
    <div
      className="z-30 flex items-center gap-3 bg-canopy px-4 py-3 text-white"
      style={{ position: "sticky", top }}
    >
      <p className="min-w-0 flex-1 truncate font-heading text-[15px]">{question}</p>
      <CaretDown size={16} weight="bold" className="shrink-0 opacity-80" />
    </div>
  );
}

function Head({ round, big }: { round: SketchRound; big: number }) {
  return (
    <header>
      {/* The NAME is the headline. Round 1 is a fact about it. */}
      <h1
        className="font-heading text-foreground"
        style={{ fontSize: big, lineHeight: 1.1, letterSpacing: "-0.015em" }}
      >
        {round.catchupName}
      </h1>
      <MetaLine parts={[`Round ${round.number}`, longDate(round.publishedAt)]} className="mt-2.5" />
    </header>
  );
}

function Section({ q, phone }: { q: SketchQuestion; phone: boolean }) {
  const terse = temperOf(said(q.entries)) === "terse";
  return (
    <>
      {terse ? (
        <TerseGrid question={q} phone={phone} />
      ) : (
        said(q.entries).map((e, i) => (
          <Answer key={e.id} entry={e} first={i === 0} phone={phone} />
        ))
      )}
    </>
  );
}

function Reader({ round, viewport }: SketchProps) {
  const phone = viewport === "phone";

  if (phone) {
    return (
      <PhoneShell>
        <PhoneBar position="sticky" />
        <div className="px-5 pb-14 pt-7">
          <Head round={round} big={33} />
        </div>
        {round.questions.map((q) => (
          <section key={q.id}>
            {/* No PlateBar here. It is the same question the plate below
                already carries, and printing both is the fault he named:
                "Some of them have the questions repeated above every
                answer. Such horrible design." The bar exists only once the
                plate has scrolled away, which is MidScroll's drawing. */}
            <div className="px-5 pt-7">
              <Plate question={q} size={23} />
              <Section q={q} phone />
            </div>
          </section>
        ))}
        <p className="px-5 pb-12 pt-6 text-[14px] text-muted-foreground">
          Round 2 opens on 6 October.
        </p>
      </PhoneShell>
    );
  }

  /* Laptop. Two columns and only two, reader on the left. The pair is
     centred as one block rather than pinned to the gutter: the reading
     measure decides the reader's width, so the leftover has to go
     somewhere, and splitting it evenly is the one arrangement that does
     not read as a mistake. ("Literally the column on the right has a
     massive margin in the right and the one on the left has no margin on
     the left.") */
  return (
    <DesktopShell>
      <div className="mx-auto" style={{ maxWidth: MEASURE + GUTTER + RAIL }}>
        <div
          className="grid items-start"
          style={{ gridTemplateColumns: `minmax(0,${MEASURE}px) ${RAIL}px`, columnGap: GUTTER }}
        >
          <div className="min-w-0">
            <Head round={round} big={44} />
            <div className="mt-10 space-y-12">
              {round.questions.map((q) => (
                <section key={q.id}>
                  <Plate question={q} size={29} />
                  <Section q={q} phone={false} />
                </section>
              ))}
            </div>
            <p className="pt-8 text-[14px] text-muted-foreground">Round 2 opens on 6 October.</p>
          </div>

          {/* The rail: the questions, on the right, where navigation goes,
              and WITHOUT numbers (para 27). Where you are is marked by
              weight and colour, never by a status dot: "I don't like
              having a dot to show status of something." */}
          <aside className="sticky top-10">
            <ol className="space-y-3">
              {round.questions.map((q, i) => (
                <li
                  key={q.id}
                  className={`text-[13px] leading-snug ${
                    i === 0 ? "font-medium text-canopy" : "text-muted-foreground"
                  }`}
                >
                  {q.text}
                </li>
              ))}
            </ol>
          </aside>
        </div>
      </div>
    </DesktopShell>
  );
}

/** Deep in question 5, the plate reduced to its bar. */
function MidScroll({ round }: { round: SketchRound }) {
  const q = round.questions[4] ?? round.questions[0];
  const entries = said(q.entries).slice(2);
  return (
    <PhoneShell tall={false}>
      <PhoneBar position="absolute" />
      <div className="absolute inset-x-0 top-14 z-30">
        <PlateBar question={q.text} top={0} />
      </div>
      <div className="px-5 pt-[118px]">
        {entries.map((e, i) => (
          <Answer key={e.id} entry={e} first={i === 0} phone />
        ))}
      </div>
    </PhoneShell>
  );
}

/** The index, opened from the bar.
 *
 *  Deliberately NOT a 4px grab pill. His worry, verbatim: "on the top of
 *  that there's that thin pill to tap to minimise it, I'm worried about it
 *  being too small a touch target and it being annoying to minimise." The
 *  sheet is dismissed by a 44px button under the thumb that is already
 *  there. The pill stays as a hint that the sheet can be dragged; it is
 *  not the only way out. */
function NavigatorOpen({ round }: { round: SketchRound }) {
  return (
    <PhoneShell tall={false}>
      <PhoneBar position="absolute" />
      <div className="absolute inset-0 bg-black/35" />
      <div className="absolute inset-x-0 bottom-0 rounded-t-[18px] bg-card pb-5 shadow-[0_-8px_40px_rgba(0,0,0,0.18)]">
        <div className="flex justify-center pb-1 pt-2.5">
          <span className="h-1 w-9 rounded-full bg-border" />
        </div>
        <div className="flex items-center justify-between px-5 pb-1 pt-1">
          <h3 className="font-heading text-[18px] text-foreground">Questions</h3>
          <button
            type="button"
            aria-label="Close"
            className="state-layer -mr-2 grid h-11 w-11 shrink-0 place-items-center rounded-full text-muted-foreground"
          >
            <X size={20} weight="bold" />
          </button>
        </div>
        <ol
          className="max-h-[560px] overflow-hidden px-5"
          style={{
            maskImage: "linear-gradient(to bottom, black 88%, transparent 100%)",
            WebkitMaskImage: "linear-gradient(to bottom, black 88%, transparent 100%)",
          }}
        >
          {round.questions.map((q, i) => (
            <li key={q.id} className={`py-3.5 ${i === 0 ? "" : "border-t border-border"}`}>
              <span
                className={`text-[15px] leading-snug ${
                  i === 4 ? "font-medium text-canopy" : "text-foreground"
                }`}
              >
                {q.text}
              </span>
            </li>
          ))}
        </ol>
      </div>
    </PhoneShell>
  );
}

export const plate: SketchDirection = {
  slug: "plate",
  name: "The question is printed on green",
  thesis:
    "The Catch-up's own green carries the question and nothing else, so the question is the room you are standing in. Scroll past it and the plate becomes a bar that stays.",
  Reader,
  MidScroll,
  NavigatorOpen,
};
