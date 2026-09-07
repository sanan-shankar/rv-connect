"use client";

/* ------------------------------------------------------------------ *
 *  The rail: where every control lives, in the same place, always.
 *
 *  THIS IS THE THING THAT WAS MISSING. The first draft of this home had
 *  no rail and put the controls in a row of equal pills under the
 *  content, which is how they ended up, in his words: "you have these
 *  controls like nudge everyone, close now, just hanging in the middle of
 *  nowhere. It looks so horrible. Just arbitrarily there. There's no
 *  sense. Revolut wouldn't ship something like this. Apple wouldn't."
 *
 *  He was also clear that the SHIPPED version, whose settings panel he
 *  has complained about for months, is better than that: "at least it
 *  works ... it's not great but it's not as atrocious design as your just
 *  nudge everyone in the middle of nowhere." The reason it is better is
 *  that it has a rail, so every control has an address.
 *
 *  THE RULE, which is what stops it happening again. A control is either
 *  the page's ONE primary action, in the content, attached to the thing
 *  it acts on -- or it is in this rail. There is no third place, and
 *  there is never a row of equal-weight pills in the content.
 *
 *  THREE BLOCKS, ALWAYS IN THIS ORDER, so the rail never reflows between
 *  states or between people:
 *
 *    Reminders     yours. Every member sees it.
 *    Running this  the Keeper's, and the only place a one-way control
 *                  exists. A member simply does not have this block; the
 *                  one above is unmoved and the one below just moves up,
 *                  so the page does not change shape depending on who you
 *                  are.
 *    People        everyone, by name. Last, because it is the only block
 *                  whose length is unbounded: with it first, Reminders
 *                  landed 1,500px down a Catch-up of twenty-four.
 *
 *  QUIET LABELS. Not the shipped rail's uppercase letterspaced headings
 *  with an icon beside each -- "IN THIS CATCH-UP", "REMINDERS",
 *  "PUBLISHED ISSUES" -- which are half of why that page reads, in his
 *  word, corporate.
 * ------------------------------------------------------------------ */

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Sprout } from "lucide-react";
import { AnimatePresence, m } from "motion/react";
import { BirdAvatar } from "@/components/common/bird-avatar";
import { EASE_OUT_SMOOTH } from "@/components/common/motion";
import { cn } from "@/lib/utils";
import type { SketchCatchup } from "./_shelf";
import type { SketchPerson } from "./_types";

/* ── one person ────────────────────────────────────────────────────── *
 *  Names, with birds beside them, and never a bird alone: "a row of birds
 *  with this plus icon ... I am not identifying the birds or the people"
 *  (para 23). The Keeper's sprout follows the name rather than sitting at
 *  the far end of the column, which stranded a single mark 180px from the
 *  person it belongs to. */
export function Person({ p, size = 30 }: { p: SketchPerson; size?: number }) {
  return (
    <span className="flex min-w-0 items-center gap-2.5">
      <BirdAvatar user={p} size={size} />
      <span className="min-w-0 truncate text-[14.5px] text-foreground">{p.name}</span>
      {p.isKeeper && <Sprout className="h-3.5 w-3.5 shrink-0 text-cinnamon" aria-label="Keeper" />}
    </span>
  );
}

/** A rail block. The label is 13px, sentence case, no icon, no rule.
 *
 *  `grows` is for the one block whose contents have no ceiling: it takes
 *  whatever height the rail has left and scrolls inside it, under a fade
 *  rather than a hard edge through the middle of a name. `min-h-0` because
 *  a flex child's automatic minimum is its content, so without it the
 *  block refuses to shrink and the rail grows past the window again. */
function Block({
  label,
  grows = false,
  after,
  children,
}: {
  label: string;
  grows?: boolean;
  /** Below the scrolling part and outside it, so a control that belongs to
   *  the block does not have to be scrolled a hundred names to reach. */
  after?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className={grows ? "flex min-h-0 flex-1 flex-col" : undefined}>
      <h2 className="mb-3 text-[13px] font-medium text-muted-foreground">{label}</h2>
      {grows ? (
        <div
          className="min-h-0 flex-1 overflow-y-auto pb-2"
          style={{
            maskImage: "linear-gradient(to bottom, black calc(100% - 28px), transparent 100%)",
            WebkitMaskImage:
              "linear-gradient(to bottom, black calc(100% - 28px), transparent 100%)",
          }}
        >
          {children}
        </div>
      ) : (
        children
      )}
      {after}
    </section>
  );
}

/* ── reminders ─────────────────────────────────────────────────────── */

const REMINDERS = ["Daily", "Last day", "Off"] as const;

function Reminders() {
  const [at, setAt] = useState<string>("Daily");
  return (
    <div className="inline-flex rounded-full border border-border bg-card p-1">
      {REMINDERS.map((r) => (
        <button
          key={r}
          type="button"
          aria-pressed={at === r}
          onClick={() => setAt(r)}
          className={cn(
            "rounded-full px-3 py-1 text-[12.5px] font-medium transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
            at === r ? "bg-canopy text-white" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {r}
        </button>
      ))}
    </div>
  );
}

/* ── running this ──────────────────────────────────────────────────── *
 *  Every control that changes the Catch-up or the Round for everybody
 *  else, and the only place any of them exists.
 *
 *  A one-way control is marked and confirms. His rule, given while
 *  looking at "Open answering" sitting under the questions: "That
 *  shouldn't be allowed. Because many people would click it by accident.
 *  Especially on a batch thing ... it seems like the kind of irreversible
 *  thing." So: never in the content, never under a thumb, always in the
 *  rail, always with a confirmation.
 *
 *  A BATCH CATCH-UP HAS NO BLOCK HERE AT ALL. Nobody keeps it, so nobody
 *  opens or closes anything: it runs on its rhythm and the only things
 *  anyone does are ask and answer. That is what makes "nobody owns it"
 *  survivable. */
type Verb = { label: string; oneWay?: boolean };

/** The Round's verbs: things about this cycle. */
function roundVerbs(c: SketchCatchup): Verb[] {
  if (!c.canRun || c.paused) return [];
  if (c.state === "collecting")
    return [{ label: "Open answering", oneWay: true }, { label: "Give everyone longer" }];
  if (c.state === "answering")
    return [
      { label: "Nudge everyone", oneWay: true },
      { label: "Give everyone longer" },
      { label: "Close and send it out", oneWay: true },
    ];
  if (c.state === "published")
    /* The control nobody had. He found it himself, making a test Catch-up:
       "literally after publishing I can't start a new round?!?! I have to
       wait for two weeks minimum, I can't prematurely start, there's no
       control for that??" Read out of the code: `openNextRoundIfDue` fires
       on the clock alone, and there is no action anywhere that starts one
       early -- for anyone, on any Catch-up. */
    return [{ label: "Start the next Round now", oneWay: true }];
  return [];
}

/** The Catch-up's verbs: things about the standing group. Rename and
 *  Change the picture do not exist in the shipped app at all; the name is
 *  the underlying group's and there is no rename action anywhere. */
function catchupVerbs(c: SketchCatchup): Verb[] {
  if (!c.youKeep) return [];
  return [
    { label: "Rename" },
    { label: "Change the picture" },
    { label: "Rhythm" },
    c.paused ? { label: "Resume" } : { label: "Hold the next Round" },
    { label: "End this Catch-up", oneWay: true },
  ];
}

function Verbs({ verbs }: { verbs: Verb[] }) {
  return (
    <ul className="space-y-1">
      {verbs.map((v) => (
        <li key={v.label}>
          <button
            type="button"
            className="state-layer -mx-2 flex w-[calc(100%+1rem)] items-center gap-2 rounded-[10px] px-2 py-1.5 text-left text-[14px] text-foreground focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring"
          >
            <span className="min-w-0 flex-1">{v.label}</span>
            {/* The mark for a control you cannot take back. Right-aligned
                so the one-way ones read as a column you can scan, rather
                than a colour on five labels at once. Each one confirms. */}
            {v.oneWay && (
              <span
                className="h-[5px] w-[5px] shrink-0 rounded-full bg-cinnamon"
                aria-label="cannot be undone"
              />
            )}
          </button>
        </li>
      ))}
    </ul>
  );
}

/** Two blocks, not one, because the two sets are answers to different
 *  questions and belong to different things: what happens to THIS Round,
 *  and what this Catch-up is. Splitting them is also what makes the
 *  rail legible to a Keeper who has both. */
function Running({ c }: { c: SketchCatchup }) {
  const round = roundVerbs(c);
  const catchup = catchupVerbs(c);
  if (round.length === 0 && catchup.length === 0) return null;
  return (
    <>
      {round.length > 0 && (
        <Block label="This Round">
          <Verbs verbs={round} />
        </Block>
      )}
      {catchup.length > 0 && (
        <Block label="This Catch-up">
          <Verbs verbs={catchup} />
        </Block>
      )}
      <p className="-mt-5 text-[12.5px] leading-snug text-muted-foreground">
        A dot means it cannot be undone.
      </p>
    </>
  );
}

/* ── the rail, on a laptop ─────────────────────────────────────────── */

export function Rail({ c }: { c: SketchCatchup }) {
  /* Controls first, people last, and the order matters. People is the
     only block whose length is unbounded -- twenty-four names on this
     Catch-up -- so with it at the top, Reminders landed 1,500px down the
     page and the rail's whole point, that a control has an address you
     can find, was lost.

     AND UNBOUNDED IS STILL UNBOUNDED, which the pressure corpus is what
     showed. At the app's hundred-person cap (`lib/catchup-caps.ts`, and
     Batch of 2023 already has 39 real members) this rail laid out 4,000px
     tall inside a 982px window -- and because it is `position: sticky`,
     everything past the first screen was not merely below the fold, it was
     unreachable at any scroll depth.

     So the rail is bounded by the window and the ONE block that can grow
     takes what is left and scrolls inside itself. The controls stay where
     they were, which is the rule this file exists for; every name is still
     there, in full, which is what `architecture.md` section 2 promises --
     "everyone, by name ... no preview, no 'and 16 more'", because he
     rejected exactly that fold (R2). A roster you scroll is not a roster
     you have to ask for. */
  return (
    <div
      className="flex flex-col gap-9 overflow-hidden"
      /* The window, less the 40px the rail is pinned at, the 24px of
         padding above it and a 40px breath at the foot. */
      style={{ maxHeight: "calc(100dvh - 104px)" }}
    >
      <Block label="Reminders">
        <Reminders />
      </Block>
      <Running c={c} />
      <Block
        label="People"
        grows
        after={
          c.kind === "people" && c.youKeep ? (
            <button
              type="button"
              className="state-layer -mx-2 mt-2 self-start rounded-[10px] px-2 py-1.5 text-[14px] font-medium text-canopy focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring"
            >
              Add someone
            </button>
          ) : null
        }
      >
        <ul className="space-y-2.5">
          {c.members.map((p) => (
            <li key={p.id}>
              <Person p={p} size={30} />
            </li>
          ))}
        </ul>
      </Block>
    </div>
  );
}

/* ── the rail, on a phone ──────────────────────────────────────────── *
 *  Two controls in the head, and each opens the same content as a full
 *  sheet over the page. His, 2026-09-07: "on phone the people can just
 *  open into an overlay instead of cluttering that content. And maybe
 *  move it somewhere else, maybe above, instead of having it on its own
 *  line."
 *
 *  So they sit on the head's own line, beside the name, rather than
 *  taking a row of their own; and they are words, not three dots, because
 *  "those 3 dots, I would never be able to see them. They're just tucked
 *  away in some corner." */
export function PhoneRail({ c }: { c: SketchCatchup }) {
  const [open, setOpen] = useState<null | "people" | "run">(null);
  const verbs = [...roundVerbs(c), ...catchupVerbs(c)];
  return (
    <>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <button
          type="button"
          onClick={() => setOpen("people")}
          className="text-[13.5px] font-medium text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          People
        </button>
        <button
          type="button"
          onClick={() => setOpen("run")}
          className="text-[13.5px] font-medium text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          {c.youKeep ? "You keep this" : "Reminders"}
        </button>
      </div>
      <Sheet open={open !== null} onClose={() => setOpen(null)}>
        {open === "people" ? (
          <Block label="People">
            <ul className="space-y-3">
              {c.members.map((p) => (
                <li key={p.id}>
                  <Person p={p} size={32} />
                </li>
              ))}
            </ul>
          </Block>
        ) : (
          <div className="space-y-8">
            <Block label="Reminders">
              <Reminders />
            </Block>
            {verbs.length > 0 && <Running c={c} />}
          </div>
        )}
      </Sheet>
    </>
  );
}

/** A sheet over the WINDOW, dismissed by the scrim, by Escape, or by
 *  swiping it down. Never a dialog that stays put when you tap elsewhere:
 *  "that dialog doesn't disappear when I click anywhere else."
 *
 *  `fixed`, not `absolute`. Absolute pins it to the bottom of the PAGE,
 *  so opening it after scrolling put it below the fold; that used to be
 *  unavoidable in this room because everything sat inside a scaling
 *  transform, and it is not any more. */
function Sheet({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  const body = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <m.button
            type="button"
            aria-label="Close"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: EASE_OUT_SMOOTH }}
            className="fixed inset-0 z-40 bg-black/30"
          />
          <m.div
            ref={body}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ duration: 0.3, ease: EASE_OUT_SMOOTH }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 90 || info.velocity.y > 600) onClose();
            }}
            className="fixed inset-x-0 bottom-0 z-50 mx-auto max-h-[76dvh] w-full max-w-[430px] overflow-y-auto rounded-t-[20px] border-t border-border bg-card"
            style={{ paddingBottom: "max(24px, env(safe-area-inset-bottom))" }}
          >
            <div className="sticky top-0 flex justify-center bg-card pb-2 pt-2.5">
              <span className="h-1 w-9 rounded-full bg-border" />
            </div>
            <div className="px-5 pt-2">{children}</div>
          </m.div>
        </>
      )}
    </AnimatePresence>
  );
}
