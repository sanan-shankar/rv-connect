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
 *  under the bar, the strip carries that question instead. Three lines at
 *  most, then it cuts, because he weighed the two costs himself on
 *  2026-09-07: "I think it should not be 8 lines, it should be 3 lines,
 *  and then you can dot dot dot it. But it takes up way too much of the
 *  screen. 3 would be okay." That supersedes R19's "I don't want a bunch
 *  of dot dot dots everywhere", which was about a 20-character cut.
 *
 *  THE LINE. Along the strip's top edge, a thin cinnamon line grows from
 *  the left as you read: how far through the Round you are. It is R28's
 *  cinnamon line given a job, in the top bar where R34 wanted it.
 *
 *  THE INDICATOR. When the strip opens into the list of questions, the
 *  same line turns the corner and runs down the left of the list, and it
 *  STOPS at the question you are in. The end of a measure is the mark.
 *  Never weight: bolding the current row is what makes the shipped rail
 *  reflow, which he caught again on 2026-09-07 ("the words spill onto the
 *  next line because it's gone from regular to bold").
 *
 *  THREE WAYS, as asked. `UnfoldedPanel` is the strip growing downward in
 *  place: not from the bottom (R39), not green (R39), no title because
 *  the bar above already says the Catch-up's name (R39), no X because the
 *  strip you tapped is still under your thumb (R43). `BottomSheet` is the
 *  sheet he has seen fifteen times, done properly. `ContentsPage` is the
 *  whole page becoming the Round's contents, "a bit more than that" (R43).
 * ------------------------------------------------------------------ */

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
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

type ListSize = "panel" | "page" | "rail";

const LIST: Record<
  ListSize,
  { size: number; lineHeight: number; padY: number; indent: number; spineX: number; serif: boolean }
> = {
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

/* The swell, continuous rather than stepped.
 *
 *  His, 2026-09-07: "I feel like the navigation is more discrete and in
 *  these steps compared to the more macos dock magnification which is more
 *  continuous." He is describing exactly what the first cut did: it found
 *  the NEAREST row and scaled by whole rows away, so three rows had three
 *  fixed sizes and everything else was flat, and moving the pointer inside
 *  one row changed nothing at all.
 *
 *  The dock does not work that way. Its magnification is a function of the
 *  distance in PIXELS between the pointer and each item, so every pixel of
 *  movement changes every item a little. This is that: a bell curve on the
 *  distance from the pointer to a row's middle, which is smooth everywhere
 *  and needs no cases. SIGMA is how far the swell reaches, in pixels;
 *  AMP is how much the row under the pointer grows. */
const SWELL_AMP = 0.085;
const SWELL_SIGMA = 46;

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
  /* Every row's middle, in the list's own coordinates, so the swell can be
     a function of pixels rather than of row numbers. */
  const [centres, setCentres] = useState<number[]>([]);
  /* Where the pointer is inside the list. -1 is "no pointer", which is
     every touch device and the resting state of a mouse. */
  const [pointerY, setPointerY] = useState(-1);
  const frame = useRef(0);
  const t = LIST[size];
  const swells = size === "rail";

  useLayoutEffect(() => {
    const el = rows.current[current];
    if (!el) return;
    /* A floor under the fill, because the honest number is zero when you
       are at the very top of the very first question, and a zero-length
       measure reads as a mark that failed to draw rather than as a mark
       at the start. A fifth of a row is enough to see. */
    const through = Math.max(0.2, Math.min(1, within));
    setFill(el.offsetTop + el.offsetHeight * through);
    if (swells) {
      setCentres(rows.current.map((r) => (r ? r.offsetTop + r.offsetHeight / 2 : -999)));
    }
  }, [current, within, questions.length, swells]);

  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  return (
    <ol
      className={cn("relative", className)}
      onPointerMove={
        swells
          ? (e) => {
              if (e.pointerType !== "mouse") return;
              const y = e.clientY - e.currentTarget.getBoundingClientRect().top;
              /* One update a frame. The handler fires far more often than
                 the screen refreshes, and the swell only needs to be right
                 once per painted frame. */
              cancelAnimationFrame(frame.current);
              frame.current = requestAnimationFrame(() => setPointerY(y));
            }
          : undefined
      }
      onPointerLeave={
        swells
          ? () => {
              cancelAnimationFrame(frame.current);
              setPointerY(-1);
            }
          : undefined
      }
    >
      {mark === "line" && (
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
      )}
      {questions.map((q, i) => {
        const here = i === current;
        /* The swell, which he asked to try: "maybe we could even add
           magnification like we do in the side rail of the collection."
           The Collection's rail can grow its rows because they are one
           line each at a fixed pitch. These wrap to three, so growing the
           TYPE would reflow the whole list under the pointer. A transform
           does not participate in layout, so a row swells and nothing
           below it moves. */
        const centre = centres[i];
        const scale =
          swells && pointerY >= 0 && centre !== undefined
            ? 1 + SWELL_AMP * Math.exp(-(((pointerY - centre) / SWELL_SIGMA) ** 2))
            : 1;
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
                "block w-full origin-left text-left transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring",
                t.serif && "font-heading",
                /* Colour, never weight: a weight change reflows the words
                   and pushes the list around, which is the shipped rail's
                   bug and he caught it here too. */
                here ? "text-foreground" : "text-muted-foreground hover:text-foreground",
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
                /* Written straight onto the element rather than animated
                   through a spring: the dock's magnification tracks the
                   pointer exactly, and a spring chasing a value that
                   changes every frame lags behind the cursor. The short
                   linear transition is only there to carry the return to
                   rest when the pointer leaves. */
                ...(swells
                  ? {
                      transform: `scale(${scale})`,
                      transition: "transform 90ms linear",
                    }
                  : {}),
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
  bare = false,
}: {
  round: SketchRound;
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
