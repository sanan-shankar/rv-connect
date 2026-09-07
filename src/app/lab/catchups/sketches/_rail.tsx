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
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Archive,
  Bell,
  BellRing,
  CalendarClock,
  Image as ImageIcon,
  Inbox,
  LogOut,
  Pause as PauseIcon,
  PenLine,
  Play,
  Repeat,
  Send,
  SlidersHorizontal,
  Sprout,
  Type,
  Users,
  type LucideIcon,
} from "lucide-react";
import { CaretRight } from "@phosphor-icons/react";
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
  /* A LINK, all of it. His, 2026-09-07: "under people all the profiles should
     be clickable and take you to their profile." A name and a face in this app
     always go to the person -- the feed's byline, the directory's card, an
     answer's author -- and this roster was the one place they did not, which
     made the sheet a dead end you had to back out of to find anybody. */
  /* A PLAIN <a>, not next/link, and only because this is the lab. Measured
     2026-09-07: a client-side navigation from `/lab/...` into `(main)/...`
     crosses two different layout trees, and the `(main)` layout does not take
     over -- the profile arrived with `main` at left 0 and width 1512 instead
     of left 248 and width 1264, i.e. drawn without the app's sidebar, which is
     what he saw: "their tile wasn't in the right spot. it was weirdly off to
     the side but when I reloaded the page it was all fine."

     Nothing is wrong with the profile, and nothing here will be wrong in the
     shipped version: this roster lives inside `(main)` there, so a <Link> from
     it stays in the same layout tree and is the right thing. It is only the
     lab, sitting outside that tree, that has to leave it by a full page load.
     Whoever ships this should use next/link. */
  return (
    <a
      href={`/profile/${p.id}`}
      className="state-layer -mx-2 flex min-w-0 items-center gap-2.5 rounded-full px-2 py-1 transition-opacity duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      <BirdAvatar user={p} size={size} />
      <span className="min-w-0 truncate text-[14.5px] text-foreground">{p.name}</span>
      {p.isKeeper && <Sprout className="h-3.5 w-3.5 shrink-0 text-cinnamon" aria-label="Keeper" />}
    </a>
  );
}

/** A rail block. The label is 13px, sentence case, no icon, no rule. */
function Block({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 font-sans text-[13px] font-medium text-muted-foreground">{label}</h2>
      {children}
    </section>
  );
}

/* ── running this ──────────────────────────────────────────────────── *
 *  Every control that changes the Catch-up or the Round for everybody else,
 *  and the only place any of them exists.
 *
 *  A one-way control SAYS SO, in its own words, on its own row, and that is
 *  the whole of the accident rule: "Can anyone open answering? That shouldn't
 *  be allowed. Because many people would click it by accident. Especially on
 *  a batch thing ... it seems like the kind of irreversible thing." The first
 *  draw put a 5px cinnamon dot at the end of the row and a footnote under the
 *  list explaining what the dot meant, which is a legend for a chart nobody
 *  asked for. The row carries the words now and the footnote is gone.
 *
 *  A BATCH CATCH-UP HAS NO ROUND CONTROLS AT ALL. Nobody keeps it, so nobody
 *  opens or closes anything: it runs on its rhythm and the only things anyone
 *  does are ask and answer. */
type Verb = {
  label: string;
  /** What it does, in a phrase. A settings row that is only a verb makes you
   *  open it to find out, which is the "takes some effort" he objects to. */
  hint: string;
  icon: LucideIcon;
  oneWay?: boolean;
  /** The current answer, on the right, for the rows that have one. */
  value?: string;
};

function roundVerbs(c: SketchCatchup): Verb[] {
  if (!c.canRun || c.paused) return [];
  if (c.state === "collecting")
    return [
      { label: "Open answering", hint: "Stop taking questions, start writing", icon: PenLine, oneWay: true },
      { label: "Give everyone longer", hint: "Push the deadline back a week", icon: CalendarClock },
    ];
  if (c.state === "answering")
    return [
      { label: "Nudge everyone", hint: "One reminder to whoever has not", icon: BellRing, oneWay: true },
      { label: "Give everyone longer", hint: "Push the deadline back a week", icon: CalendarClock },
      { label: "Close and send it out", hint: "Publish now, before the deadline", icon: Send, oneWay: true },
    ];
  if (c.state === "published")
    /* The control nobody had. He found it himself: "literally after publishing
       I can't start a new round?!?! I have to wait for two weeks minimum ...
       there's no control for that??" Confirmed in the code: openNextRoundIfDue
       fires on the clock alone and nothing starts one early, for anyone. */
    return [{ label: "Start the next Edition now", hint: "Do not wait for the rhythm", icon: Play, oneWay: true }];
  return [];
}

function catchupVerbs(c: SketchCatchup): Verb[] {
  if (!c.youKeep) return [];
  return [
    { label: "Name", hint: "What everyone sees it called", icon: Type, value: c.name },
    { label: "Picture", hint: "The photograph on its card and header", icon: ImageIcon },
    { label: "Rhythm", hint: "How often an Edition comes round", icon: Repeat, value: c.meta.split("\u00b7").pop()?.trim() ?? "" },
    c.paused
      ? { label: "Start it again", hint: "Let the clock run", icon: Play }
      : { label: "Hold the next Edition", hint: "Nothing goes out until you say", icon: PauseIcon },
    { label: "End this Catch-up", hint: "Everything stays readable. Nothing new starts", icon: Archive, oneWay: true },
  ];
}

/* ── one settings row ──────────────────────────────────────────────── *
 *  Four things in a fixed order, which is the app's grammar for a settings
 *  list and also iOS's: a mark, what it is called, what it does, and where it
 *  stands. The first draw had only the second -- a column of bare verbs --
 *  and he was right about it twice: "just having a bunch of commands just
 *  hanging in space, not really in any organization", then "it's very bare
 *  bones and not very user friendly or pretty."
 *
 *  The icon tile gives the column a left edge to scan, so the eye lands on
 *  shape before it reads a word. The hint stops a verb needing to be opened
 *  to be understood. The value on the right is what makes it a settings panel
 *  rather than a menu. */
function Row({ v, onPick }: { v: Verb; onPick?: () => void }) {
  const Icon = v.icon;
  return (
    <button
      type="button"
      onClick={onPick}
      className="state-layer -mx-2 flex w-[calc(100%+1rem)] items-center gap-3 rounded-[12px] px-2 py-2 text-left focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring"
    >
      <span
        className={cn(
          "grid h-8 w-8 shrink-0 place-items-center rounded-[10px]",
          v.oneWay ? "bg-cinnamon/[0.12] text-cinnamon" : "bg-muted text-muted-foreground",
        )}
      >
        <Icon className="h-[16px] w-[16px]" strokeWidth={1.9} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[14.5px] text-foreground">{v.label}</span>
        <span
          className={cn(
            "mt-0.5 block truncate text-[12.5px]",
            v.oneWay ? "text-cinnamon/90" : "text-muted-foreground",
          )}
        >
          {v.oneWay ? `${v.hint}. Cannot be undone` : v.hint}
        </span>
      </span>
      {/* The value and the chevron, never one or the other: with some rows
          ending in a word and some in a glyph the right-hand edge went ragged
          and the list stopped reading as a column. */}
      {v.value && (
        <span className="max-w-[34%] shrink-0 truncate text-[13px] text-muted-foreground">
          {v.value}
        </span>
      )}
      <CaretRight size={13} weight="bold" className="shrink-0 text-muted-foreground/70" />
    </button>
  );
}

/* ── reminders ─────────────────────────────────────────────────────── *
 *  A row among the other settings, not a block of its own with a segmented
 *  pill in it. His: "I hate the reminders pill ... reminders I feel can go
 *  with the other settings. I don't know why we're separating it. Because it
 *  is as important as any other setting. Just because it was separated in the
 *  shipped version doesn't mean we have to separate it now." */
const REMINDERS = ["Daily", "On the last day", "Never"] as const;

function ReminderRow() {
  const [at, setAt] = useState(0);
  return (
    <Row
      v={{
        label: "Reminders",
        hint: "While an Edition is open for answers",
        icon: Bell,
        value: REMINDERS[at],
      }}
      onPick={() => setAt((i) => (i + 1) % REMINDERS.length)}
    />
  );
}

/** A titled group. Sentence case, no rule, no uppercase tracking: that
 *  register is half of why the shipped panel reads, in his word, corporate. */
function Group({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section>
      {/* A label, so sans: globals.css puts the heading face on every h3,
          and the rule in _home.tsx is that the serif is for titles and names. */}
      <h3 className="mb-1.5 px-2 font-sans text-[12.5px] font-medium text-muted-foreground">
        {label}
      </h3>
      <div className="space-y-0.5">{children}</div>
    </section>
  );
}

function Running({ c }: { c: SketchCatchup }) {
  const round = roundVerbs(c);
  const catchup = catchupVerbs(c);
  return (
    <div className="space-y-6">
      {round.length > 0 && (
        <Group label="This Edition">
          {round.map((v) => (
            <Row key={v.label} v={v} />
          ))}
        </Group>
      )}
      {catchup.length > 0 && (
        <Group label="This Catch-up">
          {catchup.map((v) => (
            <Row key={v.label} v={v} />
          ))}
        </Group>
      )}
      <Group label="You">
        <ReminderRow />
        <Row
          v={{
            label: c.kind === "batch" ? "Put it away" : "Leave",
            hint:
              c.kind === "batch"
                ? "It stops showing on your list. Your batch keeps it"
                : "You stop getting Editions. What you wrote stays",
            icon: c.kind === "batch" ? Inbox : LogOut,
            oneWay: c.kind === "people",
          }}
        />
      </Group>
    </div>
  );
}

/* ── a control that sits ON the picture ────────────────────────────── *
 *  One shape, two of them, hard right along the picture's foot with the
 *  Catch-up's name at the other end. His, 2026-09-07: "instead of people and
 *  settings keep the buttons in the same style but use the icons instead of
 *  text ... let the name of the catch up be from bottom left of the picture.
 *  same on laptop."
 *
 *  The word survives in `aria-label` and in the tooltip, which is the right
 *  trade for a control whose whole job is to leave the photograph alone. It is
 *  40px square, which is the app's own smallest comfortable target and the
 *  same box `size="icon-sm"` draws elsewhere, so a thumb has something to land
 *  on even at the phone's 117px picture height. */
function PictureDoor({
  label,
  icon: Icon,
  onClick,
}: {
  label: string;
  icon: typeof Users;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/35 bg-black/25 text-white backdrop-blur-[2px] transition-colors duration-150 hover:bg-black/45 active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
    >
      <Icon className="h-[17px] w-[17px]" strokeWidth={1.9} />
    </button>
  );
}

/* ── the way to the people ─────────────────────────────────────────── *
 *  A word on the picture, and a dialog behind it. Not three dots: "those 3
 *  dots, I would never be able to see them. They're just tucked away in some
 *  corner." It is white on the picture's own dark fade, with a hairline, so
 *  it reads as a control against a photograph rather than as a caption.
 *
 *  On a phone the same word opens a sheet from the foot, because a dialog
 *  centred in a 390px window is a sheet with worse manners. */
export function PeopleDoor({ c, phone }: { c: SketchCatchup; phone: boolean }) {
  const [open, setOpen] = useState(false);
  const trigger = <PictureDoor label="People" icon={Users} onClick={() => setOpen(true)} />;

  const list = (
    <ul className={cn("gap-x-6 gap-y-3", phone ? "space-y-3" : "grid grid-cols-2")}>
      {c.members.map((p) => (
        <li key={p.id}>
          <Person p={p} size={32} />
        </li>
      ))}
    </ul>
  );

  const add = c.kind === "people" && c.youKeep;

  if (phone) {
    return (
      <>
        {trigger}
        <Sheet open={open} onClose={() => setOpen(false)}>
          <Block label="People">{list}</Block>
          {add && (
            <button
              type="button"
              className="state-layer -mx-2 mt-3 rounded-[10px] px-2 py-1.5 text-[14px] font-medium text-canopy focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring"
            >
              Add someone
            </button>
          )}
        </Sheet>
      </>
    );
  }

  return (
    <>
      {trigger}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-heading text-[19px]">People</DialogTitle>
          </DialogHeader>
          <div className="max-h-[52dvh] overflow-y-auto pr-1">{list}</div>
          {add && (
            <div>
              <Button variant="outline" size="sm">
                Add someone
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

/* ── the way to the settings ───────────────────────────────────────── *
 *  The second word on the picture, beside People, in the same clothes.
 *
 *  It exists because the sidebar no longer does. Every control that changes
 *  the Catch-up or the Round for everybody else is behind it, grouped, with
 *  the cinnamon dot still marking the ones that cannot be taken back -- which
 *  is the rule from the accident note (N30) and does not change with the
 *  furniture.
 *
 *  Words rather than a gear or three dots, for his reason: "those 3 dots, I
 *  would never be able to see them. They're just tucked away in some corner."
 *
 *  ONE THING STILL OPEN, and it is his: "I don't want everything in the
 *  separated thing. Honestly, the sidebar in the shipped version has some
 *  settings outside, some not, that is much nicer than this." Everything is
 *  inside here at the moment. Which one or two belong outside it, on the page,
 *  is a question for him rather than a thing to guess. */
export function SettingsDoor({ c, phone }: { c: SketchCatchup; phone: boolean }) {
  const [open, setOpen] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const trigger = (
    <PictureDoor label="Settings" icon={SlidersHorizontal} onClick={() => setOpen(true)} />
  );
  if (phone) {
    return (
      <>
        {trigger}
        <Sheet open={open} onClose={() => setOpen(false)}>
          <div className="space-y-8">
            <Running c={c} />
          </div>
        </Sheet>
      </>
    );
  }
  return (
    <>
      {trigger}
      <Dialog open={open} onOpenChange={setOpen}>
        {/* `initialFocus` on the panel itself. Without it Base UI focuses the
            first focusable child, which here is a settings row -- so the
            dialog opened with "Start the next Round now" wearing a focus ring
            and a selected tint, i.e. the one control in the list that cannot
            be undone looked armed. */}
        <DialogContent className="sm:max-w-md" initialFocus={panel} ref={panel} tabIndex={-1}>
          <DialogHeader>
            <DialogTitle className="font-heading text-[19px]">Settings</DialogTitle>
          </DialogHeader>
          <div className="max-h-[62dvh] overflow-y-auto pr-1">
            <Running c={c} />
          </div>
        </DialogContent>
      </Dialog>
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
