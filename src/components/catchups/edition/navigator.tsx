"use client";

/* ------------------------------------------------------------------ *
 *  The instrument you move with.
 *
 *  This is where the reader spends its one bet, and it is transplanted
 *  from `/lab/catchups/sketches/_navigator.tsx` rather than re-derived.
 *  Fifteen designs restyled the answers and drew the same navigator; he
 *  rejected all fifteen and said the tiles were fine, the question font
 *  was fine, and the navigator was "literally identical across everything
 *  ... I'd like to see that style done properly with some good attention
 *  put on it, but then also done in a bunch of different ways" (R24).
 *
 *  THE STRIP. Under the app's green bar sits one strip, always there. At
 *  rest it says "15 August 2026", which is the one place the Edition's
 *  date is printed. Once a question's heading has scrolled under the bar,
 *  the strip carries that question instead.
 *
 *  THE LINE. Along the strip's top edge, a thin cinnamon line grows from
 *  the left as you read: how far through the Edition you are. It is R28's
 *  cinnamon line given a job, in the top bar where R34 wanted it.
 *
 *  THE INDICATOR. When the strip opens into the list of questions, the
 *  same line turns the corner and runs down the left of the list, and it
 *  STOPS at the question you are in. The end of a measure is the mark.
 *  Never weight: bolding the current row is what makes the shipped rail
 *  reflow, which he caught on 2026-09-07 ("the words spill onto the next
 *  line because it's gone from regular to bold").
 *
 *  NAVIGATOR A, and it is the only one. `UnfoldedPanel` is the strip
 *  growing downward in place: not from the bottom (R39), not green (R39),
 *  no title because the bar above already says the Catch-up's name (R39),
 *  no X because the strip you tapped is still under your thumb (R43). The
 *  other two were drawn, compared and deleted; owner question 9 chose this
 *  one (N46).
 * ------------------------------------------------------------------ */

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { CaretDown } from "@phosphor-icons/react";
import { m, useMotionValue, useSpring, useTransform, type MotionValue } from "motion/react";
import { EASE_OUT_SMOOTH } from "@/components/common/motion";
import { cn } from "@/lib/utils";
import { formatDisplayDateLong } from "@/lib/utils";
import type { ReaderQuestion } from "./reader-types";

/** The app's phone bar: `h-14` on the header in `layout/sidebar.tsx`. */
export const BAR = 56;

/** "15 August 2026", in cinnamon, and nothing else.
 *
 *  His, 2026-09-07: "In the reader, let's ditch the round 1. Let's only have
 *  the date, and then let the date be orange. Let's not have the round number.
 *  The round number is irrelevant." That closed the last place an Edition
 *  number survived anywhere, and it took the middle dot with it -- there is
 *  nothing left to separate. An Edition is identified by its date. */
export function EditionMeta({
  publishedAt,
  className,
}: {
  publishedAt: Date | string;
  className?: string;
}) {
  return (
    <span className={cn("font-medium text-cinnamon", className)}>{formatDisplayDateLong(publishedAt)}</span>
  );
}

/* ── The strip ─────────────────────────────────────────────────────── *
 *  Its own glass, not the app's `.glass`: that one is 78% paper, built for
 *  a bar over a feed where nothing has to be read through it. A question
 *  docked over the tile it just left needs the tile gone. 93% paper, and
 *  the blur keeps the edge from reading as a solid slab. */
const STRIP_GLASS = {
  backgroundColor: "color-mix(in srgb, var(--card) 93%, transparent)",
  backdropFilter: "blur(14px)",
  WebkitBackdropFilter: "blur(14px)",
} as const;

/** The docked question, always on screen, so it has to be small.
 *
 *  TWO LINES, and it came DOWN from three. His, owner question 20, 2026-09-08:
 *  "a. make this clamp to three lines and the other one that was previously
 *  clamped to three lines, clamp to two lines." The two clamps swap, and the
 *  inversion is right for a reason worth keeping: the strip is on screen the
 *  whole time you are reading, so it has to be small; the pull-down list is a
 *  thing you deliberately open, so it can afford more. This closes F41. */
const STRIP_CLAMP_LINES = 2;

export function Strip({
  label,
  docked,
  progress,
  open = false,
  onToggle,
}: {
  /** The current question when `docked`, otherwise the Edition's date. */
  label: ReactNode;
  docked: boolean;
  /** 0 to 1, how far through the Edition. Drawn as the line along the top. */
  progress: number;
  open?: boolean;
  onToggle?: () => void;
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
            : "text-[13px] leading-[1.35] text-muted-foreground",
        )}
        style={
          docked
            ? {
                display: "-webkit-box",
                WebkitBoxOrient: "vertical",
                WebkitLineClamp: STRIP_CLAMP_LINES,
                overflow: "hidden",
                /* A question is member-written and may be a pasted link, which
                   is one unbreakable 54-character run (F18). Without this the
                   strip lays out wider than the phone. */
                overflowWrap: "anywhere",
              }
            : undefined
        }
      >
        {label}
      </span>
      {/* The app's own curve, through motion rather than a CSS transition:
          the design system's easings are exported as arrays, and writing one
          into `transitionTimingFunction` means hand-typing it. `m.span` takes
          the token itself. */}
      <m.span
        aria-hidden
        className="shrink-0 text-muted-foreground"
        animate={{ rotate: open ? 180 : 0 }}
        /* The panel's own clock, so the caret and the list are one gesture
           rather than two that finish 40ms apart. */
        transition={{ duration: 0.26, ease: EASE_OUT_SMOOTH }}
      >
        <CaretDown size={15} weight="bold" />
      </m.span>
    </>
  );

  /* No chrome of its own beyond the hairline under it: the caller draws the
     border, the radius and the elevation, because those change with the width
     (welded under the green bar on a phone, a floating card on a laptop) and a
     component that decided them would have to be told which. */
  const shell = "relative w-full overflow-hidden border-b border-border text-left";
  /* `text-left` here and not only on the shell: a <button> centres its own
     text, whatever its parent says. */
  const row = "flex min-h-[44px] w-full items-center gap-3 px-5 py-2.5 text-left";

  return (
    <div className={cn(shell, open && "bg-card")} style={open ? undefined : STRIP_GLASS}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-label={open ? "Close the questions" : "Open the questions"}
        className={cn(
          row,
          "focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring",
        )}
      >
        {inner}
      </button>
    </div>
  );
}

/* ── The list, with the line beside it ─────────────────────────────── */

type ListSize = "panel" | "rail";

const LIST: Record<
  ListSize,
  { size: number; lineHeight: number; padY: number; indent: number; spineX: number; serif: boolean }
> = {
  /* The unfolded strip: one size, the body's. */
  panel: { size: 15.5, lineHeight: 1.35, padY: 11, indent: 40, spineX: 20, serif: false },
  /* The laptop's rail, which is this list left open. Serif and further apart
     than the 13px sans it was, which he asked for; at 14, which is `small` on
     the app's type scale, because 16 was not. He looked at 16 and said: "the
     siderail for questions font is too big it's imbalancing the screen. my
     eyes go there instead of the content when it should just be a navigation
     thing." A navigation list has to be legible and then get out of the way,
     so it sits one step under the body it is pointing at, and the air between
     rows does the work the size was doing. */
  rail: { size: 14, lineHeight: 1.35, padY: 11, indent: 22, spineX: 0, serif: true },
};

/** A row of the pull-down list, and of the laptop's rail.
 *
 *  THREE LINES, and it came UP from nothing. Before this a row had no clamp
 *  at all, so a 300-character question was 211px tall against its neighbours'
 *  41 -- measured, and it is F41. His answer, owner question 20: "make this
 *  clamp to three lines". Three rather than two because this list is a thing
 *  you deliberately pull down, unlike the strip above it.
 *
 *  THE CLAMP GOES ON AN INNER SPAN, and that is not a detail. `overflow:
 *  hidden` clips at the PADDING box, so a clamp written on the padded row
 *  bleeds a band of the fourth line into the row beneath. The padding stays on
 *  the button; the clamp sits inside it. */
const ROW_CLAMP_LINES = 3;

/* ── the swell ─────────────────────────────────────────────────────── *
 *  His, 2026-09-07: "the navigation rail on the reader for the questions has
 *  magnification. delete it and rebuild it from scratch. it's super glitchy
 *  and jittery it's not smooth at all like it is in macos. and things react
 *  early and late and it's just built horribly."
 *
 *  He was describing three separate faults and all three were real: the
 *  pointer's position was React state, so every pixel of mouse movement
 *  reconciled eleven rows; the row centres were cached and only recomputed
 *  when the CURRENT QUESTION changed, so rows swelled by the wrong amount;
 *  and a 90ms CSS transition chased a value that changed every frame, which
 *  always smears and always lags the cursor.
 *
 *  This is the app's own mechanism instead, the one the Collection's year rail
 *  uses and the one he is comparing it to: a motion value for the pointer, a
 *  transform that reads each row's LIVE rect, and a spring on the scale.
 *  Motion values write to the DOM directly, so the pointer moving costs zero
 *  React renders; the rect is read at the moment it is needed, so nothing is
 *  stale; and the spring is the only thing smoothing. */
/* The spring and the peak are the Collection's own, so the two rails feel the
   same under the hand. The REACH is not, and it cannot be: the Collection's
   rows are single lines about 20px tall, so 64px of falloff covers three of
   them either side. These rows wrap and measure 41 to 79px, so at 64 the row
   under the pointer swelled alone and its neighbours sat at exactly 1 -- a
   single row popping rather than a dock breathing. Measured at 120: the
   pointer at one row's centre puts the next at about 1.06 and the one after at
   about 1.02, which is the falloff you can see. */
const DOCK_REACH = 120;
/* 1.05, and both cuts are off the GROWTH rather than off the number. His, in
   two passes on 2026-09-07: "reduce the rail magnification by 40%", then
   "decrease the magnification by another 40%." A peak of 1.14 grows a row by
   0.14; six tenths of that is 0.084, and six tenths again is 0.05. Taking 40%
   off 1.14 itself would read 0.68 and SHRINK every row under the pointer,
   which is plainly not what the word means. */
const DOCK_PEAK = 1.05;
const DOCK_SPRING = { stiffness: 400, damping: 28 };
/** Far away, not zero: this keeps every row outside DOCK_REACH while the
 *  pointer is not in the list, which is its resting state. */
const POINTER_AWAY = 1e5;

function Row({
  q,
  t,
  here,
  swells,
  pointerY,
  onPick,
}: {
  q: ReaderQuestion;
  t: (typeof LIST)[ListSize];
  here: boolean;
  swells: boolean;
  pointerY: MotionValue<number>;
  onPick: () => void;
}) {
  const ref = useRef<HTMLButtonElement>(null);
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
  );
  const style = {
    fontSize: t.size,
    lineHeight: t.lineHeight,
    paddingTop: t.padY,
    paddingBottom: t.padY,
    paddingLeft: t.indent,
    paddingRight: 20,
  } as const;

  /* The clamp, on the inner span rather than on the padded button. See
     ROW_CLAMP_LINES: `overflow: hidden` clips at the padding box, so the same
     rule written one level up bleeds a band of the fourth line downward. */
  const text = (
    <span
      className="block [overflow-wrap:anywhere]"
      style={{
        display: "-webkit-box",
        WebkitBoxOrient: "vertical",
        WebkitLineClamp: ROW_CLAMP_LINES,
        overflow: "hidden",
      }}
    >
      {q.text}
    </span>
  );

  if (!swells) {
    return (
      <button
        ref={ref}
        type="button"
        onClick={onPick}
        aria-current={here ? "true" : undefined}
        className={className}
        style={style}
      >
        {text}
      </button>
    );
  }

  /* A transform does not participate in layout, so a row swells and nothing
     below it moves. `left center` rather than the centre, because these rows
     are set against a measure down the left and that edge must not breathe. */
  return (
    <m.button
      ref={ref}
      type="button"
      onClick={onPick}
      aria-current={here ? "true" : undefined}
      className={className}
      style={{ ...style, scale, transformOrigin: "left center" }}
    >
      {text}
    </m.button>
  );
}

export function QuestionList({
  questions,
  current,
  within,
  size,
  onPick,
  className,
}: {
  questions: ReaderQuestion[];
  /** The question you are in. */
  current: number;
  /** 0 to 1, how far through the current question; where the line ends. */
  within: number;
  size: ListSize;
  onPick: (index: number) => void;
  className?: string;
}) {
  const rows = useRef<Array<HTMLLIElement | null>>([]);
  const [fill, setFill] = useState(0);
  const t = LIST[size];
  const swells = size === "rail";

  /* The pointer, as a motion value. Setting it writes straight through to
     every row's transform without a single React render -- which is the whole
     reason the rebuilt swell is smooth where the old one was not. */
  const pointerY = useMotionValue(POINTER_AWAY);

  useLayoutEffect(() => {
    const el = rows.current[current];
    if (!el) return;
    /* A floor under the fill, because the honest number is zero when you are
       at the very top of the very first question, and a zero-length measure
       reads as a mark that failed to draw rather than as a mark at the start.
       A fifth of a row is enough to see. */
    const through = Math.max(0.2, Math.min(1, within));
    setFill(el.offsetTop + el.offsetHeight * through);
  }, [current, within, questions.length]);

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
      {questions.map((q, i) => (
        <li
          key={q.id}
          ref={(el) => {
            rows.current[i] = el;
          }}
        >
          <Row
            q={q}
            t={t}
            here={i === current}
            swells={swells}
            pointerY={pointerY}
            onPick={() => onPick(i)}
          />
        </li>
      ))}
    </ol>
  );
}

/** Navigator A: the strip unfolds downward in place. */
export function UnfoldedPanel({
  questions,
  current,
  within,
  onPick,
}: {
  questions: ReaderQuestion[];
  current: number;
  within: number;
  onPick: (index: number) => void;
}) {
  return (
    /* No border, no radius, no shadow: the caller draws all three around the
       strip and this panel together, so the pair reads as one object. */
    <div className="bg-card">
      {/* A cap, so forty questions scroll inside the panel instead of off the
          screen. Shorter on a phone, where the panel hangs from the top of the
          window rather than from a card 16px down. */}
      {/* NO GRABBER PILL under the list. The room drew one as a hint that the
          panel could be swiped away, and he deleted it on sight, 2026-09-10:
          "remove the bottom thin pill on that dialog it's not doing anything
          is it?" It was not: the strip above is a 44px target under the thumb
          and its caret turns, so the way out was already the way in. */}
      <div className="max-h-[560px] overflow-y-auto py-1.5 md:max-h-[480px]">
        <QuestionList
          questions={questions}
          current={current}
          within={within}
          size="panel"
          onPick={onPick}
        />
      </div>
    </div>
  );
}
