"use client";

/* ------------------------------------------------------------------ *
 *  THE YEARBOOK - "one person at a time"
 *
 *  Every direction so far, and all ten of the first round, reads the
 *  Round down the same axis: a question, then everyone's answers to it.
 *  That is Letterloop's axis, and para 49 is explicit that Letterloop is
 *  the floor rather than the target: "the worst version of the product
 *  should be like Letterloop, but has to be so much better than that."
 *
 *  Turn it ninety degrees and the Round becomes thirteen short profiles:
 *  everything Mohini said, then everything Agastya said. What that buys:
 *
 *   - The people stop being a row of faces to be counted and become the
 *     structure itself. Para 23 and 27 both throw out the contributor
 *     strip ("I don't really care what the bird icons are ... I am not
 *     identifying the birds or the people. This is totally useless").
 *     Here nobody needs a strip, because a person IS a section.
 *   - It is how you actually catch up with someone. You want to know
 *     what Cyan has been doing, not what eleven people think about AI.
 *   - It gives the short answers somewhere to live: a person's three-word
 *     month sits next to their four paragraphs about work, so para 31's
 *     lonely tile never happens.
 *
 *  What it costs, said plainly because it may be the thing that kills it:
 *  you lose the comparison. Reading nine people answer one question in a
 *  row is the pleasure Letterloop is built on, and this trades it away.
 *
 *  It is NOT a page per person. "Ideas where each question is a separate
 *  page sucks. Let's not." The same objection would apply to a page per
 *  person, so this is one continuous scroll, thirteen sections deep.
 *
 *  The question above each answer is a LABEL, not a heading, and it is
 *  set to look like one: small, uppercase, muted, no rule under it. In a
 *  by-question reader repeating the question over every answer is the
 *  fault he named ("some of them have the questions repeated above every
 *  answer. Such horrible design"). Here consecutive answers are to
 *  DIFFERENT questions, so the label is the only thing telling you what
 *  is being answered, and leaving it out would be the fault.
 * ------------------------------------------------------------------ */

import { X } from "@phosphor-icons/react";
import { BirdAvatar } from "@/components/common/bird-avatar";
import type { SketchDirection, SketchEntry, SketchPerson, SketchProps, SketchRound } from "../_types";
import { PhoneBar, PhoneShell, DesktopShell } from "../_shell";
import { Media, MetaLine, Photographs, Reactions, bodyType, lengthOf, longDate, said } from "../_parts";

type Said = { question: string; entry: SketchEntry };

/** The Round, turned ninety degrees. Everyone who wrote in, in the order
 *  they first appear, with what they said and what they were asked. */
function byPerson(round: SketchRound): { person: SketchPerson; said: Said[] }[] {
  const map = new Map<string, { person: SketchPerson; said: Said[] }>();
  for (const q of round.questions) {
    for (const e of said(q.entries)) {
      const row = map.get(e.author.id) ?? { person: e.author, said: [] };
      row.said.push({ question: q.text, entry: e });
      map.set(e.author.id, row);
    }
  }
  return [...map.values()];
}

function Label({ text }: { text: string }) {
  return (
    <p className="text-[10.5px] font-semibold uppercase leading-none tracking-[0.07em] text-muted-foreground">
      {text}
    </p>
  );
}

function Said({ said, phone }: { said: Said; phone: boolean }) {
  const { entry } = said;
  const body = entry.text || (entry.body?.trim() ?? "");
  const type = bodyType(lengthOf(entry), phone);
  return (
    <article className="min-w-0 break-inside-avoid">
      <Label text={said.question} />
      {body && (
        <p
          className={`mt-2.5 whitespace-pre-line ${type.className}`}
          style={{ fontSize: type.fontSize, lineHeight: type.lineHeight }}
        >
          {body}
        </p>
      )}
      <Media items={entry.media} className="mt-3" />
      {entry.images.length > 0 && <Photographs entry={entry} className="mt-3" />}
      <Reactions entry={entry} className="mt-2" />
    </article>
  );
}

/** The opening of somebody's section. The bird is 56 here and not 36:
 *  it is the only place in this direction where a face appears, and it is
 *  standing in for a page turn. */
function Opening({ person, phone }: { person: SketchPerson; phone: boolean }) {
  return (
    <div className="flex items-center gap-3.5">
      <BirdAvatar user={person} size={phone ? 48 : 56} />
      <h2
        className="min-w-0 font-heading text-foreground"
        style={{ fontSize: phone ? 25 : 32, lineHeight: 1.1, letterSpacing: "-0.015em" }}
      >
        {person.name}
      </h2>
    </div>
  );
}

function Head({ round, phone }: { round: SketchRound; phone: boolean }) {
  return (
    <header>
      <h1
        className="font-heading text-foreground"
        style={{ fontSize: phone ? 34 : 48, lineHeight: 1.06, letterSpacing: "-0.02em" }}
      >
        {round.catchupName}
      </h1>
      <MetaLine parts={[`Round ${round.number}`, longDate(round.publishedAt)]} className="mt-2.5" />
    </header>
  );
}

/** Who you are reading, held at the top of the screen. The by-question
 *  readers keep the question there; this one keeps the person, for the
 *  same para 11 reason: "I don't even know what the question is". */
function PersonBar({ person, top }: { person: SketchPerson; top: number }) {
  return (
    <div
      className="z-30 flex items-center gap-2.5 bg-canopy px-4 py-2.5 text-white"
      style={{ position: "sticky", top }}
    >
      <BirdAvatar user={person} size={24} />
      <p className="min-w-0 flex-1 truncate font-heading text-[15px]">{person.name}</p>
    </div>
  );
}

function Reader({ round, viewport }: SketchProps) {
  const phone = viewport === "phone";
  const people = byPerson(round);

  if (phone) {
    return (
      <PhoneShell>
        <PhoneBar position="sticky" />
        <div className="px-5 pb-12 pt-8">
          <Head round={round} phone />
        </div>
        {people.map(({ person, said }) => (
          <section key={person.id}>
            <PersonBar person={person} top={56} />
            <div className="space-y-8 px-5 pb-14 pt-7">
              {said.map((s) => (
                <Said key={s.entry.id} said={s} phone />
              ))}
            </div>
          </section>
        ))}
        <p className="px-5 pb-12 text-[14px] text-muted-foreground">Round 2 opens on 6 October.</p>
      </PhoneShell>
    );
  }

  return (
    <DesktopShell>
      <div style={{ maxWidth: 1100 }}>
        <Head round={round} phone={false} />
        <div className="space-y-20 pt-14">
          {people.map(({ person, said }) => (
            <section key={person.id}>
              <Opening person={person} phone={false} />
              {/* Two up, never three: "Three column layouts on desktop no
                  need. Stick with two." CSS columns rather than a grid so
                  a one-line answer beside a six-paragraph one packs
                  instead of leaving a hole under itself. */}
              <div className="mt-7" style={{ columnCount: 2, columnGap: 40 }}>
                {said.map((s) => (
                  <div key={s.entry.id} className="mb-9 break-inside-avoid">
                    <Said said={s} phone={false} />
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
        <p className="pb-4 pt-16 text-[14px] text-muted-foreground">Round 2 opens on 6 October.</p>
      </div>
    </DesktopShell>
  );
}

function MidScroll({ round }: { round: SketchRound }) {
  const people = byPerson(round);
  const row = people[1] ?? people[0];
  return (
    <PhoneShell tall={false}>
      <PhoneBar position="absolute" />
      <div className="absolute inset-x-0 top-14 z-30">
        <PersonBar person={row.person} top={0} />
      </div>
      <div className="space-y-8 px-5 pt-[110px]">
        {row.said.slice(2, 5).map((s) => (
          <Said key={s.entry.id} said={s} phone />
        ))}
      </div>
    </PhoneShell>
  );
}

/** The index is PEOPLE here, which is the whole point: the thing you are
 *  navigating is who wrote in, and it earns the list that para 23 refused
 *  to earn as a decorative strip of birds. */
function NavigatorOpen({ round }: { round: SketchRound }) {
  const people = byPerson(round);
  return (
    <PhoneShell tall={false}>
      <PhoneBar position="absolute" />
      <div className="absolute inset-0 bg-black/35" />
      <div className="absolute inset-x-0 bottom-0 rounded-t-[18px] bg-card pb-5">
        <div className="flex justify-center pb-1 pt-2.5">
          <span className="h-1 w-9 rounded-full bg-border" />
        </div>
        <div className="flex items-center justify-between px-5 pt-1">
          <h3 className="font-heading text-[18px] text-foreground">Who wrote in</h3>
          <button
            type="button"
            aria-label="Close"
            className="state-layer -mr-2 grid h-11 w-11 place-items-center rounded-full text-muted-foreground"
          >
            <X size={20} weight="bold" />
          </button>
        </div>
        <ol
          className="max-h-[560px] overflow-hidden px-5 pt-2"
          style={{
            maskImage: "linear-gradient(to bottom, black 88%, transparent 100%)",
            WebkitMaskImage: "linear-gradient(to bottom, black 88%, transparent 100%)",
          }}
        >
          {people.map(({ person }, i) => (
            <li key={person.id} className="flex items-center gap-3 py-2.5">
              <BirdAvatar user={person} size={34} />
              <span
                className={`text-[16px] ${
                  i === 1 ? "font-medium text-canopy" : "text-foreground"
                }`}
              >
                {person.name}
              </span>
            </li>
          ))}
        </ol>
      </div>
    </PhoneShell>
  );
}

export const yearbook: SketchDirection = {
  slug: "yearbook",
  name: "One person at a time",
  thesis:
    "The Round turned ninety degrees: thirteen short profiles instead of eleven question sections. The people become the structure, so nobody needs a row of faces to count. It trades away comparing answers side by side.",
  Reader,
  MidScroll,
  NavigatorOpen,
};
