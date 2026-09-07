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
 *  Round and its date are printed. Once a question's heading has scrolled
 *  under the bar, the strip carries that question instead, in full,
 *  however long it is. A 300-character question is five lines, and it is
 *  five lines: "what if the question is long? How does it fill into
 *  somewhere? ... I don't want a bunch of dot dot dots everywhere." (R19)
 *  Its height changes only when the question does, never with the scroll.
 *
 *  THE LINE. Along the strip's top edge, a thin cinnamon line grows from
 *  the left as you read: how far through the Round you are. It is the
 *  loading line every phone already knows, and it is R28's cinnamon line
 *  given a job: "if we can create some use for that line, that could be
 *  good." R34 asked for something like it "maybe in the top bar".
 *
 *  THE INDICATOR. He does not want a dot and he does not want an
 *  underline, and he said he does not know what he wants (R28). When the
 *  strip opens into the list of questions, the same line turns the corner
 *  and runs down the left of the list, and it STOPS at the question you
 *  are in. The end of a measure is the mark. Nothing is added to the row.
 *
 *  THREE WAYS, as asked. `UnfoldedPanel` is the strip itself growing
 *  downward into the list, in place, from the top: not from the bottom
 *  (R39: "does it have to be from the bottom? Why aren't we trying it in a
 *  different way?"), not green (R39), with no title because the bar above
 *  already says the Catch-up's name (R39: "Can't we say the name of the
 *  catch-up?"), and no X because the strip you tapped is still there under
 *  your thumb and a swipe up puts it away (R43). `BottomSheet` is the
 *  sheet he has seen fifteen times, done properly: paper, the name as its
 *  title, no lines between rows, no X, and the current row marked with the
 *  app's own selection tint instead of the line, so the two indicators can
 *  be compared. `ContentsPage` is the whole page becoming the Round's
 *  contents, set in the heading face, the one that is "a bit more than
 *  that" (R43).
 * ------------------------------------------------------------------ */

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { CaretDown } from "@phosphor-icons/react";
import { m } from "motion/react";
import { EASE_OUT_SMOOTH } from "@/components/common/motion";
import { cn } from "@/lib/utils";
import type { SketchQuestion, SketchRound } from "./_types";
import { longDate } from "./_parts";

/** The app's phone bar. */
export const BAR = 56;

/** "Round 1 · 15 August 2026". Two facts, the app's own dot between them,
 *  and the only place either is printed on the reader. */
export function RoundMeta({ round, className }: { round: SketchRound; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <span>Round {round.number}</span>
      <span className="dotsep" aria-hidden>
        ·
      </span>
      <span>{longDate(round.publishedAt)}</span>
    </span>
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

export function Strip({
  label,
  docked,
  progress,
  open = false,
  onToggle,
  floating = false,
  interactive = true,
}: {
  /** The current question when `docked`, otherwise the Round's meta line. */
  label: ReactNode;
  docked: boolean;
  /** 0 to 1, how far through the Round. Drawn as the line along the top. */
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
      >
        {label}
      </span>
      {interactive && (
        <CaretDown
          size={15}
          weight="bold"
          className={cn(
            "shrink-0 text-muted-foreground transition-transform duration-200",
            open && "rotate-180"
          )}
        />
      )}
    </>
  );

  const shell = cn(
    "relative w-full overflow-hidden text-left",
    floating
      ? "card-elevated rounded-[12px] border border-border"
      : "border-b border-border"
  );
  /* `text-left` here and not only on the shell: a <button> centres its
     text by itself, and the first capture had every label centred. */
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

type ListSize = "panel" | "page" | "rail";

const LIST: Record<
  ListSize,
  { size: number; lineHeight: number; padY: number; indent: number; spineX: number; serif: boolean }
> = {
  /* The unfolded strip and the sheet: one size, the body's. */
  panel: { size: 15.5, lineHeight: 1.35, padY: 11, indent: 40, spineX: 20, serif: false },
  /* The contents page: the heading face, a size under the in-flow heading,
     and eleven questions fit one phone screen at it. */
  page: { size: 19, lineHeight: 1.28, padY: 11, indent: 40, spineX: 20, serif: true },
  /* The laptop's rail, which is this list left open. */
  rail: { size: 13.5, lineHeight: 1.35, padY: 7, indent: 18, spineX: 0, serif: false },
};

export function QuestionList({
  questions,
  current,
  within,
  size,
  mark = "line",
  onPick,
  className,
}: {
  questions: SketchQuestion[];
  current: number;
  /** 0 to 1, how far through the current question; where the line ends. */
  within: number;
  size: ListSize;
  /** `line`: the measure ends at your row. `tint`: the app's selection wash. */
  mark?: "line" | "tint";
  onPick?: (index: number) => void;
  className?: string;
}) {
  const rows = useRef<Array<HTMLLIElement | null>>([]);
  const [fill, setFill] = useState(0);
  const t = LIST[size];

  useLayoutEffect(() => {
    const el = rows.current[current];
    if (el) setFill(el.offsetTop + el.offsetHeight * Math.max(0, Math.min(1, within)));
  }, [current, within, questions.length]);

  return (
    <ol className={cn("relative", className)}>
      {mark === "line" && (
        <>
          <span
            aria-hidden
            className="absolute top-0 bottom-0 w-[2px] rounded-full bg-border"
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
      )}
      {questions.map((q, i) => {
        const here = i === current;
        return (
          <li
            key={q.id}
            ref={(el) => {
              rows.current[i] = el;
            }}
          >
            <button
              type="button"
              onClick={() => onPick?.(i)}
              aria-current={here ? "true" : undefined}
              className={cn(
                "block w-full text-left transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring",
                t.serif ? "font-heading" : "",
                here ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                here && !t.serif && "font-medium",
                mark === "tint" && "rounded-[10px]",
                mark === "tint" && here && "bg-canopy/[0.07]"
              )}
              style={{
                fontSize: t.size,
                lineHeight: t.lineHeight,
                paddingTop: t.padY,
                paddingBottom: t.padY,
                paddingLeft: mark === "line" ? t.indent : 14,
                paddingRight: mark === "line" ? 20 : 14,
              }}
            >
              {q.text}
            </button>
          </li>
        );
      })}
    </ol>
  );
}

/* ── First way: the strip unfolds ──────────────────────────────────── */

export function UnfoldedPanel({
  round,
  current,
  within,
  onPick,
  maxHeight,
}: {
  round: SketchRound;
  current: number;
  within: number;
  onPick?: (index: number) => void;
  /** So forty questions scroll inside the panel instead of off the screen. */
  maxHeight?: number;
}) {
  return (
    <div className="card-elevated rounded-b-[16px] border-x border-b border-border bg-card">
      <div className="overflow-y-auto pt-1.5" style={{ maxHeight }}>
        <QuestionList
          questions={round.questions}
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

/* ── Second way: the sheet, done properly ──────────────────────────── */

export function BottomSheet({
  round,
  current,
  within,
  onPick,
}: {
  round: SketchRound;
  current: number;
  within: number;
  onPick?: (index: number) => void;
}) {
  return (
    <div
      className="rounded-t-[20px] border-t border-border bg-card shadow-[0_-12px_40px_-20px_rgb(var(--shadow-ink)/0.55)]"
      style={{ paddingBottom: "max(20px, env(safe-area-inset-bottom))" }}
    >
      <div className="flex justify-center pb-1 pt-2.5">
        <span className="h-1 w-9 rounded-full bg-border" />
      </div>
      <h3 className="px-5 pb-2 pt-1 font-heading text-[19px] text-foreground">{round.catchupName}</h3>
      <div className="px-2">
        <QuestionList
          questions={round.questions}
          current={current}
          within={within}
          size="panel"
          mark="tint"
          onPick={onPick}
        />
      </div>
    </div>
  );
}

/* ── Third way: the page becomes the contents ──────────────────────── */

export function ContentsPage({
  round,
  current,
  within,
  onPick,
}: {
  round: SketchRound;
  current: number;
  within: number;
  onPick?: (index: number) => void;
}) {
  return (
    <div className="flex h-full flex-col pt-5">
      <p className="px-5 text-[13px] text-muted-foreground">
        <RoundMeta round={round} />
      </p>
      {/* Forty questions scroll under a fade rather than stopping at a hard
          edge through the middle of a line. */}
      <div
        className="mt-4 min-h-0 flex-1 overflow-y-auto pb-6"
        style={{
          maskImage: "linear-gradient(to bottom, black calc(100% - 40px), transparent 100%)",
          WebkitMaskImage: "linear-gradient(to bottom, black calc(100% - 40px), transparent 100%)",
        }}
      >
        <QuestionList
          questions={round.questions}
          current={current}
          within={within}
          size="page"
          onPick={onPick}
        />
      </div>
    </div>
  );
}
