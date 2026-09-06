"use client";

/* ------------------------------------------------------------------ *
 *  THE PICK - the one I would build
 *
 *  Not a fourth bet. This is the other three with the losing halves cut
 *  off, which is what he asked for: "And then one that has taken the best
 *  of everything and basically the one that you think I should go ahead
 *  with."
 *
 *  What it takes, and from where:
 *
 *  From THE PLATE - the question printed on the Catch-up's own green.
 *  It is the one thing in the first ten he picked out unprompted, and it
 *  passes para 42's test better than anything else drawn here: it could
 *  not be another app's screen, and it is not a repeat of anything
 *  already in this one.
 *
 *  From THE SPREAD - the page reads the answers and picks their setting.
 *  Three words go in a grid of display lines, a question that is mostly
 *  photographs leads with them, pasted links become small cards, and
 *  everything else is a column that packs two up on a laptop. This is
 *  what stops the reader being one template repeated eleven times, and it
 *  is the only answer to para 31 that he has not already rejected.
 *
 *  From THE RIDER - the navigator is a bar at the FOOT of the screen, not
 *  a strip at the top. It is where a thumb rests, it never leaves, and it
 *  names the question you are inside the moment the plate scrolls away
 *  (para 11: "At some point I scroll on a question, and then I don't even
 *  know what the question is, on my phone"). Tapped, it grows into the
 *  index instead of opening a separate sheet with its own dismiss button.
 *
 *  What it leaves behind: the yearbook's by-person axis. It is the most
 *  interesting idea in the set and the wrong default, because reading
 *  nine people answer one question in a row is the thing a Catch-up is
 *  FOR. It belongs as a second way to read the same Round, not as the
 *  first one, and the architecture already has a door for it.
 *
 *  The bar and the plate are both green and never say the same words at
 *  once: while a plate is on screen the bar carries the Round's name, and
 *  it swaps to the question only once the plate has gone. Drawn statically
 *  here as the two states - Reader shows the first, MidScroll the second.
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
  said,
  StickyFoot,
  bodyType,
  lengthOf,
  longDate,
  temperOf,
} from "../_parts";

const CANVAS = 1100;

type Setting = "terse" | "photos" | "column";

function settingFor(q: SketchQuestion): Setting {
  const withPhotos = said(q.entries).filter((e) => e.images.length > 0).length;
  if (withPhotos >= said(q.entries).length / 2.5) return "photos";
  if (temperOf(said(q.entries)) === "terse") return "terse";
  return "column";
}

/* ── the question, printed on green ────────────────────────────────── */
function Plate({ text, phone }: { text: string; phone: boolean }) {
  return (
    <div
      className="rounded-[14px] bg-canopy text-white"
      style={{ padding: phone ? "26px 22px" : "34px 34px" }}
    >
      <h2
        className="font-heading text-white"
        style={{
          fontSize: phone ? 23 : 32,
          lineHeight: 1.2,
          letterSpacing: "-0.012em",
          maxWidth: phone ? undefined : 760,
        }}
      >
        {text}
      </h2>
    </div>
  );
}

/* ── one answer ────────────────────────────────────────────────────── */
function Answer({ entry, phone, first }: { entry: SketchEntry; phone: boolean; first?: boolean }) {
  const body = entry.text || (entry.body?.trim() ?? "");
  const type = bodyType(lengthOf(entry), phone);

  const words = body && (
    <p
      className={`mt-3 whitespace-pre-line ${type.className}`}
      style={{ fontSize: type.fontSize, lineHeight: type.lineHeight }}
    >
      {body}
    </p>
  );

  return (
    <article className={first ? "pt-7" : "border-t border-border pt-7"}>
      <Byline person={entry.author} />
      {words}
      {/* No photograph-beside-the-words rule here, unlike `plate`. This
          direction's laptop column is 530px wide, and a 230px picture
          against a 260px measure leaves both too narrow to be worth it.
          The height cap does that job instead. */}
      {entry.images.length > 0 && (
        <Photographs entry={entry} className="mt-3.5" maxHeight={phone ? 520 : 420} />
      )}
      <Media items={entry.media} className="mt-3.5" />
      <Reactions entry={entry} className="mt-2.5" />
      <div className="pb-7" />
    </article>
  );
}

function Terse({ q, phone }: { q: SketchQuestion; phone: boolean }) {
  return (
    <div
      className="grid gap-x-6 gap-y-7 pt-8"
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

function PhotoLed({ q, phone }: { q: SketchQuestion; phone: boolean }) {
  const shown = [...said(q.entries)].sort((a, b) => b.images.length - a.images.length);
  return (
    <div
      className={phone ? "space-y-9 pt-8" : "pt-9"}
      style={phone ? undefined : { columnCount: 2, columnGap: 36 }}
    >
      {shown.map((e) => {
        const body = e.text || (e.body?.trim() ?? "");
        return (
          <div key={e.id} className={phone ? "" : "mb-9 break-inside-avoid"}>
            <article className="min-w-0">
              {e.images.length > 0 && (
                <Photographs
                  entry={e}
                  radius={12}
                  className="mb-3.5"
                  maxHeight={phone ? 520 : 440}
                />
              )}
              <Byline person={e.author} />
              {body && (
                <p
                  className="mt-2.5 whitespace-pre-line text-foreground"
                  style={{ fontSize: phone ? 15.5 : 15.5, lineHeight: 1.6 }}
                >
                  {body}
                </p>
              )}
              <Media items={e.media} className="mt-3" />
              <Reactions entry={e} className="mt-2" />
            </article>
          </div>
        );
      })}
    </div>
  );
}

function Column({ q, phone }: { q: SketchQuestion; phone: boolean }) {
  if (phone) {
    return (
      <>
        {said(q.entries).map((e, i) => (
          <Answer key={e.id} entry={e} phone first={i === 0} />
        ))}
      </>
    );
  }
  /* CSS columns, not a grid: a grid aligns its rows, so a four-line answer
     beside a twenty-line one leaves a hole under the short one. */
  return (
    <div className="pt-1" style={{ columnCount: 2, columnGap: 36 }}>
      {said(q.entries).map((e) => (
        <div key={e.id} className="break-inside-avoid">
          <Answer entry={e} phone={false} first />
        </div>
      ))}
    </div>
  );
}

function Section({ q, phone }: { q: SketchQuestion; phone: boolean }) {
  const setting = settingFor(q);
  return (
    <section>
      <Plate text={q.text} phone={phone} />
      {setting === "terse" && <Terse q={q} phone={phone} />}
      {setting === "photos" && <PhotoLed q={q} phone={phone} />}
      {setting === "column" && <Column q={q} phone={phone} />}
    </section>
  );
}

/** The navigator. One green bar at the foot, a filled rule along its top
 *  edge for how far through you are (never a dot: "I don't like having a
 *  dot to show status of something"), and the label that swaps from the
 *  Round's name to the question once the plate leaves the screen. */
function Foot({
  label,
  progress,
  floating = false,
}: {
  label: string;
  progress: number;
  floating?: boolean;
}) {
  return (
    <div
      className={
        floating
          ? "overflow-hidden rounded-[14px] bg-canopy text-white shadow-[0_12px_36px_-14px_rgba(0,0,0,0.55)]"
          : "overflow-hidden bg-canopy text-white"
      }
    >
      <div className="h-[3px] w-full bg-white/20">
        <div className="h-full bg-white/85" style={{ width: `${Math.round(progress * 100)}%` }} />
      </div>
      <div className="flex items-center gap-3 px-4 py-3.5">
        <p className="min-w-0 flex-1 truncate font-heading text-[15px]">{label}</p>
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
        style={{ fontSize: phone ? 35 : 52, lineHeight: 1.05, letterSpacing: "-0.02em" }}
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
        {/* The first plate is on screen, so the bar carries the name. */}
        <StickyFoot>
          <Foot label={round.catchupName} progress={0.05} />
        </StickyFoot>
        <div className="px-5 pb-24 pt-8">
          <Head round={round} phone />
          <div className="space-y-14 pt-11">
            {round.questions.map((q) => (
              <Section key={q.id} q={q} phone />
            ))}
          </div>
          <p className="pt-12 text-[14px] text-muted-foreground">Round 2 opens on 6 October.</p>
        </div>
      </PhoneShell>
    );
  }

  return (
    <DesktopShell>
      <StickyFoot offset={24}>
        <div style={{ maxWidth: 520 }}>
          <Foot label={round.catchupName} progress={0.05} floating />
        </div>
      </StickyFoot>
      <div style={{ maxWidth: CANVAS }}>
        <Head round={round} phone={false} />
        <div className="space-y-16 pt-12">
          {round.questions.map((q) => (
            <Section key={q.id} q={q} phone={false} />
          ))}
        </div>
        <p className="pb-2 pt-14 text-[14px] text-muted-foreground">Round 2 opens on 6 October.</p>
      </div>
    </DesktopShell>
  );
}

/** Deep in question 5. The plate has gone, so the bar is carrying the
 *  question, which is the whole of para 11's complaint answered. */
function MidScroll({ round }: { round: SketchRound }) {
  const q = round.questions[4] ?? round.questions[0];
  return (
    <PhoneShell tall={false}>
      <PhoneBar position="absolute" />
      <div className="px-5 pt-[72px]">
        {said(q.entries).slice(5).map((e, i) => (
          <Answer key={e.id} entry={e} phone first={i === 0} />
        ))}
      </div>
      <div className="absolute inset-x-0 bottom-0 z-30">
        <Foot label={q.text} progress={0.43} />
      </div>
    </PhoneShell>
  );
}

/** Tapped, the bar grows upward into the index. The way out is the thing
 *  you tapped, still at the foot, still under the thumb: "I'm worried
 *  about it being too small a touch target and it being annoying to
 *  minimise." */
function NavigatorOpen({ round }: { round: SketchRound }) {
  const current = 4;
  return (
    <PhoneShell tall={false}>
      <PhoneBar position="absolute" />
      <div className="px-5 pt-[72px] opacity-35">
        {said((round.questions[4] ?? round.questions[0]).entries).slice(5, 7).map((e, i) => (
          <Answer key={e.id} entry={e} phone first={i === 0} />
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
        {/* Clipped with a fade rather than a hard cut: the list scrolls,
            and a flat edge through the middle of a line reads as a
            rendering fault instead of as more content below. */}
        <ol
          className="max-h-[430px] overflow-hidden px-5 pb-3"
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

export const pick: SketchDirection = {
  slug: "pick",
  name: "The one I would build",
  thesis:
    "The green plate from one, the page that lays each question out for what it contains from another, and the navigator that rides at the foot of the screen from the third. This is where I would put the rooms.",
  Reader,
  MidScroll,
  NavigatorOpen,
};
