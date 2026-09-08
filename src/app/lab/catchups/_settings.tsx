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
import {
  Archive,
  Bell,
  BellRing,
  CalendarClock,
  Image as ImageIcon,
  ImageUp,
  Inbox,
  LogOut,
  Pause as PauseIcon,
  PenLine,
  Play,
  Repeat,
  Send,
  SlidersHorizontal,
  Type,
  X,
  type LucideIcon,
} from "lucide-react";
import { CaretDown, CaretRight } from "@phosphor-icons/react";
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

/* ── what a row is ─────────────────────────────────────────────────── *
 *  Four things in a fixed order, which is the anatomy Apple's 2025 design
 *  system gives a menu row -- selection indicator, icon, label, accessory
 *  -- and which iOS Settings has always given a grouped list.
 *
 *  ONE TEXT EDGE, and it is the fix for "the answers for Name and so on
 *  don't seem to be aligned to anything, they're just hanging there."
 *  They were right-aligned against the row's trailing edge, which put
 *  every one of them at a different distance from its own label, floating
 *  in the middle of the row with nothing under or over it. A value now
 *  sits on the SECOND LINE, under its label, on the same left edge. So a
 *  row has exactly two x positions in it -- the icon, and the text -- and
 *  nothing is left hanging in between.
 *
 *  Which also settles the hint. A row either has an answer or it needs
 *  explaining, never both: "Rhythm / Every month" wants no gloss, and
 *  "Open answering / Stop taking questions, start writing" has no answer
 *  to give. Apple's own rule for the same reason -- "keep item text
 *  succinct so row content is comfortable to read."
 *
 *  And "Cannot be undone" gets the THIRD line, which only a one-way row
 *  ever has. That makes those rows physically taller and slower to read,
 *  which is the right shape for a control you cannot take back, and it is
 *  the "its own row" the settled grammar asked for rather than the tail
 *  of a sentence. */

/** Which of the shapes a row opens. `choose` opens nothing at all: it
 *  unfolds inside the card. */
export type Opens =
  | { shape: "confirm"; key: ConfirmKey }
  | { shape: "edit"; key: "name" }
  | { shape: "picture" };

export type ChoiceKey = "rhythm" | "reminders" | "extend";

export type ConfirmKey =
  | "open-answering"
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
  icon: LucideIcon;
  /** The second line: the row's current answer, or what it does. Never
   *  both, and capped at 42 characters, which is what fits at 390 without
   *  an ellipsis. */
  line: string;
  oneWay?: boolean;
  /** Opens a dialog. A chevron is drawn for these and ONLY these, because
   *  Apple is explicit that "a disclosure indicator reveals the next level
   *  in a hierarchy; it doesn't show details about the item" -- so a row
   *  that fires an action, or that unfolds where it stands, has no
   *  business wearing one. */
  opens?: Opens;
  /** Unfolds a row of pills under itself. */
  choose?: ChoiceKey;
  /** Absent `opens` and `choose` both means this row states a fact. */
};

type Group = { label: string; rows: Row[] };

/* ── the choices, and the pills they draw ──────────────────────────── */

export const REMINDERS = ["Daily", "On the last day", "Never"] as const;
export const RHYTHMS = [
  "Every month",
  "Every two months",
  "Every three months",
  "Twice a year",
] as const;
/** His: "why are we only giving a week more instead of more options?"
 *  Three, because two is not a choice and five is a form. */
export const LONGER = ["Three days", "A week", "Two weeks"] as const;

export const CHOICES: Record<ChoiceKey, readonly string[]> = {
  rhythm: RHYTHMS,
  reminders: REMINDERS,
  extend: LONGER,
};

/* ── the rows, one table, three permission sets ────────────────────── */

/** The rhythm in words, off the Catch-up's own meta line. */
function rhythmOf(c: SketchCatchup): string {
  const tail = c.meta.split("\u00b7").pop()?.trim() ?? "";
  return tail ? tail[0].toUpperCase() + tail.slice(1) : "";
}

/** 20 August. The deadline a Keeper is deciding whether to move. */
function dayMonth(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long" });
}

/** This Edition: the Keeper's controls over the clock. A batch Catch-up
 *  has no manual transitions at all, so this group is simply absent on
 *  one -- nobody keeps it, it runs on its rhythm. */
function editionGroup(c: SketchCatchup, extend: string): Group | null {
  if (!c.canRun || c.paused) return null;
  const closes = dayMonth(c.edition?.closesAt ?? null);
  const longer: Row = {
    key: "extend",
    label: "Give everyone longer",
    icon: CalendarClock,
    line: extend
      ? `${extend} more`
      : closes
        ? `Answers close ${closes}`
        : "Push the deadline back",
    choose: "extend",
  };
  const rows: Row[] =
    c.state === "collecting"
      ? [
          {
            key: "open-answering",
            label: "Open answering",
            icon: PenLine,
            line: "Stop taking questions, start writing",
            oneWay: true,
            opens: { shape: "confirm", key: "open-answering" },
          },
          longer,
        ]
      : c.state === "answering"
        ? [
            longer,
            {
              key: "nudge",
              label: "Nudge everyone",
              icon: BellRing,
              line: "One reminder to whoever has not",
              oneWay: true,
              opens: { shape: "confirm", key: "nudge" },
            },
            {
              key: "close-now",
              label: "Close and send it out",
              icon: Send,
              line: "Publish now, before the deadline",
              oneWay: true,
              opens: { shape: "confirm", key: "close-now" },
            },
          ]
        : c.state === "published"
          ? [
              {
                key: "start-next",
                label: "Start the next Edition now",
                icon: Play,
                line: "Do not wait for the rhythm",
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
      icon: Type,
      line: c.name,
      opens: c.youKeep ? { shape: "edit", key: "name" } : undefined,
    },
    {
      key: "picture",
      label: "Picture",
      icon: ImageIcon,
      line: "The photograph on its card and header",
      opens: mayPicture ? { shape: "picture" } : undefined,
    },
    {
      key: "rhythm",
      label: "Rhythm",
      icon: Repeat,
      line: rhythm,
      choose: c.youKeep ? "rhythm" : undefined,
    },
  ];
  if (c.youKeep && c.state !== "ended") {
    rows.push(
      c.paused
        ? {
            key: "resume",
            label: "Start it again",
            icon: Play,
            line: "Let the clock run",
            opens: { shape: "confirm", key: "resume" },
          }
        : {
            key: "hold",
            label: "Hold the next Edition",
            icon: PauseIcon,
            line: "Nothing goes out until you say",
            opens: { shape: "confirm", key: "hold" },
          },
    );
    rows.push({
      key: "end",
      label: "End this Catch-up",
      icon: Archive,
      line: "Nothing new starts. It stays readable",
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
        icon: Bell,
        line: reminder,
        choose: "reminders",
      },
      batch
        ? {
            key: "put-away",
            label: "Put it away",
            icon: Inbox,
            line: "It stops showing on your list",
            opens: { shape: "confirm", key: "put-away" },
          }
        : {
            key: "leave",
            label: "Leave",
            icon: LogOut,
            line: "You stop getting Editions",
            oneWay: true,
            opens: { shape: "confirm", key: "leave" },
          },
    ],
  };
}

export type Chosen = { rhythm: string; reminders: string; extend: string };

/** Everything the panel and its dialogs need, in one place, so a phone
 *  and a laptop cannot end up holding different state for the same
 *  Catch-up -- and so a call site is two spreads rather than eleven
 *  props. */
export function useSettings(c: SketchCatchup) {
  const [at, setAt] = useState<Chosen>({
    rhythm: rhythmOf(c),
    reminders: REMINDERS[0],
    /* Empty means nobody has pushed the deadline this cycle, which is why
       the row shows the deadline itself until somebody does. */
    extend: "",
  });
  const [name, setName] = useState(c.name);
  const [row, setRow] = useState<string | null>(null);
  const [dialog, setDialog] = useState<Opens | null>(null);
  const live = { ...c, name };
  return {
    live,
    panel: {
      c: live,
      at,
      open: row,
      onOpenRow: setRow,
      onOpen: setDialog,
      onPick: (k: ChoiceKey, v: string) => {
        setAt((was) => ({ ...was, [k]: v }));
        /* The row folds itself up once you have answered it, the way a
           menu closes on a pick. Leaving it open makes the panel jump
           twice for one decision. */
        setRow(null);
      },
    },
    dialogs: {
      c: live,
      open: dialog,
      onClose: () => setDialog(null),
      name,
      onName: setName,
      onPicture: () => setDialog(null),
    },
  };
}

export function settingsGroups(c: SketchCatchup, at: Chosen): Group[] {
  const edition = editionGroup(c, at.extend);
  return [...(edition ? [edition] : []), catchupGroup(c, at.rhythm), youGroup(c, at.reminders)];
}

/* ── the pills a row unfolds ───────────────────────────────────────── *
 *  His, on the dialog this replaced: "I feel like frequency was nicer as
 *  a pill chooser than these drop downs. Few others like that as well.
 *  And it doesn't have to be pill chooser but this is so boring and not
 *  it."
 *
 *  It is not only boring, it is wrong: Apple reserves the chevron for
 *  navigation, and three options are not a hierarchy. A short set is
 *  picked WHERE IT STANDS. So the row unfolds and the answers arrive
 *  under it, in the card, on the app's own segmented material -- an
 *  outline pill that fills Canopy when it is the one you are on, which
 *  the colour protocol names as the app's single selected state.
 *
 *  Height animates rather than the row swapping instantly, because the
 *  point of unfolding rather than opening is that you never lose your
 *  place. Only transform and opacity are meant to animate here; height
 *  is the exception a disclosure cannot avoid, and it is 220ms on the
 *  app's own curve. */
function Pills({
  options,
  at,
  onPick,
}: {
  options: readonly string[];
  at: string;
  onPick: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5 pt-0.5 pb-1 pl-[30px]">
      {options.map((o) => {
        const on = o === at;
        return (
          <button
            key={o}
            type="button"
            aria-pressed={on}
            onClick={() => onPick(o)}
            className={cn(
              "rounded-full px-3.5 text-[13px] font-medium transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
              /* 34px, between the app's xs (32) and sm (36) pills: this one
                 sits inside a settings row rather than beside a heading, and
                 a full sm pill made the unfolded state taller than the row
                 that opened it. */
              "h-[34px]",
              on
                ? "bg-canopy text-white"
                : "state-layer border border-border text-muted-foreground",
            )}
          >
            {o}
          </button>
        );
      })}
    </div>
  );
}

/* ── one row ───────────────────────────────────────────────────────── */
function SettingRow({
  r,
  open,
  at,
  onOpen,
  onToggle,
  onPick,
}: {
  r: Row;
  open: boolean;
  at: Chosen;
  onOpen: (o: Opens) => void;
  onToggle: () => void;
  onPick: (k: ChoiceKey, v: string) => void;
}) {
  const Icon = r.icon;
  const press = r.opens ? () => onOpen(r.opens!) : r.choose ? onToggle : undefined;

  const body = (
    <>
      {/* The icon is back, and it is a GLYPH rather than a tile. His:
          "kinda liked the icons", and before that, "I don't like the brown
          outlines for those icons ... I don't like that brown." Both are
          the same note once you know the colour protocol: rule 3 allows at
          most ONE mist region inside a card and never two adjacent, and
          nine `bg-muted` tiles in a column is nine of them touching. The
          mark was never the problem; the fill behind it was. */}
      <Icon
        className={cn(
          "mt-[2px] h-[18px] w-[18px] shrink-0",
          press ? "text-muted-foreground" : "text-muted-foreground/55",
        )}
        strokeWidth={1.8}
      />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] text-foreground">{r.label}</span>
        {/* SANS, including the Catch-up's own name. His: "why is the
            Catch-up name the only thing serif in this entire thing?" It was
            the type rule read too literally -- serif is for a title or a
            NAME, but in this row the name is not being presented, it is
            being reported as the row's current value, and one serif word in
            a column of sans is an orphan rather than a distinction. The
            serif still owns every dialog title, including "Leave the sunday
            four", where the name IS the title. */}
        <span className="mt-[3px] block truncate text-[13.5px] text-muted-foreground">
          {r.line}
        </span>
        {r.oneWay && (
          <span className="mt-[3px] block text-[12.5px] text-cinnamon">Cannot be undone</span>
        )}
      </span>
      {/* TWO ACCESSORIES, AND THEY MEAN DIFFERENT THINGS. Apple is explicit
          that a right chevron "reveals the next level in a hierarchy", so it
          goes on the two rows that genuinely open another surface -- Name and
          Picture -- and nowhere else. A row that unfolds where it stands
          takes a DISCLOSURE caret, pointing down and turning over when it
          opens. A row that fires an action takes neither, the way iOS
          Settings draws Sign Out. */}
      {r.opens?.shape === "edit" || r.opens?.shape === "picture" ? (
        <CaretRight size={13} weight="bold" className="mt-[5px] shrink-0 text-muted-foreground/70" />
      ) : r.choose ? (
        <CaretDown
          size={13}
          weight="bold"
          className={cn(
            "mt-[5px] shrink-0 text-muted-foreground/70 transition-transform duration-200",
            open && "rotate-180",
          )}
        />
      ) : null}
    </>
  );

  /* A fact, not a control: no glyph weight, nothing to press. This is the
     row a batch Catch-up's Name and Rhythm become, and it is how the panel
     says "fixed" without a sentence explaining it. */
  if (!press) {
    return (
      <div className="flex items-start gap-3 px-3 py-2.5">{body}</div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={press}
        aria-expanded={r.choose ? open : undefined}
        className="state-layer flex w-full items-start gap-3 rounded-[10px] px-3 py-2.5 text-left focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring"
      >
        {body}
      </button>
      <AnimatePresence initial={false}>
        {r.choose && open && (
          <m.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: EASE_OUT_SMOOTH }}
            className="overflow-hidden px-3"
          >
            <Pills
              options={CHOICES[r.choose]}
              at={at[r.choose]}
              onPick={(v) => onPick(r.choose!, v)}
            />
          </m.div>
        )}
      </AnimatePresence>
    </>
  );
}

/* ── the panel ─────────────────────────────────────────────────────── *
 *  Each group is a card with a HAIRLINE and no fill, and that is the one
 *  shape the colour protocol leaves open. Rule 3: "at most one mist
 *  recessed region inside any card, and never two mist surfaces adjacent
 *  ... everything else sits directly on the card's paper; if it needs an
 *  edge, it earns a border, not a fill." Three filled groups would be
 *  three adjacent wells. Paper on Float is closed too -- the Get in touch
 *  card was pulled up for it in September, warmth climbing the ladder
 *  instead of sinking down it.
 *
 *  Which lands on the same recipe Revolut uses on white: a 1px hairline
 *  and a large radius, depth by outline rather than by shadow. And it is
 *  what brings back the structure that went missing when the tiles were
 *  deleted -- his: "this still looks like a mess. It's not approachable.
 *  It's less approachable than before but with some big bugs solved."
 *
 *  Nothing is drawn BETWEEN rows. Apple's grouped style separates groups
 *  "with headers, footers and additional space", and the twelve
 *  horizontal lines he counted in the shipped panel were rules between
 *  rows, not around groups.
 *
 *  The head sits outside its card, 13px, the way a grouped list's header
 *  does -- it does not have to carry the structure any more, because the
 *  card does. */
export function SettingsPanel({
  c,
  at,
  open,
  onOpenRow,
  onOpen,
  onPick,
  className,
}: {
  c: SketchCatchup;
  at: Chosen;
  /** Which row is unfolded. One at a time. */
  open: string | null;
  onOpenRow: (key: string | null) => void;
  onOpen: (o: Opens) => void;
  onPick: (k: ChoiceKey, v: string) => void;
  className?: string;
}) {
  return (
    <div className={cn("space-y-6 overflow-y-auto", className)}>
      {settingsGroups(c, at).map((g) => (
        <section key={g.label}>
          {/* OUTSIDE the card, and given room. It has now been three ways:
              floating above the card at 12.5px muted ("seems like an
              afterthought just squeezed, and it looks yuck"), then inside the
              card as its caption, then here. His call, and the two things he
              asked for with it were AIR and SIZE -- "the size still annoys
              me". So it is 15px on the foreground rather than 13px muted,
              which is the same size as the row labels it heads and heavier,
              with 8px under it and 24px above; the hierarchy comes from being
              outside the box rather than from being small.

              Aligned to the CARD's own left edge, which is the only thing out
              here for it to hang off.

              Sans, not serif. The type rule is that serif is a title or a
              name, and "This Edition" is the app naming its own furniture --
              which is the app talking. */}
          <h3 className="mb-2 font-sans text-[15px] font-medium text-foreground">{g.label}</h3>
          <div className="rounded-[14px] border border-border p-1">
            {g.rows.map((r) => (
              <SettingRow
                key={r.key}
                r={r}
                at={at}
                open={open === r.key}
                onOpen={onOpen}
                onToggle={() => onOpenRow(open === r.key ? null : r.key)}
                onPick={onPick}
              />
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
 *  so Enter cannot do it by itself.
 *
 *  There used to be a third shape, a chooser dialog. It is gone: a short
 *  set of options is picked in the row it belongs to. */
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

/** Shape two: an editor. One field, and the verb on the button is the
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
  name,
  onName,
  onPicture,
}: {
  c: SketchCatchup;
  open: Opens | null;
  onClose: () => void;
  name: string;
  onName: (v: string) => void;
  onPicture: () => void;
}) {
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
        {open?.shape === "edit" && (
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
        {open?.shape === "picture" && <PictureBody c={c} onCancel={onClose} onUse={onPicture} />}
      </DialogContent>
    </Dialog>
  );
}
