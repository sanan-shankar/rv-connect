"use client";

/* ------------------------------------------------------------------ *
 *  /catchups/[id] — a Catch-up's home. A PLACE, not a page that
 *  reshapes itself.
 *
 *  His question, and the answer this file takes: "is there a home page
 *  that you then keep navigating from to do things like answer or
 *  whatever, or does the home page transform into something each time. I
 *  think the answer being its own page is good."
 *
 *  A place. Four regions, always in the same spot, at every state and for
 *  every member:
 *
 *    the head        the picture, the name
 *    the Round       what this cycle is right now, and ONE thing to do
 *    the rail        People / Reminders / Running this  (_rail.tsx)
 *    earlier         the Rounds that have already come out
 *
 *  Only what is inside the second region changes. The first draft
 *  reshaped the whole page per state, which is why he could not find the
 *  same thing twice: "you've just totally changed the homepage into this
 *  new UI. All the controls are gone ... now I don't know where they are."
 *
 *  ONE PRIMARY ACTION, and it is never in a row of equals. Collecting: the
 *  box for writing a question, which is the shipped design he singled out
 *  as better than mine — "the asking thing now has a box. And it says, be
 *  the first to ask. And then under that, it would show everything ... the
 *  asking is probably even better now on the shipped version than what
 *  you've created." Answering: Answer, large, with nothing beside it,
 *  because in my first draft "the biggest elements are the people,
 *  questions, the people who have written, and then the earlier rounds.
 *  The actual answering is not even there."
 *
 *  NO LIST OF QUESTIONS except where the questions are the thing being
 *  made, which is collecting. He said it three times in one sitting about
 *  three different screens: "Why do we just have this list of questions?
 *  I just don't get it. It's so annoying."
 *
 *  NO ROUND NUMBERS. "Why do we need to have the round 4? It doesn't
 *  matter what round, it's going to be round 15. How does it matter
 *  whether it's 15 or 16?"
 * ------------------------------------------------------------------ */

import { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { Cover } from "./_cover";
import { Person, PhoneRail, Rail } from "./_rail";
import { dayAndDate, shortDate, type SketchCatchup, type ShelfRound } from "./_shelf";

/** The page's width: 720 of reading, 56 of gutter, 300 of rail. At his
 *  1512 the shell leaves 1184, so this fills it with 108px to spare. */
export const HOME_MAIN = 720;
export const HOME_RAIL = 300;
export const HOME_GAP = 56;
export const HOME_MAX = HOME_MAIN + HOME_GAP + HOME_RAIL;

/* ── the head ──────────────────────────────────────────────────────── *
 *  The picture as a banner, at the proportions he asked for: "I wanted
 *  almost like, you know, a Notion for a page, like header photo. It's
 *  just a super wide photo, right? Maybe some aspect ratio like that."
 *  4:1 on a laptop, 3:1 on a phone, because a 4:1 crop of a 350px screen
 *  is 88px of letterbox.
 *
 *  Nothing under the name but the two controls. The rhythm line is gone
 *  ("everyone from 1978 ... every 3 months, that doesn't need to be
 *  said") and so is the sentence explaining what a Round is ("we don't
 *  need to teach them how to use it"). */
function Head({ c, phone }: { c: SketchCatchup; phone: boolean }) {
  return (
    <header>
      <span
        className="relative block w-full overflow-hidden rounded-[var(--radius)] bg-muted"
        style={{ aspectRatio: phone ? "3 / 1" : "4 / 1" }}
      >
        <Image src={c.picture} alt="" fill sizes="1100px" className="object-cover" priority />
      </span>
      <div className="mt-4 flex flex-wrap items-baseline justify-between gap-x-5 gap-y-1.5">
        <h1 className="min-w-0 font-heading text-[30px] leading-[1.2] tracking-[-0.02em] text-foreground">
          {c.name}
        </h1>
        {phone && <PhoneRail c={c} />}
      </div>
    </header>
  );
}

/* ── the Round ─────────────────────────────────────────────────────── */

/** One line, the stage in words. No Round number, no counts. */
function Stage({ c }: { c: SketchCatchup }) {
  const r = c.round;
  const words =
    c.state === "ended" && c.endedAt
      ? `Ended ${shortDate(c.endedAt)}`
      : !r
        ? "No Rounds yet"
        : c.state === "collecting"
          ? "Open for questions"
          : c.state === "answering" && r.closesAt
            ? `Answers close ${dayAndDate(r.closesAt)}, and it comes out the same day`
            : c.state === "published" && r.nextOpensAt
              ? `The next one opens ${shortDate(r.nextOpensAt)}`
              : "";
  if (!words) return null;
  return (
    <p className="text-[14px] text-muted-foreground">
      {c.paused && <span className="font-medium text-foreground">Paused. </span>}
      {words}
    </p>
  );
}

/** The box, which is the shipped one he named as better than mine. The
 *  heading changes on the first ask and the copy does not multiply. */
function AskBox({ first, you }: { first: boolean; you: string }) {
  const [text, setText] = useState("");
  const [asMe, setAsMe] = useState(true);
  return (
    <div className="card-elevated rounded-[var(--radius)] border border-border bg-card p-5">
      <p className="font-heading text-[17px] text-foreground">
        {first ? "Be the first to ask something" : "Ask everyone something"}
      </p>
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        aria-label="Your question for the group"
        maxLength={300}
        className="mt-3 max-h-64 min-h-[5.5rem] bg-background/60"
      />
      <div className="mt-4 flex flex-wrap items-center gap-2.5">
        <div className="inline-flex rounded-full border border-border bg-background/60 p-1">
          {[
            { on: true, label: `Ask as ${you}` },
            { on: false, label: "Ask anonymously" },
          ].map((o) => (
            <button
              key={String(o.on)}
              type="button"
              aria-pressed={asMe === o.on}
              onClick={() => setAsMe(o.on)}
              className={cn(
                "rounded-full px-3 py-1.5 text-[12.5px] font-medium transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                asMe === o.on
                  ? "bg-canopy text-white"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {o.label}
            </button>
          ))}
        </div>
        <Button variant="outline" size="sm">
          From the library
        </Button>
        <Button size="sm" className="ml-auto" disabled={!text.trim()}>
          Ask the group
        </Button>
      </div>
    </div>
  );
}

/** What the group has asked so far. The ONE place a list of questions
 *  earns its space, because these are the thing being made. */
function Asked({ r }: { r: ShelfRound }) {
  if (r.questions.length === 0) return null;
  return (
    <ul className="mt-5 space-y-3.5">
      {r.questions.map((q) => (
        <li key={q.id} className="flex gap-3">
          <span aria-hidden className="mt-[9px] h-[3px] w-[3px] shrink-0 rounded-full bg-cinnamon" />
          <span className="min-w-0 font-heading text-[16px] leading-snug text-foreground">
            {q.text}
          </span>
        </li>
      ))}
    </ul>
  );
}

function Round({ c, onRead }: { c: SketchCatchup; onRead: (r: ShelfRound) => void }) {
  const r = c.round;

  /* Nothing is running yet. The one thing to do is start something, and
     on a batch nobody may, so it says when instead of offering a control
     anyone could press by accident. */
  if (c.state === "none" || !r) {
    return c.kind === "people" ? (
      <Button size="lg">Start the first Round</Button>
    ) : (
      <p className="text-[15.5px] text-foreground">The first Round opens in January.</p>
    );
  }

  if (c.state === "ended") return null;

  if (c.state === "collecting") {
    return (
      <div>
        <AskBox first={r.questions.length === 0} you="Sanan" />
        <Asked r={r} />
      </div>
    );
  }

  if (c.state === "answering") {
    return (
      <div>
        {/* The page's one primary action, and the biggest thing on it.
            Nudge and Close are NOT beside it: they are in the rail, where
            a one-way control belongs. */}
        {r.youAnswered ? (
          <div className="flex flex-wrap items-center gap-4">
            <p className="text-[15.5px] text-foreground">You have written in.</p>
            <Button variant="outline" size="sm">
              Change your answers
            </Button>
          </div>
        ) : (
          <Button size="lg" className="text-[16px]">
            Answer
          </Button>
        )}
        {r.wroteIn.length > 0 && (
          <div className="mt-8">
            <p className="mb-3 text-[13px] font-medium text-muted-foreground">Written in so far</p>
            <ul className="flex flex-wrap gap-x-4 gap-y-2.5">
              {r.wroteIn.map((p) => (
                <li key={p.id} className="max-w-[180px]">
                  <Person p={p} size={26} />
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  }

  /* Out. The cover, and nothing else: not the Round printed underneath
     it, not a row pointing back at it. That is the whole of para 15 and
     para 35, and it is the one state where this design was already better
     than what ships. */
  return <Cover round={r} fallback={c.picture} onOpen={() => onRead(r)} />;
}

/* ── the page ──────────────────────────────────────────────────────── */

export function Home({
  c,
  onRead,
  phone,
}: {
  c: SketchCatchup;
  onRead: (r: ShelfRound) => void;
  phone: boolean;
}) {
  const body = (
    <div>
      <div className={phone ? "mt-5" : "mt-6"}>
        <Stage c={c} />
        <div className="mt-4">
          <Round c={c} onRead={onRead} />
        </div>
      </div>
      {c.before.length > 0 && (
        <section className={phone ? "mt-11" : "mt-14"}>
          <h2 className="mb-3.5 text-[13px] font-medium text-muted-foreground">Earlier Rounds</h2>
          <div className="space-y-3">
            {c.before.map((r) => (
              <Cover
                key={r.number}
                round={r}
                fallback={c.picture}
                onOpen={() => onRead(r)}
                compact
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );

  if (phone) {
    return (
      <div>
        <Head c={c} phone />
        {body}
      </div>
    );
  }

  return (
    <div style={{ maxWidth: HOME_MAX }}>
      <Head c={c} phone={false} />
      <div
        className="grid items-start"
        style={{ gridTemplateColumns: `minmax(0,1fr) ${HOME_RAIL}px`, columnGap: HOME_GAP }}
      >
        <div className="min-w-0" style={{ maxWidth: HOME_MAIN }}>
          {body}
        </div>
        <aside className="sticky self-start pt-6" style={{ top: 40 }}>
          <Rail c={c} />
        </aside>
      </div>
    </div>
  );
}
