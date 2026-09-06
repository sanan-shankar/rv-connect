"use client";

/* ------------------------------------------------------------------ *
 *  THE SPREAD - "each question is laid out for what it actually is"
 *
 *  The bet: eleven questions in one Round are eleven different design
 *  problems, and printing them all through one template is what makes the
 *  reader boring no matter how nice the template is.
 *
 *  This Round, measured (see /tmp probe, 2026-09-06):
 *
 *    "Describe your month in 3 words"      11 answers, median 24 characters
 *    "Who believes Sanan made this?"       11 answers, median 33
 *    "Are you a rider? Are you seeing..."  12 answers, median 27, 5 photos
 *    "How has RV shaped your relationship  10 answers, median 373
 *     with AI"
 *    "Songs you've had on repeat"          13 answers, 4 carrying links
 *    "What's something creative"           12 answers, 6 photos
 *
 *  Three words and 373 words are not the same object. Set identically,
 *  the terse ones produce para 31 eleven times over ("only about 15% of
 *  the real estate is used, and the rest is just white space") and the
 *  long ones produce a wall. So the page reads the content and picks:
 *
 *    terse   a grid of display lines, two up on a phone, four on a laptop
 *    media   the resolved Spotify and YouTube cards, two up
 *    photos  the photographs lead and the words sit under them
 *    else    a column, two up on a laptop because each answer is a
 *            discrete block rather than flowing prose
 *
 *  This is para 21 pointed at the reader rather than at the PDF: "a lot
 *  of layout rules that are very rapidly adjusting to the content it's
 *  receiving ... as if we shipped all the content to someone at Vogue,
 *  and had their graphic designer, and I'm the lead editor, lay it out."
 *
 *  Nothing separates one question from the next but air. Brief para 27 on
 *  the rule that used to: "there's a weird horizontal bar, which is
 *  barely visible, firstly. Can totally delete that." Fantastic Man makes
 *  the same call and pares its folios back to almost nothing; the space
 *  does the work a hairline was doing badly.
 * ------------------------------------------------------------------ */

import { List, X } from "@phosphor-icons/react";
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

type Setting = "terse" | "media" | "photos" | "column";

/** What kind of design problem is this question? Read off the answers,
 *  never off the prompt's category, because the category is what the
 *  Keeper picked and the answers are what people actually did. */
function settingFor(q: SketchQuestion): Setting {
  const withMedia = said(q.entries).filter((e) => e.media.length > 0).length;
  const withPhotos = said(q.entries).filter((e) => e.images.length > 0).length;
  if (withMedia >= 2) return "media";
  if (withPhotos >= said(q.entries).length / 2.5) return "photos";
  if (temperOf(said(q.entries)) === "terse") return "terse";
  return "column";
}

function Heading({ text, phone }: { text: string; phone: boolean }) {
  return (
    <h2
      className="font-heading text-foreground"
      style={{
        fontSize: phone ? 26 : 38,
        lineHeight: 1.16,
        letterSpacing: "-0.018em",
        maxWidth: phone ? undefined : 880,
      }}
    >
      {text}
    </h2>
  );
}

/* ── the four settings ─────────────────────────────────────────────── */

function Terse({ q, phone }: { q: SketchQuestion; phone: boolean }) {
  return (
    <div
      className="grid gap-x-6 gap-y-7"
      style={{ gridTemplateColumns: `repeat(${phone ? 2 : 4}, minmax(0,1fr))` }}
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
  );
}

function Block({ entry, phone, size }: { entry: SketchEntry; phone: boolean; size?: number }) {
  const body = entry.text || (entry.body?.trim() ?? "");
  const type = bodyType(lengthOf(entry), phone);
  return (
    <article className="min-w-0 break-inside-avoid">
      <Byline person={entry.author} />
      {body && (
        <p
          className={`mt-3 whitespace-pre-line ${type.className}`}
          style={{ fontSize: size ?? type.fontSize, lineHeight: type.lineHeight }}
        >
          {body}
        </p>
      )}
      <Media items={entry.media} className="mt-3.5" />
      {entry.images.length > 0 && <Photographs entry={entry} className="mt-3.5" />}
      <Reactions entry={entry} className="mt-2.5" />
    </article>
  );
}

/** Photographs lead. The words become the caption rather than the other
 *  way round, which is the only honest arrangement when two thirds of the
 *  answers to a question are pictures of food. */
function Photos({ q, phone }: { q: SketchQuestion; phone: boolean }) {
  const withPhotos = said(q.entries).filter((e) => e.images.length > 0);
  const rest = said(q.entries).filter((e) => e.images.length === 0);
  return (
    <>
      <div
        className="grid gap-x-6 gap-y-8"
        style={{ gridTemplateColumns: `repeat(${phone ? 1 : 2}, minmax(0,1fr))` }}
      >
        {withPhotos.map((e) => {
          const body = e.text || (e.body?.trim() ?? "");
          return (
            <article key={e.id} className="min-w-0">
              <Photographs entry={e} radius={12} />
              <div className="mt-3">
                <Byline person={e.author} />
                {body && (
                  <p
                    className="mt-2.5 whitespace-pre-line text-foreground"
                    style={{ fontSize: phone ? 15 : 15.5, lineHeight: 1.6 }}
                  >
                    {body}
                  </p>
                )}
                <Reactions entry={e} className="mt-2" />
              </div>
            </article>
          );
        })}
      </div>
      {rest.length > 0 && (
        <div
          className={phone ? "mt-9 space-y-9" : "mt-10"}
          style={phone ? undefined : { columnCount: 2, columnGap: 36 }}
        >
          {rest.map((e) => (
            <div key={e.id} className={phone ? "" : "mb-9 break-inside-avoid"}>
              <Block entry={e} phone={phone} />
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function Column({ q, phone }: { q: SketchQuestion; phone: boolean }) {
  /* Two up on a laptop, and CSS columns rather than a grid.
     A grid aligns its rows, so a four-line answer beside a twenty-line one
     leaves a hole under the short one and the page reads as broken
     spacing. Columns pack: each answer starts where the last one ended,
     which is how a magazine sets a page of short contributions and how
     this stops looking like a table with missing cells.
     Reading order runs down the first column and then down the second,
     which is correct here only because each answer is self-contained.
     Never do this to flowing prose on a page you scroll. */
  if (phone) {
    return (
      <div className="space-y-9">
        {said(q.entries).map((e) => (
          <Block key={e.id} entry={e} phone />
        ))}
      </div>
    );
  }
  return (
    <div style={{ columnCount: 2, columnGap: 36 }}>
      {said(q.entries).map((e) => (
        <div key={e.id} className="mb-9 break-inside-avoid">
          <Block entry={e} phone={false} />
        </div>
      ))}
    </div>
  );
}

function Section({ q, phone }: { q: SketchQuestion; phone: boolean }) {
  const setting = settingFor(q);
  return (
    <section>
      <Heading text={q.text} phone={phone} />
      <div className={phone ? "mt-6" : "mt-8"}>
        {setting === "terse" && <Terse q={q} phone={phone} />}
        {setting === "media" && <Column q={q} phone={phone} />}
        {setting === "photos" && <Photos q={q} phone={phone} />}
        {setting === "column" && <Column q={q} phone={phone} />}
      </div>
    </section>
  );
}

function Head({ round, phone }: { round: SketchRound; phone: boolean }) {
  return (
    <header className={phone ? "pb-12" : "pb-16"}>
      <h1
        className="font-heading text-foreground"
        style={{ fontSize: phone ? 36 : 62, lineHeight: 1.04, letterSpacing: "-0.02em" }}
      >
        {round.catchupName}
      </h1>
      <MetaLine parts={[`Round ${round.number}`, longDate(round.publishedAt)]} className="mt-3" />
    </header>
  );
}

/** One line of green that always says which question you are in. Not a
 *  scrolling strip of pills: "the bar that you scroll horizontally and
 *  reach different questions is super janky. It looks so bad." */
function Locator({ text, top }: { text: string; top: number }) {
  return (
    <div
      className="z-30 flex items-center gap-3 bg-canopy px-4 py-2.5 text-white"
      style={{ position: "sticky", top }}
    >
      <p className="min-w-0 flex-1 truncate text-[14px]">{text}</p>
      <List size={17} weight="bold" className="shrink-0 opacity-85" />
    </div>
  );
}

function Reader({ round, viewport }: SketchProps) {
  const phone = viewport === "phone";

  if (phone) {
    return (
      <PhoneShell>
        <PhoneBar position="sticky" />
        <div className="px-5 pt-8">
          <Head round={round} phone />
          <div className="space-y-16 pb-16">
            {round.questions.map((q) => (
              <Section key={q.id} q={q} phone />
            ))}
          </div>
          <p className="pb-12 text-[14px] text-muted-foreground">Round 2 opens on 6 October.</p>
        </div>
      </PhoneShell>
    );
  }

  return (
    <DesktopShell>
      {/* One canvas, not a reader plus a rail: the whole point of this
          direction is that a question may take the full width when its
          content wants it. Navigation lives in the locator above. */}
      <div style={{ maxWidth: 1100 }}>
        <Head round={round} phone={false} />
        <div className="space-y-20">
          {round.questions.map((q) => (
            <Section key={q.id} q={q} phone={false} />
          ))}
        </div>
        <p className="pb-4 pt-16 text-[14px] text-muted-foreground">Round 2 opens on 6 October.</p>
      </div>
    </DesktopShell>
  );
}

function MidScroll({ round }: { round: SketchRound }) {
  const q = round.questions[8] ?? round.questions[0];
  return (
    <PhoneShell tall={false}>
      <PhoneBar position="absolute" />
      <div className="absolute inset-x-0 top-14 z-30">
        <Locator text={q.text} top={0} />
      </div>
      <div className="px-5 pt-[104px]">
        {/* Question 9 is the terse one, which is where this direction
            earns its keep or does not: eleven three-word answers in a
            grid, against eleven full-width paragraphs with a heart under
            each. */}
        <Heading text={q.text} phone />
        <div className="mt-6">
          <Terse q={q} phone />
        </div>
      </div>
    </PhoneShell>
  );
}

function NavigatorOpen({ round }: { round: SketchRound }) {
  return (
    <PhoneShell tall={false}>
      <PhoneBar position="absolute" />
      <div className="absolute inset-0 bg-black/35" />
      <div className="absolute inset-x-0 bottom-0 rounded-t-[18px] bg-card pb-5">
        <div className="flex justify-center pb-1 pt-2.5">
          <span className="h-1 w-9 rounded-full bg-border" />
        </div>
        <div className="flex items-center justify-between px-5 pt-1">
          <h3 className="font-heading text-[18px] text-foreground">In this Round</h3>
          <button
            type="button"
            aria-label="Close"
            className="state-layer -mr-2 grid h-11 w-11 place-items-center rounded-full text-muted-foreground"
          >
            <X size={20} weight="bold" />
          </button>
        </div>
        <ol
          className="max-h-[560px] overflow-hidden px-5 pt-1"
          style={{
            maskImage: "linear-gradient(to bottom, black 88%, transparent 100%)",
            WebkitMaskImage: "linear-gradient(to bottom, black 88%, transparent 100%)",
          }}
        >
          {round.questions.map((q, i) => (
            <li key={q.id} className={`py-3.5 ${i === 0 ? "" : "border-t border-border"}`}>
              <span
                className={`text-[15px] leading-snug ${
                  i === 8 ? "font-medium text-canopy" : "text-foreground"
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

export const spread: SketchDirection = {
  slug: "spread",
  name: "Each question is laid out for what it is",
  thesis:
    "Three words and four paragraphs are different design problems. The page measures each question and picks its setting: a grid of display lines, photographs first, cards, or a column two up.",
  Reader,
  MidScroll,
  NavigatorOpen,
};
