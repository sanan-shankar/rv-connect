"use client";

/* ------------------------------------------------------------------ *
 *  A Catch-up's settings, and every dialog the list can open.
 *
 *  Transplanted from `/lab/catchups/settings`, which he signed off on
 *  2026-09-09: "yep that's fine now. i'm happy." His notes across two
 *  rounds are in `docs/planning/catchups-rework/review-2026-09-09.md`;
 *  round two reversed round one rather than refining it, so what stands
 *  is the second.
 *
 *  WHAT THIS REPLACED, and why. The first settings list was iOS's
 *  top-level Settings grammar transplanted whole: a rounded tile with a
 *  glyph in it at the head of every row. iOS gets away with that because
 *  each of those tiles is a different app's icon -- full colour,
 *  instantly told apart. Nine near-identical beige squares in a column
 *  carry no information at all, and they are the named failure: "I don't
 *  like the brown outlines for those icons, like the icons have that
 *  brown background. I don't like that brown. I think that's probably my
 *  main gripe with it."
 *
 *  So the tiles are gone, and with them every container in this panel.
 *  There is no tile, no rule, no card inside the card. What organises it
 *  is type, space and one left edge.
 *
 *  THE ONE IDEA UNDER IT. A Catch-up's settings are the Catch-up
 *  described, and some of those descriptions you may change. So "This
 *  Catch-up" holds THE SAME ROWS for everybody -- Name, Picture -- and
 *  who you are decides which of them open. A row you may not change
 *  still states its answer; it just has no chevron and does not press.
 *  (Rhythm was the third until 2026-10-17, when Editions stopped running
 *  on one.)
 *
 *  That is what fixes the batch case. A batch Catch-up would otherwise
 *  come out as a single row, which is correct and looks like a mistake.
 *  Now it is the same panel with its name sealed, which says the thing he
 *  wanted said without a sentence teaching it: "the batch catch-up, you
 *  don't add members. The members are fixed."
 *
 *  COLOUR. Cinnamon appears twice in the whole flow and nowhere else: on
 *  the words "Cannot be undone" in a row's value column, and as the fill
 *  of the button that does the thing. His note: "I don't know if the way
 *  to highlight the dangerous ones is to make the icon and the subtitle
 *  orange ... It seems not right with all three." Three coloured things
 *  become one, and the one is language rather than a symbol needing a
 *  legend.
 *
 *  Three dialog shapes, and only three. A CONFIRMATION (title, one line,
 *  Cancel then the verb), a CHOOSER (options unfolding in the row), and
 *  an EDITOR (title, one field, Cancel then Save).
 *
 *  ── WHAT LEFT IT ON 2026-10-17 ──
 *
 *  Rhythm, Hold the next Edition / Start it again, and Start the next
 *  Edition now. There is no rhythm, so nothing to choose and nothing to
 *  hold; and Start is the home's own primary action now, because in here
 *  is where a 2024 alumnus did not find it and made a second Catch-up of
 *  her whole batch instead. Its confirmation still lives in this file,
 *  with the rest of the family.
 * ------------------------------------------------------------------ */

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Archive,
  Bell,
  CalendarClock,
  Image as ImageIcon,
  Inbox,
  LogOut,
  PenLine,
  Send,
  Type,
  type LucideIcon,
} from "lucide-react";
import { CaretDown, CaretRight } from "@phosphor-icons/react";
import { AnimatePresence, m } from "motion/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { EASE_OUT_SMOOTH } from "@/components/common/motion";
import { callAction } from "@/lib/call-action";
import { cn, formatDayMonth } from "@/lib/utils";
import type { ReminderMode } from "@/lib/catchups-types";
import {
  closeAndPublish,
  endCatchup,
  extendDeadline,
  leaveCatchup,
  openAnswering,
  renameCatchup,
  setCatchupArchived,
  setReminderPref,
  startEdition,
} from "@/app/(main)/catchups/actions";
import type { SettingsCatchup } from "./types";
import { PicturePickerDialog } from "@/components/catchups/home/picture-picker-dialog";

/* ── what a row is ─────────────────────────────────────────────────── *
 *  ONE TEXT EDGE, and it is the fix for "the answers for Name and so on
 *  don't seem to be aligned to anything, they're just hanging there."
 *  They were right-aligned against the row's trailing edge, which put
 *  every one of them at a different distance from its own label. A value
 *  now sits on the SECOND LINE, under its label, on the same left edge.
 *  So a row has exactly two x positions in it -- the icon, and the text.
 *
 *  Which also settles the hint. A row either has an answer or it needs
 *  explaining, never both: "Reminders / Never" wants no gloss, and
 *  "Open answering / Stop taking questions, start writing" has no answer
 *  to give.
 *
 *  And "Cannot be undone" gets the THIRD line, which only a one-way row
 *  ever has. That makes those rows physically taller and slower to read,
 *  which is the right shape for a control you cannot take back. */

export type ChoiceKey = "reminders" | "extend";

export type ConfirmKey =
  | "open-answering"
  | "close-now"
  | "start"
  | "end"
  | "leave"
  | "put-away";

/** Which of the shapes a row opens. `choose` opens nothing at all: it
 *  unfolds inside the card. */
export type Opens =
  | { shape: "confirm"; key: ConfirmKey }
  | { shape: "edit"; key: "name" }
  | { shape: "picture" };

type Row = {
  key: string;
  label: string;
  icon: LucideIcon;
  /** The second line: the row's current answer, or what it does. Never
   *  both, and short enough to fit at 390 without an ellipsis. */
  line: string;
  oneWay?: boolean;
  opens?: Opens;
  choose?: ChoiceKey;
};

type Group = { label: string; rows: Row[] };

/* ── the choices ───────────────────────────────────────────────────── */

const REMINDERS: ReadonlyArray<{ value: ReminderMode; label: string }> = [
  { value: "all", label: "Daily" },
  { value: "last", label: "On the last day" },
  { value: "off", label: "Never" },
];

/** His: "why are we only giving a week more instead of more options?"
 *  Three, because two is not a choice and five is a form. */
const LONGER: ReadonlyArray<{ value: number; label: string }> = [
  { value: 3, label: "Three days" },
  { value: 7, label: "A week" },
  { value: 14, label: "Two weeks" },
];

const CHOICES: Record<ChoiceKey, ReadonlyArray<{ value: string | number; label: string }>> = {
  reminders: REMINDERS,
  extend: LONGER,
};

function labelOf(k: ChoiceKey, value: string | number | null): string {
  return CHOICES[k].find((o) => o.value === value)?.label ?? "";
}

/* ── the rows, one table, three permission sets ────────────────────── */

/** This Edition: the cycle's controls over the clock. The Keeper's, on a
 *  people Catch-up; any batch member's, on a batch one (owner, 2026-09-27:
 *  "make everyone a keeper"). Absent when `canRun` is false, when the
 *  Catch-up has ended, and whenever it is idle -- `state` is "none" then,
 *  and Start is on the home, not in here. */
function editionGroup(c: SettingsCatchup, extended: number | null): Group | null {
  if (!c.canRun || c.ended || !c.editionId) return null;
  const closes = c.answersCloseAt ? formatDayMonth(c.answersCloseAt) : "";
  const longer: Row = {
    key: "extend",
    label: "Give everyone longer",
    icon: CalendarClock,
    line: extended
      ? `${labelOf("extend", extended)} more`
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
              key: "close-now",
              label: "Close and send it out",
              icon: Send,
              line: "Publish now, before the deadline",
              oneWay: true,
              opens: { shape: "confirm", key: "close-now" },
            },
          ]
        : [];
  return rows.length ? { label: "This Edition", rows } : null;
}

/** This Catch-up: the same two rows for everybody, then the Keeper's
 *  one. Name and Picture are what the Catch-up IS, so they are stated
 *  whether or not you may change them. */
function catchupGroup(c: SettingsCatchup): Group {
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
      opens: c.canChangePicture ? { shape: "picture" } : undefined,
    },
  ];
  // Ending is the roster's call, and on a batch Catch-up the roster is
  // everyone and no one at once -- there is nobody to make that call for
  // the rest, so it stays the narrower, Keeper-only permission.
  if (c.youKeep && !c.ended) {
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
 *  other settings. I don't know why we're separating it." */
function youGroup(c: SettingsCatchup, reminder: ReminderMode): Group {
  return {
    label: "You",
    rows: [
      {
        key: "reminders",
        label: "Reminders",
        icon: Bell,
        line: labelOf("reminders", reminder),
        choose: "reminders",
      },
      /* A batch Catch-up has no exit but archiving: leaving would be undone
         by the next self-heal pass, which would put them straight back. */
      c.isBatch
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

export function settingsGroups(
  c: SettingsCatchup,
  at: { reminder: ReminderMode; extended: number | null },
): Group[] {
  const edition = editionGroup(c, at.extended);
  return [...(edition ? [edition] : []), catchupGroup(c), youGroup(c, at.reminder)];
}

/* ── the pills a row unfolds ───────────────────────────────────────── *
 *  His, on the dialog this replaced: "I feel like frequency was nicer as
 *  a pill chooser than these drop downs. Few others like that as well."
 *
 *  It is not only nicer, it is right: Apple reserves the chevron for
 *  navigation, and three options are not a hierarchy. A short set is
 *  picked WHERE IT STANDS. So the row unfolds and the answers arrive
 *  under it, on the app's own segmented material -- an outline pill that
 *  fills Canopy when it is the one you are on.
 *
 *  Height animates rather than the row swapping instantly, because the
 *  point of unfolding rather than opening is that you never lose your
 *  place. Only transform and opacity are meant to animate; height is the
 *  exception a disclosure cannot avoid, and it is 220ms on the app's own
 *  curve. */
function Pills({
  options,
  at,
  busy,
  onPick,
}: {
  options: ReadonlyArray<{ value: string | number; label: string }>;
  at: string | number | null;
  busy: boolean;
  onPick: (v: string | number) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5 pt-0.5 pb-1 pl-[30px]">
      {options.map((o) => {
        const on = o.value === at;
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={on}
            disabled={busy}
            onClick={() => onPick(o.value)}
            className={cn(
              "rounded-full px-3.5 text-[13px] font-medium transition-colors duration-150 disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
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
            {o.label}
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
  busy,
  onOpen,
  onToggle,
  onPick,
}: {
  r: Row;
  open: boolean;
  at: { reminder: ReminderMode; extended: number | null };
  busy: boolean;
  onOpen: (o: Opens) => void;
  onToggle: () => void;
  onPick: (k: ChoiceKey, v: string | number) => void;
}) {
  const Icon = r.icon;
  const press = r.opens ? () => onOpen(r.opens!) : r.choose ? onToggle : undefined;
  const current = r.choose === "reminders" ? at.reminder : at.extended;

  const body = (
    <>
      {/* The icon is a GLYPH rather than a tile. His: "kinda liked the
          icons", and before that, "I don't like the brown outlines for
          those icons ... I don't like that brown." Both are the same note
          once you know the colour protocol: rule 3 allows at most ONE mist
          region inside a card and never two adjacent, and nine `bg-muted`
          tiles in a column is nine of them touching. The mark was never the
          problem; the fill behind it was. */}
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
            a column of sans is an orphan rather than a distinction. */}
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
     row a batch Catch-up's Name becomes, and it is how the panel
     says "fixed" without a sentence explaining it. */
  if (!press) {
    return <div className="flex items-start gap-3 px-3 py-2.5">{body}</div>;
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
              at={current}
              busy={busy}
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
 *  three adjacent wells.
 *
 *  Nothing is drawn BETWEEN rows. Apple's grouped style separates groups
 *  "with headers, footers and additional space", and the twelve
 *  horizontal lines he counted in the shipped panel were rules between
 *  rows, not around groups.
 *
 *  The head sits outside its card, the way a grouped list's header does. */
function SettingsPanel({
  c,
  at,
  open,
  busy,
  onOpenRow,
  onOpen,
  onPick,
  className,
}: {
  c: SettingsCatchup;
  at: { reminder: ReminderMode; extended: number | null };
  /** Which row is unfolded. One at a time. */
  open: string | null;
  busy: boolean;
  onOpenRow: (key: string | null) => void;
  onOpen: (o: Opens) => void;
  onPick: (k: ChoiceKey, v: string | number) => void;
  className?: string;
}) {
  return (
    <div className={cn("space-y-6 overflow-y-auto", className)}>
      {settingsGroups(c, at).map((g) => (
        <section key={g.label}>
          {/* OUTSIDE the card, and given room. His call, and the two things
              he asked for with it were AIR and SIZE -- "the size still
              annoys me". So it is 15px on the foreground rather than 13px
              muted, which is the same size as the row labels it heads and
              heavier; the hierarchy comes from being outside the box rather
              than from being small.

              Sans, not serif. The type rule is that serif is a title or a
              name, and "This Edition" is the app naming its own furniture. */}
          <h3 className="mb-2 font-sans text-[15px] font-medium text-foreground">{g.label}</h3>
          <div className="rounded-[14px] border border-border p-1">
            {g.rows.map((r) => (
              <SettingRow
                key={r.key}
                r={r}
                at={at}
                busy={busy}
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

/* ── the two dialog shapes this file draws ─────────────────────────── */

/** The clock rows are only ever drawn when there IS an Edition, so
 *  this is the sentence for a race rather than for a state: the Edition
 *  published between the panel rendering and the button being pressed. */
const NO_EDITION = "This Edition has moved on. Reload the page.";

/** A one-way act's button. The app has no cinnamon variant, because until
 *  now nothing needed one: `destructive` is the red wash, and none of
 *  these destroys anything -- an ended Catch-up stays readable, a left
 *  Catch-up keeps every word you wrote. */
const ONE_WAY_BUTTON = "bg-cinnamon/10 text-cinnamon hover:bg-cinnamon/20";

/** Shape one: a confirmation. Title names the object, one line says what
 *  will be true afterwards, Cancel then the verb. Nothing is auto-focused,
 *  so Enter cannot do it by itself. */
function ConfirmBody({
  title,
  line,
  verb,
  oneWay,
  busy,
  onCancel,
  onDo,
}: {
  title: string;
  line: string;
  verb: string;
  oneWay: boolean;
  busy: boolean;
  onCancel: () => void;
  onDo: () => void;
}) {
  return (
    <>
      <div className="flex flex-col gap-2 pr-8">
        <DialogTitle className="leading-tight">{title}</DialogTitle>
        <DialogDescription>{line}</DialogDescription>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
        <Button
          variant={oneWay ? "ghost" : "primary"}
          className={oneWay ? ONE_WAY_BUTTON : undefined}
          disabled={busy}
          onClick={onDo}
        >
          {verb}
        </Button>
      </div>
    </>
  );
}

/** Shape two: an editor. One field, and the verb on the button is Save. */
function EditBody({
  title,
  value,
  busy,
  onCancel,
  onSave,
}: {
  title: string;
  value: string;
  busy: boolean;
  onCancel: () => void;
  onSave: (v: string) => void;
}) {
  const [draft, setDraft] = useState(value);
  return (
    <>
      <div className="flex flex-col gap-2 pr-8">
        <DialogTitle className="leading-tight">{title}</DialogTitle>
      </div>
      {/* No autoFocus: a field that opens the keyboard uninvited is the
          mobile-first rule, and this dialog is read before it is typed in. */}
      <Input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        maxLength={80}
        aria-label={title}
      />
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
        <Button variant="primary" disabled={busy} onClick={() => onSave(draft.trim())}>
          Save
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
  name: string,
  /** Everyone in the Catch-up, the viewer included. Only Start says it. */
  people = 0,
): { title: string; line: string; verb: string; oneWay: boolean } {
  switch (key) {
    case "open-answering":
      return {
        title: "Open answering",
        line: "Nobody can add a question after this, and everyone has a week to write.",
        verb: "Open it",
        oneWay: true,
      };
    case "close-now":
      return {
        title: "Close and send it out",
        line: "Answering stops now and the Edition comes out. Anyone still writing loses the rest of the deadline.",
        verb: "Send it out",
        oneWay: true,
      };
    /* The one place the head count is said, because it is the whole of
       what this costs: every one of them gets a bell. The accident worry
       (N30) that once kept this Keeper-only is answered here instead. Not
       styled one-way: an Edition that starts is the point of the page, and
       the cinnamon button is for acts nobody wants to take by mistake. */
    case "start": {
      const others = Math.max(0, people - 1);
      return {
        title: "Start a new Edition",
        line:
          others === 0
            ? "Questions open for three days."
            : `${others === 1 ? "The one other person" : `All ${others} other people`} in ${name} ${others === 1 ? "is" : "are"} told, and questions open for three days.`,
        verb: "Start it",
        oneWay: false,
      };
    }
    case "end":
      return {
        title: `End ${name}`,
        line: "No new Edition starts and nobody can ask a question. Everything already out stays readable.",
        verb: "End it",
        oneWay: true,
      };
    case "leave":
      return {
        title: `Leave ${name}`,
        line: "You stop getting Editions. What you wrote stays, and only the Keeper can add you back.",
        verb: "Leave",
        oneWay: true,
      };
    case "put-away":
      return {
        title: `Put ${name} away`,
        line: "It stops showing on your Catch-ups. Your batch keeps it, and you can put it back.",
        verb: "Put it away",
        oneWay: false,
      };
  }
}

/* ── the door on the picture ───────────────────────────────────────── */

/** A control that sits ON the photograph: 36px, hairline, the word in the
 *  label rather than on screen, so the picture is left alone.
 *
 *  Words rather than three dots, for his reason: "those 3 dots, I would
 *  never be able to see them. They're just tucked away in some corner." */
export function PictureDoor({
  label,
  icon: Icon,
  onClick,
}: {
  label: string;
  icon: LucideIcon;
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

/* ── the state, and every action behind it ─────────────────────────── *
 *  One hook, so a phone and a laptop cannot end up holding different
 *  state for the same Catch-up, and so a call site is two spreads rather
 *  than eleven props.
 *
 *  EVERY VALUE IS OPTIMISTIC AND EVERY FAILURE PUTS IT BACK. A pill fills
 *  the moment it is pressed, because the alternative on a Mumbai round
 *  trip is half a second of a control that looks broken; if the action
 *  refuses, the old value returns and the reason is a toast. That is the
 *  same shape `ReminderPrefControl` already used for the same setting.
 *
 *  `router.refresh()` after a success, because these change what the
 *  SERVER renders -- the state line, the Edition region, the sidebar --
 *  and the actions' own `revalidatePath` only invalidates the cache. */
export function useSettings(c: SettingsCatchup, onGone: () => void) {
  const [reminder, setReminder] = useState<ReminderMode>(c.reminderMode);
  /* Null means nobody has pushed the deadline in this session, which is why
     the row shows the deadline itself until somebody does. */
  const [extended, setExtended] = useState<number | null>(null);
  const [name, setName] = useState(c.name);
  const [row, setRow] = useState<string | null>(null);
  const [dialog, setDialog] = useState<Opens | null>(null);
  const [busy, setBusy] = useState(false);

  /* The server is the authority. When a refresh brings new props down --
     someone else renamed it, or the Edition moved on -- the local copies
     follow rather than pinning a stale answer on screen. */
  useEffect(() => setReminder(c.reminderMode), [c.reminderMode]);
  useEffect(() => setName(c.name), [c.name]);

  async function run<T>(work: () => Promise<T>, undo?: () => void) {
    setBusy(true);
    try {
      const result = await callAction(work);
      if (result && typeof result === "object" && "error" in result && result.error) {
        undo?.();
        toast.error(String(result.error));
        return false;
      }
      return true;
    } finally {
      setBusy(false);
    }
  }

  const live: SettingsCatchup = { ...c, name, reminderMode: reminder };

  async function pick(k: ChoiceKey, v: string | number) {
    setRow(null);
    if (k === "reminders") {
      const was = reminder;
      const next = v as ReminderMode;
      if (next === was) return;
      setReminder(next);
      await run(() => setReminderPref(c.catchupId, next), () => setReminder(was));
      return;
    }
    if (!c.editionId) return;
    const was = extended;
    const days = v as number;
    setExtended(days);
    await run(() => extendDeadline(c.editionId!, days), () => setExtended(was));
  }

  /* Every action below returns a DIFFERENT success branch, so the switch is
     narrowed to `{ error?: string }` here rather than at the call site. The
     only thing this surface does with a result is decide whether to show a
     toast; nothing reads a success payload. */
  async function confirm(key: ConfirmKey) {
    const id = c.editionId;
    const ok = await run(async (): Promise<unknown> => {
      switch (key) {
        case "open-answering":
          return id ? await openAnswering(id) : { error: NO_EDITION };
        case "close-now":
          return id ? await closeAndPublish(id) : { error: NO_EDITION };
        case "start":
          return await startEdition(c.catchupId);
        case "end":
          return await endCatchup(c.catchupId);
        case "leave":
          return await leaveCatchup(c.catchupId);
        case "put-away":
          return await setCatchupArchived(c.catchupId, true);
      }
    });
    if (!ok) return;
    setDialog(null);
    /* Leaving and putting away both take this Catch-up off the member's
       list, so staying on its page would show a surface they are no longer
       entitled to until something else moved them. */
    if (key === "leave" || key === "put-away") onGone();
  }

  async function rename(next: string) {
    const was = name;
    setName(next || c.name);
    setDialog(null);
    await run(() => renameCatchup(c.catchupId, next), () => setName(was));
  }

  return {
    live,
    busy,
    panel: {
      c: live,
      at: { reminder, extended },
      open: row,
      busy,
      onOpenRow: setRow,
      onOpen: setDialog,
      onPick: pick,
    },
    dialogs: {
      c: live,
      open: dialog,
      busy,
      onClose: () => setDialog(null),
      name,
      onConfirm: confirm,
      onRename: rename,
    },
  };
}

/** Everything a settings row opens, mounted once, over whichever frame
 *  the list is in. One place, so a phone and a laptop cannot drift.
 *
 *  The picture is the exception and it is deliberate: it opens the picker
 *  that shipped in build phase 3, which owns the upload, the aiming band
 *  and the two rules about what may be written into `pictureSrc`. The
 *  drawing corrected that picker's chrome rather than replacing it, and
 *  those corrections are in the picker's own file. */
export function SettingsDialogs({
  c,
  open,
  busy,
  onClose,
  name,
  onConfirm,
  onRename,
}: {
  c: SettingsCatchup;
  open: Opens | null;
  busy: boolean;
  onClose: () => void;
  name: string;
  onConfirm: (k: ConfirmKey) => void;
  onRename: (v: string) => void;
}) {
  /* `initialFocus` on the panel. Base UI otherwise focuses the first
     focusable child, which on a confirmation is Cancel -- so the dialog
     opened with a green ring already drawn round a button nobody had
     touched, and the material's own rule is that nothing is auto-focused
     so Enter cannot do the thing by itself. */
  const panel = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const shown = open?.shape === "confirm" || open?.shape === "edit";
  return (
    <>
      {/* The picture row set `{ shape: "picture" }` and nothing ever mounted
          the picker for it, so "Picture" opened nothing and no Catch-up's
          picture could be changed from the app (bug audit 3, T3-01). The
          picker saves through its own action; the refresh redraws the head. */}
      <PicturePickerDialog
        open={open?.shape === "picture"}
        onOpenChange={(o) => !o && onClose()}
        catchupId={c.catchupId}
        picture={c.picture}
        onChanged={() => router.refresh()}
      />
      <Dialog open={shown} onOpenChange={(o) => !o && onClose()}>
        <DialogContent initialFocus={panel} ref={panel} tabIndex={-1}>
          {open?.shape === "confirm" &&
            (() => {
              const copy = confirmCopy(open.key, c.name, c.people);
              return (
                <ConfirmBody
                  title={copy.title}
                  line={copy.line}
                  verb={copy.verb}
                  oneWay={copy.oneWay}
                  busy={busy}
                  onCancel={onClose}
                  onDo={() => onConfirm(open.key)}
                />
              );
            })()}
          {open?.shape === "edit" && (
            <EditBody title="Name" value={name} busy={busy} onCancel={onClose} onSave={onRename} />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

export { SettingsPanel };
