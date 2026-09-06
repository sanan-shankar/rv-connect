"use client";

/* ------------------------------------------------------------------ *
 *  THE RIDER - "the question rides with you"
 *
 *  Every other direction is a bet about how a Round LOOKS. This one is a
 *  bet about how you move through it, because that is what he complains
 *  about most and at greatest length:
 *
 *    para 11: "say I scroll to one point ... I click one question, say I
 *    click question 8, and now I go to question 8 and that's it. I can't
 *    navigate anymore ... And then I have to scroll all the way to the
 *    top to navigate to a different question. There should definitely be
 *    a much neater way to do this. Come on, what if Revolut did this?"
 *
 *    para 11 again: "At some point I scroll on a question, and then I
 *    don't even know what the question is, on my phone."
 *
 *    para 34: "there's no way to navigate on phone apart from when
 *    you're at the top of the page ... just be super creative and solve
 *    that problem."
 *
 *    para 17: "for mobile navigation, I'm thinking maybe we could just
 *    have some kind of thing that you can tap and then it takes over a
 *    part of the screen and then you can navigate."
 *
 *  So: one bar, at the foot of the screen, always there, always naming
 *  the question you are inside. Tap it and it takes over the lower half.
 *  It is where a thumb already rests, which the top of a phone is not,
 *  and it is the same object on a laptop rather than a second design.
 *
 *  What it is NOT: the horizontal strip of pills that exists today.
 *  "the bar that you scroll horizontally and reach different questions is
 *  super janky. It looks so bad, and it's within this boxed rectangle,
 *  and the pills getting cut off, all of that looks so bad."
 *
 *  How far through you are is drawn as a filled rule along the bar's top
 *  edge, never as a dot: "I don't like having a dot to show status of
 *  something." The rule is also the only place a count survives, and it
 *  survives as a length rather than a number, because "11 of 13 answers"
 *  is the kind of fact para 27 threw out.
 * ------------------------------------------------------------------ */

import { CaretUp, X } from "@phosphor-icons/react";
import type { SketchDirection, SketchEntry, SketchProps, SketchQuestion, SketchRound } from "../_types";
import { PhoneBar, PhoneShell, DesktopShell } from "../_shell";
import {
  Byline,
  Media,
  MetaLine,
  Photographs,
  Reactions,
  RoundFoot,
  AskedBy,
  Body,
  said,
  StickyFoot,
  bodyType,
  lengthOf,
  longDate,
  temperOf,
} from "../_parts";

/** Letters' own measure. This direction spends its invention on the bar,
 *  so the reading is the app's most ordinary shape on purpose. */
const MEASURE = 760;

function Answer({ entry, phone }: { entry: SketchEntry; phone: boolean }) {
  const body = entry.text || (entry.body?.trim() ?? "");
  const type = bodyType(lengthOf(entry), phone);
  return (
    <article className="pt-7">
      <Byline person={entry.author} />
      {body && (
        <Body
          text={body}
          fontSize={type.fontSize}
          lineHeight={type.lineHeight}
          className={`mt-3 ${type.className}`}
        />
      )}
      <Media items={entry.media} className="mt-3.5" />
      {entry.images.length > 0 && <Photographs entry={entry} className="mt-3.5" />}
      <Reactions entry={entry} className="mt-2.5" />
    </article>
  );
}

function Section({ q, phone }: { q: SketchQuestion; phone: boolean }) {
  const terse = temperOf(said(q.entries)) === "terse";
  return (
    <section className="pt-14 first:pt-0">
      <h2
        className="font-heading text-foreground"
        style={{ fontSize: phone ? 24 : 31, lineHeight: 1.2, letterSpacing: "-0.015em" }}
      >
        {q.text}
      </h2>
      <AskedBy question={q} className="mt-2.5" />
      {terse ? (
        <div
          className="grid gap-x-6 gap-y-7 pt-7"
          style={{ gridTemplateColumns: `repeat(${phone ? 2 : 3}, minmax(0,1fr))` }}
        >
          {said(q.entries).map((e) => (
            <div key={e.id} className="min-w-0">
              <Byline person={e.author} size={28} nameClassName="!text-[14px]" />
              <p
                className="mt-2 font-heading text-foreground"
                style={{ fontSize: phone ? 19 : 22, lineHeight: 1.2 }}
              >
                {e.text || e.body?.trim()}
              </p>
              <Reactions entry={e} className="mt-1.5" />
            </div>
          ))}
        </div>
      ) : (
        said(q.entries).map((e) => <Answer key={e.id} entry={e} phone={phone} />)
      )}
    </section>
  );
}

/** The bar. Green, because it is the Catch-up's own colour and this is
 *  the Catch-up's own control; it appears on no other surface in the app,
 *  which is the para 42 test. */
function Rider({
  question,
  progress,
  floating = false,
}: {
  question: string;
  /** 0 to 1, drawn as a length along the top edge. */
  progress: number;
  /** Laptop: the bar sits above the page rather than welded to the edge. */
  floating?: boolean;
}) {
  return (
    <div
      className={
        floating
          ? "overflow-hidden rounded-[14px] bg-canopy text-white shadow-[0_10px_34px_-12px_rgba(0,0,0,0.5)]"
          : "overflow-hidden bg-canopy text-white"
      }
    >
      <div className="h-[3px] w-full bg-white/20">
        <div className="h-full bg-white/85" style={{ width: `${Math.round(progress * 100)}%` }} />
      </div>
      <div className="flex items-center gap-3 px-4 py-3.5">
        <p className="min-w-0 flex-1 truncate font-heading text-[15px]">{question}</p>
        <CaretUp size={17} weight="bold" className="shrink-0 opacity-85" />
      </div>
    </div>
  );
}

function Head({ round, phone }: { round: SketchRound; phone: boolean }) {
  return (
    <header>
      <h1
        className="font-heading text-foreground"
        style={{ fontSize: phone ? 34 : 46, lineHeight: 1.08, letterSpacing: "-0.018em" }}
      >
        {round.catchupName}
      </h1>
      <MetaLine parts={[`Round ${round.number}`, longDate(round.publishedAt)]} className="mt-2.5" />
    </header>
  );
}

function Reader({ round, viewport }: SketchProps) {
  const phone = viewport === "phone";

  if (phone) {
    return (
      <PhoneShell>
        <PhoneBar position="sticky" />
        {/* First child, zero height: see StickyFoot in _parts.tsx for why a
            bottom-sticky last child does nothing. */}
        <StickyFoot>
          <Rider question={round.questions[0].text} progress={0.06} />
        </StickyFoot>
        <div className="px-5 pb-24 pt-8">
          <Head round={round} phone />
          <div className="pt-4">
            {round.questions.map((q) => (
              <Section key={q.id} q={q} phone />
            ))}
          </div>
          <RoundFoot nextOpens="6 October" className="mt-14" />
        </div>
      </PhoneShell>
    );
  }

  /* Laptop: the app's CENTERED column, which is what Letters, About and a
     member's profile already use for anything that reads top to bottom.
     The bar becomes a floating one above the foot of the same column, so
     it is recognisably the same object and not a second design. */
  return (
    <DesktopShell>
      <StickyFoot offset={24}>
        <div className="mx-auto" style={{ maxWidth: MEASURE }}>
          <Rider question={round.questions[0].text} progress={0.06} floating />
        </div>
      </StickyFoot>
      <div className="mx-auto" style={{ maxWidth: MEASURE }}>
        <Head round={round} phone={false} />
        <div className="pt-6">
          {round.questions.map((q) => (
            <Section key={q.id} q={q} phone={false} />
          ))}
        </div>
        <RoundFoot nextOpens="6 October" className="mt-16" />
      </div>
    </DesktopShell>
  );
}

/** Deep in question 5. The bar has not moved and still names it. */
function MidScroll({ round }: { round: SketchRound }) {
  const q = round.questions[4] ?? round.questions[0];
  return (
    <PhoneShell tall={false}>
      <PhoneBar position="absolute" />
      <div className="px-5 pt-[76px]">
        {said(q.entries).slice(2).map((e) => (
          <Answer key={e.id} entry={e} phone />
        ))}
      </div>
      <div className="absolute inset-x-0 bottom-0 z-30">
        <Rider question={q.text} progress={0.42} />
      </div>
    </PhoneShell>
  );
}

/** Tapped, the bar grows into the lower half of the screen. Para 17's
 *  own words: "some kind of thing that you can tap and then it takes over
 *  a part of the screen and then you can navigate."
 *
 *  The bar is still there at the foot, still green, still the same
 *  object, so the way out is the thing you tapped rather than a 4px pill
 *  at the top: "I'm worried about it being too small a touch target and
 *  it being annoying to minimise." */
function NavigatorOpen({ round }: { round: SketchRound }) {
  const current = 4;
  return (
    <PhoneShell tall={false}>
      <PhoneBar position="absolute" />
      <div className="px-5 pt-[76px] opacity-40">
        {said((round.questions[4] ?? round.questions[0]).entries).slice(2, 4).map((e) => (
          <Answer key={e.id} entry={e} phone />
        ))}
      </div>
      <div className="absolute inset-0 bg-black/30" />
      <div className="absolute inset-x-0 bottom-0 z-30 overflow-hidden rounded-t-[18px] bg-canopy text-white">
        <div className="flex items-center justify-between px-5 pb-1 pt-4">
          <h3 className="font-heading text-[17px] text-white">Jump to</h3>
          <button
            type="button"
            aria-label="Close"
            className="-mr-2 grid h-11 w-11 place-items-center rounded-full text-white/80"
          >
            <X size={20} weight="bold" />
          </button>
        </div>
        <ol
          className="max-h-[430px] overflow-hidden px-5 pb-4"
          style={{
            maskImage: "linear-gradient(to bottom, black 84%, transparent 100%)",
            WebkitMaskImage: "linear-gradient(to bottom, black 84%, transparent 100%)",
          }}
        >
          {round.questions.map((q, i) => (
            <li key={q.id} className={`py-3 ${i === 0 ? "" : "border-t border-white/15"}`}>
              <span
                className={`text-[15px] leading-snug ${
                  i === current ? "font-semibold text-white" : "text-white/70"
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

export const rider: SketchDirection = {
  slug: "rider",
  name: "The question rides with you",
  thesis:
    "One green bar at the foot of the screen, always naming the question you are in, always in reach of a thumb. Tap it and it grows into the index. The reading itself stays the app's plainest column.",
  Reader,
  MidScroll,
  NavigatorOpen,
};
