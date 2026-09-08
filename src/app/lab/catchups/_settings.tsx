"use client";

/* ------------------------------------------------------------------ *
 *  A Catch-up's settings, and every dialog the list can open.
 *
 *  WHAT THIS REPLACED, and why. The first settings list was iOS's
 *  top-level Settings grammar transplanted whole: a rounded tile with a
 *  16px glyph in it at the head of every row. iOS gets away with that
 *  because each of those tiles is a different app's icon -- full colour,
 *  instantly told apart, and the only thing distinguishing one row from
 *  the next. Nine near-identical beige squares in a column carry no
 *  information at all, and they are the named failure: "it's just too
 *  many pills, man ... it's not invisible design. You just notice it
 *  being actively bad." Then, on the tiles themselves, 2026-09-09: "I
 *  don't like the brown outlines for those icons, like the icons have
 *  that brown background. I don't like that brown. I think that's
 *  probably my main gripe with it."
 *
 *  Apple's own answer, for settings INSIDE an app rather than the list of
 *  apps, is a grouped table with no icons: a label, a value, a chevron.
 *  So the tiles are gone, and with them every container in this panel.
 *  There is no tile, no rule, no card inside the card. What organises it
 *  is type, space and one left edge. That is the higher level of
 *  abstraction the brief asked for: the panel stops drawing objects and
 *  starts setting text.
 *
 *  THE ONE IDEA UNDER IT. A Catch-up's settings are the Catch-up
 *  described, and some of those descriptions you may change. So "This
 *  Catch-up" holds THE SAME THREE ROWS for everybody -- Name, Picture,
 *  Rhythm -- and who you are decides which of them open. A row you may
 *  not change still states its answer; it just has no chevron and does
 *  not press.
 *
 *  That is what fixes the batch case. A batch Catch-up used to come out
 *  as a single row, which is correct and looks like a mistake, because
 *  every row a Keeper holds was simply omitted. Now it is the same panel
 *  with two rows sealed, which also happens to say the thing he wanted
 *  said without a sentence teaching it: "the batch catch-up, you don't
 *  add members. The members are fixed. They're the people in your
 *  fucking batch, right?"
 *
 *  COLOUR. Cinnamon appears twice in the whole flow and nowhere else: on
 *  the words "Cannot be undone" in a row's value column, and as the fill
 *  of the button that does the thing. His note, 2026-09-09: "I don't know
 *  if the way to highlight the dangerous ones is to make the icon and the
 *  subtitle orange. Something that doesn't seem right about that. It
 *  seems not right with all three." Three coloured things become one, and
 *  the one is language rather than a symbol needing a legend.
 *
 *  Three dialog shapes, and only three. A CONFIRMATION (title, one line,
 *  Cancel then the verb), a CHOOSER (title, options, picking closes it),
 *  and an EDITOR (title, one field, Cancel then Save). Everything a row
 *  opens is one of them, so nothing in here is designed one at a time --
 *  which is how twelve horizontal rules and a pill inside a pill happened
 *  the first time.
 * ------------------------------------------------------------------ */

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Check, ImageUp, SlidersHorizontal, X } from "lucide-react";
import { CaretRight } from "@phosphor-icons/react";
import { AnimatePresence, animate, m, useMotionValue } from "motion/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { EASE_OUT_SMOOTH } from "@/components/common/motion";
import { CATCHUP_PICTURES, PICTURE_BAND_RATIO } from "@/lib/catchup-pictures";
import { cn } from "@/lib/utils";
import type { SketchCatchup } from "./sketches/_shelf";

/* ── what a row is ─────────────────────────────────────────────────── */

/** Which of the three dialog shapes a row opens, and with what in it. */
export type Opens =
  | { shape: "confirm"; key: ConfirmKey }
  | { shape: "choose"; key: "rhythm" | "reminders" }
  | { shape: "edit"; key: "name" }
  | { shape: "picture" };

export type ConfirmKey =
  | "open-answering"
  | "extend"
  | "nudge"
  | "close-now"
  | "start-next"
  | "hold"
  | "resume"
  | "end"
  | "leave"
  | "put-away";

type Row = {
  key: string;
  label: string;
  /** What it does, in a phrase. Capped at 42 characters, which is what
   *  fits on one line at 390 without an ellipsis -- his: "some of the
   *  text wraps ... it doesn't wrap, it [truncates] into the dots. And
   *  that means I literally can't see the description because it's given
   *  nowhere else. So maybe we just have to change the copy." */
  hint: string;
  /** Where it stands, right-aligned on the label's own line. */
  value?: string;
  /** A value that is somebody's own words rather than the app's
   *  vocabulary, so it is set in the serif. The type rule from the home:
   *  serif is a title or a name, sans is the app talking. */
  valueIsName?: boolean;
  oneWay?: boolean;
  /** Absent means this row states a fact and does not press. */
  opens?: Opens;
};

type Group = { label: string; rows: Row[] };

/* ── the rows, one table, three permission sets ────────────────────── */

/** The rhythm in words, off the Catch-up's own meta line. */
function rhythmOf(c: SketchCatchup): string {
  const tail = c.meta.split("·").pop()?.trim() ?? "";
  return tail ? tail[0].toUpperCase() + tail.slice(1) : "";
}

/** This Edition: the Keeper's controls over the clock, and the only
 *  place a one-way control over other people's time exists. A batch
 *  Catch-up has no manual transitions at all, so this group is simply
 *  absent on one -- nobody keeps it, it runs on its rhythm. */
function editionGroup(c: SketchCatchup): Group | null {
  if (!c.canRun || c.paused) return null;
  const rows: Row[] =
    c.state === "collecting"
      ? [
          {
            key: "open-answering",
            label: "Open answering",
            hint: "Stop taking questions, start writing",
            oneWay: true,
            opens: { shape: "confirm", key: "open-answering" },
          },
          {
            key: "extend",
            label: "Give everyone longer",
            hint: "Push the deadline back a week",
            opens: { shape: "confirm", key: "extend" },
          },
        ]
      : c.state === "answering"
        ? [
            {
              key: "extend",
              label: "Give everyone longer",
              hint: "Push the deadline back a week",
              opens: { shape: "confirm", key: "extend" },
            },
            {
              key: "nudge",
              label: "Nudge everyone",
              hint: "One reminder to whoever has not",
              oneWay: true,
              opens: { shape: "confirm", key: "nudge" },
            },
            {
              key: "close-now",
              label: "Close and send it out",
              hint: "Publish now, before the deadline",
              oneWay: true,
              opens: { shape: "confirm", key: "close-now" },
            },
          ]
        : c.state === "published"
          ? [
              {
                key: "start-next",
                label: "Start the next Edition now",
                hint: "Do not wait for the rhythm",
                oneWay: true,
                opens: { shape: "confirm", key: "start-next" },
              },
            ]
          : [];
  return rows.length ? { label: "This Edition", rows } : null;
}

/** This Catch-up: the same three rows for everybody, then the Keeper's
 *  two. Name, Picture and Rhythm are what the Catch-up IS, so they are
 *  stated whether or not you may change them. */
function catchupGroup(c: SketchCatchup, rhythm: string): Group {
  /* Anyone in a batch may replace its picture (his answer, 2026-09-07:
     "anyone can replace the batch picture"); on a people Catch-up it is
     the Keeper's, like the name and the rhythm. */
  const mayPicture = c.youKeep || c.kind === "batch";
  const rows: Row[] = [
    {
      key: "name",
      label: "Name",
      hint: "What everyone sees it called",
      value: c.name,
      valueIsName: true,
      opens: c.youKeep ? { shape: "edit", key: "name" } : undefined,
    },
    {
      key: "picture",
      label: "Picture",
      hint: "The photograph on its card and header",
      opens: mayPicture ? { shape: "picture" } : undefined,
    },
    {
      key: "rhythm",
      label: "Rhythm",
      hint: "How often an Edition comes round",
      value: rhythm || rhythmOf(c),
      opens: c.youKeep ? { shape: "choose", key: "rhythm" } : undefined,
    },
  ];
  if (c.youKeep && c.state !== "ended") {
    rows.push(
      c.paused
        ? {
            key: "resume",
            label: "Start it again",
            hint: "Let the clock run",
            opens: { shape: "confirm", key: "resume" },
          }
        : {
            key: "hold",
            label: "Hold the next Edition",
            hint: "Nothing goes out until you say",
            opens: { shape: "confirm", key: "hold" },
          },
    );
    rows.push({
      key: "end",
      label: "End this Catch-up",
      hint: "Nothing new starts. It stays readable",
      oneWay: true,
      opens: { shape: "confirm", key: "end" },
    });
  }
  return { label: "This Catch-up", rows };
}

/** You: the two that are nobody else's business. Reminders is a row here
 *  rather than a block of its own -- "reminders I feel can go with the
 *  other settings. I don't know why we're separating it. Because it is as
 *  important as any other setting." */
function youGroup(c: SketchCatchup, reminder: string): Group {
  const batch = c.kind === "batch";
  return {
    label: "You",
    rows: [
      {
        key: "reminders",
        label: "Reminders",
        hint: "While an Edition is open for answers",
        value: reminder,
        opens: { shape: "choose", key: "reminders" },
      },
      batch
        ? {
            key: "put-away",
            label: "Put it away",
            hint: "It stops showing on your list",
            opens: { shape: "confirm", key: "put-away" },
          }
        : {
            key: "leave",
            label: "Leave",
            hint: "You stop getting Editions",
            oneWay: true,
            opens: { shape: "confirm", key: "leave" },
          },
    ],
  };
}

export function settingsGroups(c: SketchCatchup, reminder: string, rhythm = ""): Group[] {
  const edition = editionGroup(c);
  return [...(edition ? [edition] : []), catchupGroup(c, rhythm), youGroup(c, reminder)];
}

/* ── one row ───────────────────────────────────────────────────────── *
 *  Two lines. The label and its value share the first, because together
 *  they are "what this is and where it stands"; the hint gets the second
 *  ON ITS OWN, full width, which is the whole reason nothing truncates
 *  any more. The old row put the label, the hint and the value on one
 *  line each fighting for 341px, and the hint lost.
 *
 *  A one-way control's value is its price: "Cannot be undone", in the
 *  column that already holds the answer to "where does this stand". Its
 *  own words on its own row rather than the tail of a sentence, which is
 *  what was truncating at BOTH widths. */
function SettingRow({ r, onOpen }: { r: Row; onOpen: (o: Opens) => void }) {
  const value = r.oneWay ? "Cannot be undone" : r.value;
  const body = (
    <>
      <span className="flex min-w-0 items-baseline gap-3">
        <span className="min-w-0 flex-1 truncate text-[15px] text-foreground">{r.label}</span>
        {value && (
          <span
            className={cn(
              "max-w-[52%] shrink-0 truncate text-[13.5px]",
              r.oneWay ? "text-cinnamon" : "text-muted-foreground",
              r.valueIsName && "font-heading",
            )}
          >
            {value}
          </span>
        )}
      </span>
      <span className="mt-[3px] block truncate text-[13px] text-muted-foreground">{r.hint}</span>
    </>
  );

  /* A fact, not a control: no chevron, no state layer, nothing to press.
     This is the row a batch Catch-up's Name and Rhythm become, and it is
     how the panel says "fixed" without a sentence explaining it. */
  if (!r.opens) {
    return (
      <div className="flex items-center gap-3 px-2 py-2.5">
        <span className="min-w-0 flex-1">{body}</span>
        {/* A blank the width of a chevron, so a sealed row's value stays
            in the same column as an openable one's. Without it the right
            edge of the list went ragged wherever a batch sealed a row. */}
        <span aria-hidden className="w-[13px] shrink-0" />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onOpen(r.opens!)}
      className="state-layer -mx-2 flex w-[calc(100%+1rem)] items-center gap-3 rounded-[12px] px-2 py-2.5 text-left focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring"
    >
      <span className="min-w-0 flex-1">{body}</span>
      <CaretRight size={13} weight="bold" className="shrink-0 text-muted-foreground/70" />
    </button>
  );
}

/* ── the panel ─────────────────────────────────────────────────────── *
 *  The head of each group is 14px medium on the FOREGROUND, and it starts
 *  at exactly the same x as every label under it. Both of those are his,
 *  2026-09-09: "this edition, this catch up font way too small", and
 *  "This Catch-up, You -- are things really aligned to anything? They're
 *  just randomly hanging there." They were not: the head sat 8px inside
 *  the row's icon tile and 44px outside its label, so it lined up with
 *  neither.
 *
 *  24px between groups and 12px inside one, which is the number the
 *  design system already settled for a dialog's sections and names the
 *  keeper settings dialog as its worked example. No rules drawn: "the gap
 *  is the warning."
 *
 *  THE HORIZONTAL SCROLL, measured before it was fixed. The scroll region
 *  carried `pr-1` and each row bled 8px past it on both sides, so a row
 *  ran 426px wide inside a 414px box and the panel scrolled sideways by
 *  4px -- "I can scroll left to right on the settings dialog." The bleed
 *  is now 8px inside a 12px pad, so the row can never reach the edge. */
export function SettingsPanel({
  c,
  reminder,
  rhythm = "",
  onOpen,
  className,
}: {
  c: SketchCatchup;
  reminder: string;
  /** The rhythm as this session has changed it, if it has. Empty means
   *  the Catch-up's own. */
  rhythm?: string;
  onOpen: (o: Opens) => void;
  className?: string;
}) {
  return (
    <div className={cn("-mx-3 space-y-7 overflow-y-auto px-3", className)}>
      {settingsGroups(c, reminder, rhythm).map((g) => (
        <section key={g.label}>
          {/* A label, so sans: globals.css puts the heading face on h3, and
              the type rule is that the serif is for titles and names. */}
          {/* NO horizontal padding, and that is the whole of his "This
              Catch-up, You -- are things really aligned to anything?" The head
              used to carry px-2 while the row it heads carries -mx-2 px-2, so
              the head's text landed 8px right of every label under it and
              lined up with nothing on the panel. Measured at 1512: head 222.7,
              labels 214.7. */}
          <h3 className="mb-2 font-sans text-[14px] font-medium text-foreground">{g.label}</h3>
          <div className="space-y-px">
            {g.rows.map((r) => (
              <SettingRow key={r.key} r={r} onOpen={onOpen} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

/* ── the sheet ─────────────────────────────────────────────────────── *
 *  Every one of these is his, 2026-09-09:
 *
 *    "Anytime we have this dialogue that pops up from the bottom, I don't
 *     want it to be controlled by that pill on that very thin pill on
 *     top. I want it to be controlled by an x. And it doesn't say
 *     settings. Also, I'd like it to say Settings on the top left and
 *     then have the x on the top right."
 *
 *    "And also I'd like you to be able to bring it down by swiping down
 *     on it if you were at the top. So if you're at the top and you have
 *     no more scrolling to do, then when you swipe down, it should just
 *     bring the dialogue down."
 *
 *  THE SECOND ONE IS WHY THIS DOES NOT USE `drag`. The sheet's body IS
 *  the scroller, so an unconditional drag eats every upward flick and the
 *  list cannot be read. Framer's own escape hatch, `dragListener={false}`
 *  plus `dragControls.start()` from a pointermove, was built and driven
 *  and does not work here either: the moment a finger moves on a
 *  scrollable box Chrome takes the gesture for scrolling and fires
 *  `pointercancel`, so the pointermove that would have started the drag
 *  never arrives. Measured -- a real touch sequence down the sheet left
 *  it exactly where it was.
 *
 *  So the gesture is read from the touch events directly, non-passively,
 *  and the sheet's y is a motion value this moves by hand:
 *
 *    the body is at scrollTop 0 AND the finger has travelled 6px DOWN
 *      -> preventDefault, and the sheet follows the finger
 *    anything else
 *      -> not our gesture; the list scrolls and the sheet never moves
 *
 *  6px because below that a tap's own jitter starts the drag and the
 *  sheet twitches under a press. 90px or a fast flick lets go of it,
 *  which is the same threshold the old drag used.
 *
 *  The enter and exit slide live on the OUTER element and the gesture on
 *  the inner one, because a motion value in `style.y` and an `animate`
 *  on the same axis fight over one transform. */
export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  const body = useRef<HTMLDivElement>(null);
  const y = useMotionValue(0);

  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [open, onClose]);

  useEffect(() => {
    const el = body.current;
    if (!open || !el) return;
    y.set(0);

    let from = 0;
    let armed = false;
    let dragging = false;
    let last = 0;
    let lastAt = 0;
    let speed = 0;

    /* A mouse never gets its gesture stolen by the scroller, so it can go
       through the same handlers; this is what makes the sheet draggable in
       the lab at a laptop width, where there is no other way to see it. */
    const at = (e: TouchEvent | MouseEvent) =>
      "touches" in e ? (e.touches[0]?.clientY ?? last) : e.clientY;

    const down = (e: TouchEvent | MouseEvent) => {
      from = at(e);
      last = from;
      lastAt = performance.now();
      speed = 0;
      armed = el.scrollTop <= 0;
      dragging = false;
    };

    const move = (e: TouchEvent | MouseEvent) => {
      if (!armed) return;
      const now = at(e);
      const dy = now - from;
      if (!dragging) {
        if (dy < 6) return;
        dragging = true;
      }
      e.preventDefault();
      const t = performance.now();
      if (t > lastAt) speed = ((now - last) / (t - lastAt)) * 1000;
      last = now;
      lastAt = t;
      y.set(Math.max(0, dy));
    };

    const up = () => {
      armed = false;
      if (!dragging) return;
      dragging = false;
      if (y.get() > 90 || speed > 600) onClose();
      else animate(y, 0, { duration: 0.24, ease: EASE_OUT_SMOOTH });
    };

    el.addEventListener("touchstart", down, { passive: true });
    el.addEventListener("touchmove", move, { passive: false });
    el.addEventListener("touchend", up);
    el.addEventListener("touchcancel", up);
    el.addEventListener("mousedown", down);
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    return () => {
      el.removeEventListener("touchstart", down);
      el.removeEventListener("touchmove", move);
      el.removeEventListener("touchend", up);
      el.removeEventListener("touchcancel", up);
      el.removeEventListener("mousedown", down);
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
  }, [open, onClose, y]);

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
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ duration: 0.3, ease: EASE_OUT_SMOOTH }}
            className="fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-[430px]"
          >
            <m.div
              style={{ y, paddingBottom: "max(20px, env(safe-area-inset-bottom))" }}
              className="flex max-h-[80dvh] w-full flex-col rounded-t-[20px] border-t border-border bg-card"
            >
              <SheetHead title={title} onClose={onClose} />
              {/* `overscroll-contain` so a flick that runs out of list does
                  not hand the scroll to the page behind the sheet. */}
              <div
                ref={body}
                className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pt-1"
              >
                {children}
              </div>
            </m.div>
          </m.div>
        </>
      )}
    </AnimatePresence>
  );
}

/** The sheet's head: the name of the surface at the leading edge, the way
 *  out at the trailing one, on one line. The same anatomy the dialog
 *  material already draws on a laptop, so a phone and a laptop are not
 *  two designs. */
function SheetHead({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div className="flex items-center justify-between gap-2 py-2 pl-4 pr-2">
      {/* 16px medium heading face, which is the dialog material's own
          DialogTitle, not a per-surface size. The lab's settings dialog
          had been setting 19px by hand, and a per-dialog title size is
          the exact thing DESIGN-SYSTEM.md forbids. */}
      <h2 className="font-heading text-base leading-none font-medium">{title}</h2>
      <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close">
        <X />
      </Button>
    </div>
  );
}

/* ── the three dialog shapes ───────────────────────────────────────── */

/** A one-way act's button. The app has no cinnamon variant, because until
 *  now nothing needed one: `destructive` is the red wash, and none of
 *  these destroys anything -- an ended Catch-up stays readable, a left
 *  Catch-up keeps every word you wrote. Shipping this means a `oneWay`
 *  variant in ui/button.tsx built exactly like `destructive`; here it is
 *  a class, so the lab can show it without moving a shared file. */
const ONE_WAY_BUTTON = "bg-cinnamon/10 text-cinnamon hover:bg-cinnamon/20";

/* ── the dialog material, drawn without a dialog ───────────────────── *
 *  The room shows all four confirmations at once, side by side, because
 *  the point of doing them in one session is seeing them together. Base
 *  UI's DialogTitle throws outside a Dialog, so `flat` swaps the two
 *  primitives for a plain h2 and p carrying the SAME classes the material
 *  gives them. Nothing else about a body changes between the two frames,
 *  which is what stops the exhibit and the real thing drifting. */
export function Head({
  flat,
  title,
  line,
}: {
  flat?: boolean;
  title: string;
  line?: string;
}) {
  const t = "font-heading text-base leading-none font-medium leading-tight";
  const d = "text-sm text-muted-foreground";
  return (
    <div className="flex flex-col gap-2 pr-8">
      {flat ? <h2 className={t}>{title}</h2> : <DialogTitle className="leading-tight">{title}</DialogTitle>}
      {line != null && (flat ? <p className={d}>{line}</p> : <DialogDescription>{line}</DialogDescription>)}
    </div>
  );
}

/** The panel a dialog draws, drawn flat. Copied from `ui/dialog`'s own
 *  DialogContent so the exhibit is the material and not an impression of
 *  it: Float, the floating-modal radius, a hairline and the layered ink
 *  shadow, 16px of padding and a 16px grid gap. */
export const FLAT_PANEL =
  "grid w-full gap-4 rounded-xl border border-border bg-float p-4 text-sm shadow-[0_1px_2px_rgba(30,28,22,0.06),0_24px_48px_-24px_rgba(30,28,22,0.55)]";

/** Shape one: a confirmation. Title names the object, one line says what
 *  will be true afterwards, Cancel then the verb. Nothing is auto-focused,
 *  so Enter cannot do it by itself. */
export function ConfirmBody({
  title,
  line,
  verb,
  oneWay = true,
  flat,
  onCancel,
  onDo,
}: {
  title: string;
  line: string;
  verb: string;
  oneWay?: boolean;
  flat?: boolean;
  onCancel: () => void;
  onDo: () => void;
}) {
  return (
    <>
      <Head flat={flat} title={title} line={line} />
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          variant={oneWay ? "ghost" : "primary"}
          className={oneWay ? ONE_WAY_BUTTON : undefined}
          onClick={onDo}
        >
          {verb}
        </Button>
      </div>
    </>
  );
}

/** Shape two: a chooser. Picking IS the answer, so there is no footer to
 *  press -- the same behaviour iOS gives a settings row with a list
 *  behind it. A Cancel and a Save under three radio buttons is two extra
 *  presses for a choice already made. */
export function ChooseBody({
  title,
  options,
  at,
  flat,
  onPick,
}: {
  title: string;
  options: readonly string[];
  at: string;
  flat?: boolean;
  onPick: (v: string) => void;
}) {
  return (
    <>
      <Head flat={flat} title={title} />
      <div className="-mx-1 space-y-px">
        {options.map((o) => (
          <button
            key={o}
            type="button"
            onClick={() => onPick(o)}
            className="state-layer flex w-full items-center gap-3 rounded-[12px] px-3 py-2.5 text-left text-[15px] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring"
          >
            <span className="min-w-0 flex-1 truncate">{o}</span>
            {o === at && <Check className="h-4 w-4 shrink-0 text-canopy" strokeWidth={2.4} />}
          </button>
        ))}
      </div>
    </>
  );
}

/** Shape three: an editor. One field, and the verb on the button is the
 *  one on the row that opened it. */
export function EditBody({
  title,
  value,
  flat,
  onCancel,
  onSave,
}: {
  title: string;
  value: string;
  flat?: boolean;
  onCancel: () => void;
  onSave: (v: string) => void;
}) {
  const [draft, setDraft] = useState(value);
  return (
    <>
      <Head flat={flat} title={title} />
      {/* No autoFocus: a field that opens the keyboard uninvited is the
          mobile-first rule, and this dialog is read before it is typed
          in. */}
      <Input value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={80} />
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="primary" onClick={() => onSave(draft.trim() || value)}>
          Save
        </Button>
      </div>
    </>
  );
}

/* ── shape three and a half: the picture ───────────────────────────── *
 *  Not a fourth shape. It is the confirmation's anatomy with a body: a
 *  title naming the object, ONE description line, the thing you are
 *  choosing, and the same Cancel-then-verb footer.
 *
 *  Three things here differ from the picker that shipped in build phase
 *  3, and all three are the dialog material's own rules rather than
 *  taste. Its title is "The picture" where the row that opens it says
 *  "Picture", and the same act carries the same word everywhere. It sets
 *  `tracking-tight` on the title, which is a per-dialog title style. And
 *  it carries TWO description levels -- a line under the title AND a hint
 *  under the band -- where the standard allows one, and the line it
 *  spends the first on ("Pick one of ours, or use your own, then drag
 *  it") describes the controls drawn underneath it, which is the exact
 *  inversion the Collection's contribute dialog was pulled up for. One
 *  line, and it says the thing the frame cannot: what survives.
 *
 *  The band, the 5:2 pool tiles and the two-up-on-a-phone grid are the
 *  shipped picker's, unchanged, because those numbers were argued and
 *  measured when it was built. */
export function PictureBody({
  c,
  flat,
  onCancel,
  onUse,
}: {
  c: SketchCatchup;
  flat?: boolean;
  onCancel: () => void;
  onUse: () => void;
}) {
  const [src, setSrc] = useState(c.picture.src);
  return (
    <>
      <Head
        flat={flat}
        title="Picture"
        line="What you leave inside the frame is what every screen keeps."
      />
      <div
        className="w-full overflow-hidden rounded-[var(--radius)] bg-mist"
        style={{ aspectRatio: `${PICTURE_BAND_RATIO}` }}
      >
        <img src={src} alt="" draggable={false} className="h-full w-full object-cover" />
      </div>
      {/* TWO UP, ALWAYS, and this is a departure from the picker that
          shipped. That one is 512px wide and goes three up above the `sm`
          breakpoint, and its own comment argues the number: three at 390
          draws each photograph 103x41, "a colour swatch rather than a
          picture", because four of the six are the same banyan from
          different angles. The breakpoint is the VIEWPORT, though, and the
          panel is a fixed 384 -- so on a laptop it went three up inside a
          384px box and produced exactly the 103px swatch it was written to
          avoid. Two up at 384 draws 172x69. The dialog also stays at the
          material's own max-w-sm rather than reaching for `lg`. */}
      <div className="grid grid-cols-2 gap-2">
        {CATCHUP_PICTURES.map((p) => (
          <button
            key={p.src}
            type="button"
            aria-pressed={p.src === src}
            onClick={() => setSrc(p.src)}
            className={cn(
              "relative overflow-hidden rounded-[calc(var(--radius)-2px)] transition-[box-shadow,transform] duration-150 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
              p.src === src
                ? "shadow-[0_0_0_2px_var(--color-canopy)]"
                : "opacity-80 hover:opacity-100",
            )}
            style={{ aspectRatio: "5 / 2" }}
          >
            <img
              src={p.src}
              alt=""
              className="h-full w-full object-cover"
              style={{ objectPosition: p.focus }}
            />
          </button>
        ))}
      </div>
      <Button variant="outline" className="w-full justify-center">
        <ImageUp />
        Use your own
      </Button>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="primary" onClick={onUse}>
          Use this
        </Button>
      </div>
    </>
  );
}

/* ── the copy for every dialog a row can open ──────────────────────── *
 *  All of it in one place, so the family is written together rather than
 *  five times inside five build phases.
 *
 *  The rules are the design system's, and they are why none of these
 *  begins "Are you sure": a statement title naming the object, sentence
 *  case, no full stop on the title, the consequence uncontracted, and the
 *  button carrying the same verb as the row that opened it. And the
 *  warmth budget: nothing here is warm. One warm line per surface, spent
 *  on a title or a success state, never on a one-way act. */
export const REMINDERS = ["Daily", "On the last day", "Never"] as const;
export const RHYTHMS = ["Every month", "Every two months", "Every three months", "Twice a year"] as const;

export function confirmCopy(
  key: ConfirmKey,
  c: SketchCatchup,
): { title: string; line: string; verb: string; oneWay: boolean } {
  switch (key) {
    case "open-answering":
      return {
        title: "Open answering",
        line: "Nobody can add a question after this. Everyone is told they have until the deadline to write.",
        verb: "Open it",
        oneWay: true,
      };
    case "extend":
      return {
        title: "Give everyone longer",
        line: "The deadline moves back a week. Everyone who has not written yet is told.",
        verb: "Give a week",
        oneWay: false,
      };
    case "nudge":
      return {
        title: "Nudge everyone",
        line: "One reminder goes to whoever has not written yet. You cannot send another today.",
        verb: "Nudge",
        oneWay: true,
      };
    case "close-now":
      return {
        title: "Close and send it out",
        line: "Answering stops now and the Edition comes out. Anyone still writing loses the rest of the deadline.",
        verb: "Send it out",
        oneWay: true,
      };
    case "start-next":
      return {
        title: "Start the next Edition now",
        line: "Questions open today rather than on the rhythm, and everyone is told. The rhythm carries on from here.",
        verb: "Start it",
        oneWay: true,
      };
    case "hold":
      return {
        title: "Hold the next Edition",
        line: "Nothing goes out until you start it again. Everything already published stays where it is.",
        verb: "Hold it",
        oneWay: false,
      };
    case "resume":
      return {
        title: "Start it again",
        line: "The clock runs from today, and the next Edition arrives on the rhythm.",
        verb: "Start it",
        oneWay: false,
      };
    case "end":
      return {
        title: `End ${c.name}`,
        line: "No new Edition starts and nobody can ask a question. Everything already out stays readable.",
        verb: "End it",
        oneWay: true,
      };
    case "leave":
      return {
        title: `Leave ${c.name}`,
        line: "You stop getting Editions. What you wrote stays, and only the Keeper can add you back.",
        verb: "Leave",
        oneWay: true,
      };
    case "put-away":
      return {
        title: `Put ${c.name} away`,
        line: "It stops showing on your Catch-ups. Your batch keeps it, and you can put it back.",
        verb: "Put it away",
        oneWay: false,
      };
  }
}

/* ── the door on the picture, and what is behind it ────────────────── */

/** A control that sits ON the photograph: 36px, hairline, the word in the
 *  label rather than on screen, so the picture is left alone. */
export function PictureDoor({
  label,
  icon: Icon,
  onClick,
}: {
  label: string;
  icon: typeof SlidersHorizontal;
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

/** Everything a settings row opens, mounted once, over whichever frame
 *  the list is in. One place, so a phone and a laptop cannot drift. */
export function SettingsDialogs({
  c,
  open,
  onClose,
  reminder,
  onReminder,
  rhythm,
  onRhythm,
  name,
  onName,
  onPicture,
}: {
  c: SketchCatchup;
  open: Opens | null;
  onClose: () => void;
  reminder: string;
  onReminder: (v: string) => void;
  rhythm: string;
  onRhythm: (v: string) => void;
  name: string;
  onName: (v: string) => void;
  onPicture: () => void;
}) {
  const is = (s: Opens["shape"]) => open?.shape === s;
  /* `initialFocus` on the panel. Base UI otherwise focuses the first
     focusable child, which on a confirmation is Cancel -- so the dialog
     opened with a green ring already drawn round a button nobody had
     touched, and the material's own rule is that nothing is auto-focused
     so Enter cannot do the thing by itself. */
  const panel = useRef<HTMLDivElement>(null);
  return (
    <Dialog open={open != null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent initialFocus={panel} ref={panel} tabIndex={-1}>
        {open?.shape === "confirm" &&
          (() => {
            const copy = confirmCopy(open.key, c);
            return (
              <ConfirmBody
                title={copy.title}
                line={copy.line}
                verb={copy.verb}
                oneWay={copy.oneWay}
                onCancel={onClose}
                onDo={onClose}
              />
            );
          })()}
        {open?.shape === "choose" && open.key === "reminders" && (
          <ChooseBody
            title="Reminders"
            options={REMINDERS}
            at={reminder}
            onPick={(v) => {
              onReminder(v);
              onClose();
            }}
          />
        )}
        {open?.shape === "choose" && open.key === "rhythm" && (
          <ChooseBody
            title="Rhythm"
            options={RHYTHMS}
            at={rhythm || rhythmOf(c)}
            onPick={(v) => {
              onRhythm(v);
              onClose();
            }}
          />
        )}
        {is("edit") && (
          <EditBody
            title="Name"
            value={name}
            onCancel={onClose}
            onSave={(v) => {
              onName(v);
              onClose();
            }}
          />
        )}
        {is("picture") && <PictureBody c={c} onCancel={onClose} onUse={onPicture} />}
      </DialogContent>
    </Dialog>
  );
}
