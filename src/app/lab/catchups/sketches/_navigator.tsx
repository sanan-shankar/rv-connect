"use client";

/* ------------------------------------------------------------------ *
 *  The instrument you move with.
 *
 *  This is where the front runner spends its one bet. Fifteen designs
 *  restyled the answers and drew the same navigator; he rejected all
 *  fifteen and said the tiles were fine, the question font was fine, and
 *  the navigator was "literally identical across everything ... I'd like
 *  to see that style done properly with some good attention put on it,
 *  but then also done in a bunch of different ways" (R24).
 *
 *  THE STRIP. Under the app's green bar sits one strip, always there. At
 *  rest it says "Round 1 · 15 August 2026", which is the one place the
 *  Edition and its date are printed. Once a question's heading has scrolled
 *  under the bar, the strip carries that question instead. Three lines at
 *  most, then it cuts, because he weighed the two costs himself on
 *  2026-09-07: "I think it should not be 8 lines, it should be 3 lines,
 *  and then you can dot dot dot it. But it takes up way too much of the
 *  screen. 3 would be okay." That supersedes R19's "I don't want a bunch
 *  of dot dot dots everywhere", which was about a 20-character cut.
 *
 *  THE LINE. Along the strip's top edge, a thin cinnamon line grows from
 *  the left as you read: how far through the Edition you are. It is R28's
 *  cinnamon line given a job, in the top bar where R34 wanted it.
 *
 *  THE INDICATOR. When the strip opens into the list of questions, the
 *  same line turns the corner and runs down the left of the list, and it
 *  STOPS at the question you are in. The end of a measure is the mark.
 *  Never weight: bolding the current row is what makes the shipped rail
 *  reflow, which he caught again on 2026-09-07 ("the words spill onto the
 *  next line because it's gone from regular to bold").
 *
 *  THE ONE HE PICKED. `UnfoldedPanel` is the strip growing downward in
 *  place: not from the bottom (R39), not green (R39), no title because
 *  the bar above already says the Catch-up's name (R39), no X because the
 *  strip you tapped is still under your thumb (R43). Two other ways were
 *  drawn and are deleted; owner question 9 chose this one.
 * ------------------------------------------------------------------ */

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { CaretDown } from "@phosphor-icons/react";
import { m, useMotionValue, useSpring, useTransform, type MotionValue } from "motion/react";
import { EASE_OUT_SMOOTH } from "@/components/common/motion";
import { cn } from "@/lib/utils";
import type { SketchQuestion, SketchEdition } from "./_types";
import { longDate } from "./_parts";

/** The app's phone bar. */
export const BAR = 56;

/** "15 August 2026", in cinnamon, and nothing else.
 *
 *  His, 2026-09-07: "In the reader, let's ditch the round 1. Let's only have
 *  the date, and then let the date be orange. Let's not have the round number.
 *  The round number is irrelevant." That closes the last place an Edition number
 *  survived anywhere in the drawing, and it takes the middle dot with it --
 *  there is nothing left to separate. An Edition is identified by its date. */
export function EditionMeta({ edition, className }: { edition: SketchEdition; className?: string }) {
  return (
    <span className={cn("font-medium text-cinnamon", className)}>
      {longDate(edition.publishedAt)}
    </span>
  );
}

/* ── The strip ─────────────────────────────────────────────────────── *
 *  Its own glass, not the app's `.glass`: that one is 78% paper, built
 *  for a bar over a feed where nothing has to be read through it. A
 *  question docked over the tile it just left needs the tile gone. 93%
 *  paper, and the blur keeps the edge from reading as a solid slab. */
const STRIP_GLASS = {
  backgroundColor: "color-mix(in srgb, var(--card) 93%, transparent)",
  backdropFilter: "blur(14px)",
  WebkitBackdropFilter: "blur(14px)",
} as const;

export function Strip({
  label,
  docked,
  progress,
  open = false,
  onToggle,
  floating = false,
  interactive = true,
}: {
  /** The current question when `docked`, otherwise the Edition's meta line. */
  label: ReactNode;
  docked: boolean;
  /** 0 to 1, how far through the Edition. Drawn as the line along the top. */
  progress: number;
  open?: boolean;
  onToggle?: () => void;
  /** The laptop's, floating over the column rather than welded to the bar. */
  floating?: boolean;
  interactive?: boolean;
}) {
  const inner = (
    <>
      <m.span
        aria-hidden
        className="absolute left-0 top-0 h-[2px] rounded-r-full bg-cinnamon"
        animate={{ width: `${Math.round(Math.max(0, Math.min(1, progress)) * 1000) / 10}%` }}
        transition={{ duration: 0.25, ease: EASE_OUT_SMOOTH }}
      />
      <span
        className={cn(
          "min-w-0 flex-1",
          docked
            ? "font-heading text-[15.5px] leading-[1.35] text-foreground"
            : "text-[13px] leading-[1.35] text-muted-foreground"
        )}
        style={
          docked
            ? {
                display: "-webkit-box",
                WebkitBoxOrient: "vertical",
                WebkitLineClamp: 3,
                overflow: "hidden",
              }
            : undefined
        }
      >
        {label}
      </span>
      {interactive && (
        <CaretDown
          size={15}
          weight="bold"
          className={cn(
            "shrink-0 text-muted-foreground transition-transform duration-300",
            open && "rotate-180"
          )}
          style={{ transitionTimingFunction: "cubic-bezier(0.16,1,0.3,1)" }}
        />
      )}
    </>
  );

  const shell = cn(
    "relative w-full overflow-hidden text-left",
    floating ? "card-elevated rounded-[12px] border border-border" : "border-b border-border"
  );
  /* `text-left` here and not only on the shell: a <button> centres its
     own text, whatever its parent says. */
  const row = "flex min-h-[44px] w-full items-center gap-3 px-5 py-2.5 text-left";

  if (!interactive) {
    return (
      <div className={shell} style={STRIP_GLASS}>
        <div className={row}>{inner}</div>
      </div>
    );
  }
  return (
    <div className={cn(shell, open && "bg-card")} style={open ? undefined : STRIP_GLASS}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-label={open ? "Close the questions" : "Open the questions"}
        className={cn(
          row,
          "focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring"
        )}
      >
        {inner}
      </button>
    </div>
  );
}

/* ── The list, with the line beside it ─────────────────────────────── */

type ListSize = "panel" | "page" | "rail" | "cover";

const LIST: Record<
  ListSize,
  { size: number; lineHeight: number; padY: number; indent: number; spineX: number; serif: boolean }
> = {
  /* An Edition's contents, printed on its cover, on a Catch-up's home. The
     same object as the rail and the panel, at the same measure, in the
     same face. Nothing is truncated and nothing is numbered; a cover
     carries its headlines the way a magazine's does, and never a quoted
     answer (brief para 9). */
  cover: { size: 15, lineHeight: 1.35, padY: 6, indent: 18, spineX: 0, serif: true },
  /* The unfolded strip and the sheet: one size, the body's. */
  panel: { size: 15.5, lineHeight: 1.35, padY: 11, indent: 40, spineX: 20, serif: false },
  /* The contents page: the heading face, a size under the in-flow
     heading, and eleven questions still fit one phone screen. */
  page: { size: 19, lineHeight: 1.28, padY: 11, indent: 40, spineX: 20, serif: true },
  /* The laptop's rail, which is this list left open. Serif and further
     apart than the 13px sans it was, which he asked for; at 14, which is
     `small` on the app's type scale, because 16 was not.
     He looked at 16 and said: "the siderail for questions font is too big
     it's imbalancing the screen. my eyes go there instead of the content
     when it should just be a navigation thing." A navigation list has to
     be legible and then get out of the way, so it sits one step under the
     body it is pointing at, and the air between rows does the work the
     size was doing. */
  rail: { size: 14, lineHeight: 1.35, padY: 11, indent: 22, spineX: 0, serif: true },
};

/* ── the swell, rebuilt ────────────────────────────────────────────── *
 *  His, 2026-09-07: "the navigation rail on the reader for the questions has
 *  magnification. delete it and rebuild it from scratch. it's super glitchy
 *  and jittery it's not smooth at all like it is in macos. and things react
 *  early and late and it's just built horribly."
 *
 *  He is describing three separate faults and all three were real.
 *
 *  IT RE-RENDERED THE WHOLE LIST EVERY FRAME. The pointer's position was
 *  React state, set from a rAF, so every pixel of mouse movement reconciled
 *  eleven rows. That is the jitter.
 *
 *  IT MEASURED ONCE AND THEN LIED. The row centres were cached in a
 *  `useLayoutEffect` keyed on the CURRENT QUESTION, so they were only ever
 *  recomputed when you scrolled into a different question -- never when the
 *  list resized, and never against where the rows actually were. Rows swelled
 *  by the wrong amount, which is "reacts early and late".
 *
 *  AND IT ANIMATED A VALUE THAT CHANGED EVERY FRAME. `transition: transform
 *  90ms linear` meant every frame started a new 90ms animation to a target
 *  that had already moved. A CSS transition chasing a per-frame value always
 *  smears and always lags the cursor.
 *
 *  This is the app's own mechanism instead, the one the Collection's year
 *  rail uses and the one he is comparing it to: a motion value for the
 *  pointer, a transform that reads each row's LIVE rect, and a spring on the
 *  scale. Motion values write to the DOM directly, so the pointer moving
 *  costs zero React renders; the rect is read at the moment it is needed, so
 *  nothing is stale; and the spring is the only thing smoothing, so there is
 *  nothing for it to fight. The three constants are the Collection's own, so
 *  the two rails feel the same under the hand. */
/* The spring and the peak are the Collection's own, so the two rails feel the
   same under the hand. The REACH is not, and it cannot be: the Collection's
   rows are single lines about 20px tall, so 64px of falloff covers three of
   them either side. These rows wrap to two and three lines and measure 41 to
   79px, so at 64 the row under the pointer swelled alone and its neighbours
   sat at exactly 1 -- a single row popping rather than a dock breathing.
   Measured at 120: the pointer at one row's centre puts the next at about
   1.06 and the one after at about 1.02, which is the falloff you can see. */
const DOCK_REACH = 120;
/* 1.05, and both cuts are off the GROWTH rather than off the number. His, in
   two passes on 2026-09-07: "reduce the rail magnification by 40%", then
   "decrease the magnification by another 40%." A peak of 1.14 grows a row by
   0.14; six tenths of that is 0.084, and six tenths again is 0.05. Taking 40%
   off 1.14 itself would read 0.68 and SHRINK every row under the pointer,
   which is plainly not what the word means.

   The reach is untouched at 120px, deliberately: how far the swell carries is
   a separate decision from how much it lifts, and he named only the lift. It
   also matters more at this amplitude, not less -- a 5% rise on one row alone
   would read as a rendering wobble, and it is the falloff across four rows
   that makes it read as a dock. Measured at 1.05: the row under the pointer
   is 1.050, its neighbours 1.021 and 1.026. */
const DOCK_PEAK = 1.05;
const DOCK_SPRING = { stiffness: 400, damping: 28 };
/** Far away, not zero: this keeps every row outside DOCK_REACH while the
 *  pointer is not in the list, which is its resting state. */
const POINTER_AWAY = 1e5;

/** One row of the list. A `<button>` where the row goes somewhere, a `<span>`
 *  where the card around it is already the door. Everything else about it --
 *  the type, the measure, the colour -- is identical, because it is the same
 *  object at a different depth. */
function Row({
  q,
  t,
  here,
  mark,
  swells,
  pointerY,
  onPick,
}: {
  q: SketchQuestion;
  t: (typeof LIST)[ListSize];
  here: boolean;
  mark: "line" | "tint";
  swells: boolean;
  pointerY: MotionValue<number>;
  onPick?: () => void;
}) {
  const ref = useRef<HTMLElement>(null);
  /* Distance from the pointer to this row's centre, read off the live rect
     every time the pointer moves. Nothing is cached, so a resize, a reflow or
     a sticky rail travelling cannot put it out of date. */
  const distance = useTransform(pointerY, (py: number) => {
    const box = ref.current?.getBoundingClientRect();
    return box ? py - (box.top + box.height / 2) : POINTER_AWAY;
  });
  const scale = useSpring(
    useTransform(distance, [-DOCK_REACH, 0, DOCK_REACH], [1, DOCK_PEAK, 1]),
    DOCK_SPRING,
  );

  const className = cn(
    "block w-full text-left transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring",
    t.serif && "font-heading",
    /* Colour, never weight: a weight change reflows the words and pushes the
       list around, which is the shipped rail's bug and he caught it here too. */
    here ? "text-foreground" : "text-muted-foreground hover:text-foreground",
    mark === "tint" && "rounded-[10px]",
    mark === "tint" && here && "bg-canopy/[0.07]",
  );
  const style = {
    fontSize: t.size,
    lineHeight: t.lineHeight,
    paddingTop: t.padY,
    paddingBottom: t.padY,
    paddingLeft: mark === "line" ? t.indent : 14,
    paddingRight: mark === "line" ? 20 : 14,
  } as const;

  if (!swells) {
    const Tag = onPick ? "button" : "span";
    return (
      <Tag
        ref={ref as never}
        type={onPick ? "button" : undefined}
        onClick={onPick}
        aria-current={here ? "true" : undefined}
        className={className}
        style={style}
      >
        {q.text}
      </Tag>
    );
  }

  /* A transform does not participate in layout, so a row swells and nothing
     below it moves. `left center` rather than the centre, because these rows
     are set against a measure down the left and that edge must not breathe. */
  return (
    <m.button
      ref={ref as never}
      type="button"
      onClick={onPick}
      aria-current={here ? "true" : undefined}
      className={className}
      style={{ ...style, scale, transformOrigin: "left center" }}
    >
      {q.text}
    </m.button>
  );
}

export function QuestionList({
  questions,
  current = 0,
  within = 0,
  size,
  mark = "line",
  spine = "progress",
  onPick,
  className,
}: {
  questions: SketchQuestion[];
  /** Progress mode only: the question you are in. */
  current?: number;
  /** 0 to 1, how far through the current question; where the line ends. */
  within?: number;
  size: ListSize;
  /** `line`: the measure ends at your row. `tint`: the app's selection wash. */
  mark?: "line" | "tint";
  /** What the measure beside the list is doing.
   *
   *  `progress` is the reader: it fills as you read and stops at the
   *  question you are in. `read` and `unread` are a cover, where there is
   *  no "where am I" to show, so the measure answers the only question a
   *  cover is asked instead: have I read this one?
   *
   *  Warm means READ, and it has to, because a full measure is what the
   *  reader leaves behind when you get to the end of an Edition. Marking the
   *  UNREAD one warm would read better on a list -- the new thing lights
   *  up -- and would make the same colour mean opposite things two taps
   *  apart. So an Edition you have not opened is a measure with nothing in
   *  it yet, which is exactly what it is. No count, no dot, no
   *  percentage. */
  spine?: "progress" | "read" | "unread";
  onPick?: (index: number) => void;
  className?: string;
}) {
  const rows = useRef<Array<HTMLLIElement | null>>([]);
  const [fill, setFill] = useState(0);
  const t = LIST[size];
  const swells = size === "rail";
  const tracking = spine === "progress";

  /* The pointer, as a motion value. Setting it writes straight through to
     every row's transform without a single React render -- which is the whole
     reason the rebuilt swell is smooth where the old one was not. */
  const pointerY = useMotionValue(POINTER_AWAY);

  useLayoutEffect(() => {
    if (!tracking) return;
    const el = rows.current[current];
    if (!el) return;
    /* A floor under the fill, because the honest number is zero when you
       are at the very top of the very first question, and a zero-length
       measure reads as a mark that failed to draw rather than as a mark
       at the start. A fifth of a row is enough to see. */
    const through = Math.max(0.2, Math.min(1, within));
    setFill(el.offsetTop + el.offsetHeight * through);
  }, [current, within, questions.length, tracking]);

  return (
    <ol
      className={cn("relative", className)}
      onPointerMove={
        swells
          ? (e) => {
              if (e.pointerType !== "mouse") return;
              pointerY.set(e.clientY);
            }
          : undefined
      }
      onPointerLeave={swells ? () => pointerY.set(POINTER_AWAY) : undefined}
    >
      {mark === "line" &&
        (tracking ? (
          <>
            <span
              aria-hidden
              className="absolute bottom-0 top-0 w-[2px] rounded-full bg-border"
              style={{ left: t.spineX }}
            />
            <m.span
              aria-hidden
              className="absolute top-0 w-[2px] rounded-full bg-cinnamon"
              style={{ left: t.spineX }}
              animate={{ height: fill }}
              transition={{ duration: 0.3, ease: EASE_OUT_SMOOTH }}
            />
          </>
        ) : (
          /* A cover's measure is the whole height, and its colour is the
             one thing it has to say. */
          <span
            aria-hidden
            className={cn(
              "absolute bottom-0 top-0 w-[2px] rounded-full",
              spine === "read" ? "bg-cinnamon/70" : "bg-border",
            )}
            style={{ left: t.spineX }}
          />
        ))}
      {questions.map((q, i) => (
        <li
          key={q.id}
          ref={(el) => {
            rows.current[i] = el;
          }}
        >
          {/* A row is a button only where it goes somewhere. On a cover the
              whole card is the door (architecture.md section 3), so the rows
              are text: a button inside a link is invalid, and eleven tab stops
              on a card with one destination is worse than the markup error. */}
          <Row
            q={q}
            t={t}
            here={tracking && i === current}
            mark={mark}
            swells={swells && Boolean(onPick)}
            pointerY={pointerY}
            onPick={onPick ? () => onPick(i) : undefined}
          />
        </li>
      ))}
    </ol>
  );
}

/* ── First way: the strip unfolds ──────────────────────────────────── */

export function UnfoldedPanel({
  edition,
  current,
  within,
  onPick,
  maxHeight,
  bare = false,
}: {
  edition: SketchEdition;
  current: number;
  within: number;
  onPick?: (index: number) => void;
  /** So forty questions scroll inside the panel instead of off the screen. */
  maxHeight?: number;
  /** The caller already draws the border, the radius and the shadow around
   *  both the strip and this panel, so the panel draws none of its own.
   *  That is the laptop's narrow layout, where the pair is one floating
   *  card rather than a bar welded to the top of the screen. */
  bare?: boolean;
}) {
  return (
    <div
      className={cn(
        "bg-card",
        !bare && "card-elevated rounded-b-[16px] border-x border-b border-border"
      )}
    >
      <div className="overflow-y-auto pt-1.5" style={{ maxHeight }}>
        <QuestionList
          questions={edition.questions}
          current={current}
          within={within}
          size="panel"
          onPick={onPick}
        />
      </div>
      {/* The handle says it can be swiped away. It is a hint, not the only
          way out: the strip above it is a 44px target under the thumb. */}
      <div className="flex justify-center pb-2.5 pt-2">
        <span className="h-1 w-9 rounded-full bg-border" />
      </div>
    </div>
  );
}

/* `BottomSheet` and `ContentsPage` used to live here: the navigator drawn a
   second and a third way, for him to compare on his phone. He picked the first
   (owner question 9, answer "A"), and the two that lost were only ever reached
   through the lab's Screens tab, which is now deleted. Kept in the history, not
   on the page: a room that draws three answers to a settled question is a room
   that makes you re-decide it every time you open it. */
