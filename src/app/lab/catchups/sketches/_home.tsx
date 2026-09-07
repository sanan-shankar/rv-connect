"use client";

/* ------------------------------------------------------------------ *
 *  /catchups/[id], a Catch-up's home. Three parts, in every state.
 *
 *  His question, para 15, asked while looking at the shipped one: "then
 *  what do we put on the left? I don't know. I don't know." The answer is
 *  that the home has the same three parts every time and only the middle
 *  one changes, and it changes on the ROUND's state, never on the
 *  Catch-up's.
 *
 *    the head    the name, one line of fact, and one door
 *    Now         the current Round, as the thing it currently is
 *    Earlier     the published Rounds that are not the one in Now
 *
 *  WHAT THIS KILLS. Today the home of a Catch-up whose newest Round is
 *  out shows that Round three times: a "Round N is out." tile that is
 *  dead except for five words of link, the entire Round printed inline
 *  under it, and a Published-issues row pointing back at it (recon
 *  section 5; his para 15: "This is so ridiculous, man. It's actually so
 *  ridiculous"). Here a published Round appears once, as its cover, and
 *  the cover is a door to the reader.
 *
 *  THE PEOPLE. R2, and it is later than the plan that put them a level
 *  down: "the homepage or whatever of the catch-up can have all of the
 *  people listed in the sidebar." So on a laptop they are listed, all of
 *  them, in a column at the right. On a phone the same list is a
 *  disclosure under the head. Either way there is no preview, no "and 16
 *  more", no See-and-add dialog and no second copy of the roster --
 *  which is the whole of E1 and E3 ("the panel and the dialog show the
 *  same thing twice ... so inefficient", para 12 and para 37). The
 *  panel was ugly because it was previewing a list inside a box; give
 *  the list a column and it stops being a problem.
 *
 *  THE VERBS. Sixteen of them live on five surfaces today, two of them
 *  twice, and archive and delete cannot be reached from inside the
 *  Catch-up they act on (recon section 4). Round verbs sit on Now beside
 *  the Round they act on. Everything else is behind ONE door, top right,
 *  and it is the only menu in Catch-ups. The settings dialog and its
 *  twelve horizontal rules are gone (para 14, para 40).
 *
 *  The door's own sheet, and the confirmations it opens, are the next
 *  session's drawing. What is here is plain on purpose.
 * ------------------------------------------------------------------ */

import { useState } from "react";
import { CaretRight, DotsThree } from "@phosphor-icons/react";
import { Sprout } from "lucide-react";
import { AnimatePresence, m } from "motion/react";
import { BirdAvatar } from "@/components/common/bird-avatar";
import { Button } from "@/components/ui/button";
import { EASE_OUT_SMOOTH } from "@/components/common/motion";
import { cn } from "@/lib/utils";
import { Contents, Cover, Picture } from "./_cover";
import { dayAndDate, shortDate, type SketchCatchup, type ShelfRound } from "./_shelf";
import type { SketchPerson } from "./_types";

/** The page's own width, the same on the list and here: 720 of reading,
 *  56 of gutter, 320 of people. At his 1512 that fills the room the shell
 *  leaves (window - 328) with 88px to spare, which is why neither page
 *  has the margins he objected to on the reader ("we have so much empty
 *  space ... what is there in the shipped version now has much better
 *  margins. It like fills up the screen"). */
export const HOME_MAIN = 720;
export const HOME_PEOPLE = 320;
export const HOME_GAP = 56;
export const HOME_MAX = HOME_MAIN + HOME_GAP + HOME_PEOPLE;

/* ── people ────────────────────────────────────────────────────────── *
 *  Names, with birds beside them, and never a bird alone: "a row of
 *  birds with this plus icon ... I am not identifying the birds or the
 *  people" (para 23). The Keeper's sprout sits at the end of the row,
 *  which is the one part of today's panel he liked (para 37: "we have
 *  highlighted the keepers in a neat way, and there's that little leaf
 *  sign next to their name. That part is nice"). */
function Person({ p, size }: { p: SketchPerson; size: number }) {
  return (
    <span className="flex min-w-0 items-center gap-2.5">
      <BirdAvatar user={p} size={size} />
      {/* The sprout follows the NAME rather than sitting at the far end of
          the column. The shipped roster puts it at the end so the marks
          line up, which is a good rule for a list with several Keepers
          and a bad one for a list with one: at 320px it stranded a single
          sprout 180px away from the person it belongs to. */}
      <span className="min-w-0 truncate text-[14.5px] text-foreground">{p.name}</span>
      {p.isKeeper && (
        <Sprout className="h-3.5 w-3.5 shrink-0 text-cinnamon" aria-label="Keeper" />
      )}
    </span>
  );
}

function PeopleColumn({ members }: { members: SketchPerson[] }) {
  return (
    <div>
      <p className="mb-3 text-[13px] font-medium text-muted-foreground">People</p>
      <ul className="space-y-2.5">
        {members.map((p) => (
          <li key={p.id}>
            <Person p={p} size={32} />
          </li>
        ))}
      </ul>
    </div>
  );
}

/** The phone's answer to the same thing: one control, and the whole list
 *  opens in place. No sheet and no dialog, so the roster exists exactly
 *  once in the app. */
function PeopleDisclosure({ members }: { members: SketchPerson[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="state-layer -ml-2 flex items-center gap-1.5 rounded-full px-2 py-1.5 text-[13.5px] font-medium text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <CaretRight
          size={13}
          weight="bold"
          className={cn("transition-transform duration-300 ease-out", open && "rotate-90")}
        />
        People
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <m.div
            key="people"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{
              height: { duration: 0.3, ease: EASE_OUT_SMOOTH },
              opacity: { duration: 0.18, ease: EASE_OUT_SMOOTH },
            }}
            className="overflow-hidden"
          >
            <ul className="space-y-2.5 pt-2">
              {members.map((p) => (
                <li key={p.id}>
                  <Person p={p} size={30} />
                </li>
              ))}
            </ul>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Who has written in so far, while a Round is being answered. Elements,
 *  never a sentence with commas in it: "I don't like doing it with
 *  commas. I don't think commas are the right execution. These are all
 *  elements. Commas are for text." (R33) */
function WroteIn({ people }: { people: SketchPerson[] }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-2.5">
      {people.map((p) => (
        <li key={p.id} className="max-w-[180px]">
          <Person p={p} size={26} />
        </li>
      ))}
    </ul>
  );
}

/* ── the door ──────────────────────────────────────────────────────── *
 *  Every verb that is about the Catch-up rather than about this Round.
 *  One menu, one place, top right, where dots go: "if we have to have 3
 *  dots, shouldn't it be in the top right, where 3 dots always are?"
 *  (para 24). Its own drawing is the next session's. */
function DoorMenu({ c }: { c: SketchCatchup }) {
  const [open, setOpen] = useState(false);
  /* Two personal verbs, not three. He settled this on 2026-09-07:
     "deleting becomes leaving". So Archive hides it and Leave gets you
     out, the thirty-day bin and the "Recently deleted" shelf go with
     Delete, and a batch Catch-up has only Archive, because there is no
     leaving your own batch (para 5). */
  const rows = [
    "Reminders",
    "Archive",
    ...(c.kind === "people" ? ["Leave this Catch-up"] : []),
    ...(c.youKeep ? ["Rhythm", "Hold the next Round", "End this Catch-up"] : []),
  ];
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label="This Catch-up"
        className="state-layer grid h-9 w-9 place-items-center rounded-full text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <DotsThree size={22} weight="bold" />
      </button>
      <AnimatePresence>
        {open && (
          <m.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.16, ease: EASE_OUT_SMOOTH }}
            className="card-elevated absolute right-0 top-full z-30 mt-1 w-[220px] overflow-hidden rounded-[12px] border border-border bg-card py-1.5"
          >
            {rows.map((r) => (
              <button
                key={r}
                type="button"
                className="state-layer block w-full px-4 py-2 text-left text-[14.5px] text-foreground focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring"
              >
                {r}
              </button>
            ))}
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Now ───────────────────────────────────────────────────────────── */

function StateLine({ c }: { c: SketchCatchup }) {
  const r = c.round;
  if (!r) return null;
  const word =
    c.state === "collecting"
      ? "open for questions"
      : c.state === "answering" && r.closesAt
        ? `answers close on ${dayAndDate(r.closesAt)}`
        : c.state === "preparing" && r.comesOutAt
          ? `out on ${dayAndDate(r.comesOutAt)}`
          : "";
  return (
    <p className="flex flex-wrap items-center gap-2 text-[13.5px]">
      <span className="font-medium text-cinnamon">Round {r.number}</span>
      <span className="dotsep" aria-hidden>
        ·
      </span>
      <span className="text-muted-foreground">{word}</span>
      {c.paused && (
        <>
          <span className="dotsep" aria-hidden>
            ·
          </span>
          <span className="text-muted-foreground">Paused</span>
        </>
      )}
    </p>
  );
}

function Now({
  c,
  onRead,
  phone,
}: {
  c: SketchCatchup;
  onRead: (r: ShelfRound) => void;
  phone: boolean;
}) {
  const r = c.round;

  if (c.state === "ended") {
    return (
      <p className="text-[14.5px] text-muted-foreground">
        Ended on {c.endedAt ? shortDate(c.endedAt) : ""}
      </p>
    );
  }

  if (c.state === "none" || !r) {
    return (
      <div>
        <p className="max-w-[46ch] text-[15.5px] leading-relaxed text-foreground">
          A Round is a few questions, answered by everyone, and read together.
        </p>
        <Button className="mt-4">Start the first Round</Button>
      </div>
    );
  }

  /* Published: the cover, and nothing else. The Round itself is one tap
     away and is not also printed on this page. */
  if (c.state === "published") {
    return (
      <div>
        <Cover round={r} onOpen={() => onRead(r)} className={phone ? undefined : "max-w-full"} />
        {r.nextOpensAt && !c.paused && (
          <p className="mt-3.5 text-[13.5px] text-muted-foreground">
            Round {r.number + 1} opens on {shortDate(r.nextOpensAt)}
          </p>
        )}
        {c.paused && c.canRun && (
          <Button variant="outline" className="mt-4">
            Resume
          </Button>
        )}
      </div>
    );
  }

  /* A paused Catch-up shows exactly what it was doing, marked. It never
     hides a Round: today's pause replaces the whole column, and "in the
     loop" is paused right now with a Round 2 in `collecting` that no
     member can see or add to (recon section 11). */
  const frozen = c.paused;

  return (
    <div>
      <StateLine c={c} />
      {r.questions.length > 0 ? (
        <Contents round={{ ...r, read: false }} className="mt-4" />
      ) : (
        <p className="mt-3 text-[14.5px] text-muted-foreground">
          Nobody has asked anything yet.
        </p>
      )}

      {frozen ? (
        c.canRun && (
          <Button variant="outline" className="mt-6">
            Resume
          </Button>
        )
      ) : (
        <div className="mt-6 flex flex-wrap gap-2.5">
          {c.state === "collecting" && <Button>Ask something</Button>}
          {c.state === "collecting" && c.canRun && (
            <Button variant="outline">Open answering</Button>
          )}
          {c.state === "answering" && !r.youAnswered && <Button>Answer</Button>}
          {c.state === "answering" && r.youAnswered && (
            <p className="text-[14.5px] text-muted-foreground">You have written in.</p>
          )}
          {c.state === "answering" && c.canRun && (
            <>
              <Button variant="outline">Nudge everyone</Button>
              <Button variant="outline">Close now</Button>
            </>
          )}
          {c.state === "preparing" && c.canRun && <Button>Publish now</Button>}
        </div>
      )}

      {/* Who has written in comes AFTER the action, not before it. Above
          it, "Answer" landed at the very bottom edge of a 390x844 screen
          on the one state where answering is the entire point of the
          page. Names are context; the button is the reason you are here. */}
      {c.state === "answering" && r.wroteIn.length > 0 && (
        <div className="mt-8">
          <p className="mb-3 text-[13px] font-medium text-muted-foreground">Written in so far</p>
          <WroteIn people={r.wroteIn} />
        </div>
      )}
    </div>
  );
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
  const head = (
    <header>
      <div className="flex items-start justify-between gap-4">
        <div className={phone ? "min-w-0" : "flex min-w-0 items-center gap-4"}>
          {/* The same picture as the list's, at the same proportions, so
              the thing you tapped is the thing you landed on.

              An identity mark here, not the spectacle it is on the list.
              A full-width band was drawn first and pushed Now -- the only
              part of this page anyone came to act on -- 250px down a
              phone. The list is a shelf and wants the picture big; the
              home is where the Round is and wants it small enough to read
              past.

              Above the title on a phone, beside it on a laptop. Beside it
              at 390 the title had 162px to live in and "Batch of 2005"
              broke over two lines with its rhythm wrapping under it. */}
          <Picture
            src={c.picture}
            alt=""
            width={phone ? 160 : 156}
            className={phone ? "mb-4" : undefined}
          />
          <div className="min-w-0">
            <h1 className="font-heading text-[30px] leading-[1.2] tracking-[-0.02em] text-foreground">
              {c.name}
            </h1>
            {/* The rhythm in words, and for a batch, whose it is. That is
                how a batch Catch-up is told apart: no chip, no badge. */}
            <p className="mt-2 text-[14px] text-muted-foreground">{c.meta}</p>
          </div>
        </div>
        <div className="mt-px shrink-0">
          <DoorMenu c={c} />
        </div>
      </div>
      {phone && <PeopleDisclosure members={c.members} />}
    </header>
  );

  const main = (
    <div>
      {phone && head}
      <div className={phone ? "mt-7" : ""}>
        <Now c={c} onRead={onRead} phone={phone} />
      </div>
      {c.before.length > 0 && (
        <section className={phone ? "mt-10" : "mt-12"}>
          <p className="mb-3 text-[13px] font-medium text-muted-foreground">Earlier Rounds</p>
          <div className="space-y-3.5">
            {c.before.map((r) => (
              <Cover key={r.number} round={r} onOpen={() => onRead(r)} />
            ))}
          </div>
        </section>
      )}
      {/* No Back button, deliberately. Para 18, about the shipped one:
          "the fix is to have a very clear Back to catch-up button where
          you can go back to the home and sort it out. But this is not the
          level of redesign I think we need." The way out of a Catch-up is
          the sidebar's own Catch-ups, which never leaves the screen; the
          thing that needed fixing was the way out of a ROUND, which the
          reader's title bar now is. */}
    </div>
  );

  if (phone) return main;

  /* The head spans BOTH columns, so the door lands at the far right of
     the page the way a menu does on every other surface, instead of
     hanging in the gutter between the reading and the people. */
  return (
    <div style={{ maxWidth: HOME_MAX }}>
      {head}
      <div
        className="mt-8 grid items-start"
        style={{
          gridTemplateColumns: `minmax(0,1fr) ${HOME_PEOPLE}px`,
          columnGap: HOME_GAP,
        }}
      >
        <div className="min-w-0" style={{ maxWidth: HOME_MAIN }}>
          {main}
        </div>
        <aside className="sticky self-start" style={{ top: 40 }}>
          <PeopleColumn members={c.members} />
        </aside>
      </div>
    </div>
  );
}
