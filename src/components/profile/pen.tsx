"use client";

/* ------------------------------------------------------------------ *
 *  The pen: how a value on your own letterhead becomes typeable.
 *
 *  Owner, 2026-08-07, on the first attempt: "a lot of the elements have
 *  just moved since you last worked on them ... it should just look just
 *  like it did before, but editable when you click edit. Who asked you
 *  to move things around?"
 *
 *  Nobody did. The first version gave every field 6px of padding and a
 *  1px border and then tried to cancel them with negative margins at
 *  some call sites and not others, which moved the admission number 3px
 *  up, the three fact labels 6px right, and everything below the
 *  occupation 7px down. Measured against the pre-change component, not
 *  guessed.
 *
 *  So the rule this file now keeps, and the reason every class below is
 *  what it is:
 *
 *      A PEN OCCUPIES EXACTLY THE BOX ITS TEXT OCCUPIES.
 *
 *  No padding, no border, no margin, and typography inherited from the
 *  wrapper rather than declared. A field is laid out exactly as the
 *  <p> or <dd> or <h1> it stands in for, so the resting profile is
 *  pixel-identical to the one that never had a pen, and turning the pen
 *  on cannot move anything either.
 *
 *  What makes a field look editable is the RULE and nothing else: a
 *  dotted canopy line, absolutely positioned so it adds no height, drawn
 *  in on scaleX. There was also a white plate behind the text on hover
 *  and focus; the owner cut it (2026-08-07: "this rectangle selection
 *  when you're hovering and you're typing into it wasn't there before, I
 *  don't like the white rectangles, isn't it fine to not have the
 *  rectangle?"). It is fine. The rule already says the whole sheet is
 *  live, and a box that appears under the pointer says it a second time
 *  in a heavier voice.
 *
 *  Cutting it also fixed a bug it was causing on its own: the cities
 *  trigger keeps DOM focus after its popover closes, so the plate's
 *  focus-within state stayed painted and left a white rectangle sitting
 *  over the value until you clicked somewhere else.
 * ------------------------------------------------------------------ */

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { SPRINGS } from "@/components/common/motion";

/**
 * The field itself. Zero box in every direction.
 *
 * Tailwind's preflight already gives form controls `font-family`,
 * `line-height`, `letter-spacing`, `font-weight` and `color` of `inherit`, so
 * a field wrapped in the same classes the original element carried measures
 * the same. The only things that have to be beaten out of the browser are the
 * default padding, border and the focus ring.
 */
const PEN_FIELD =
  "m-0 border-0 bg-transparent p-0 text-inherit outline-none disabled:cursor-default";

/* The rule, dotted, in canopy. A repeating gradient rather than a dotted
   border, so the dash rhythm is ours rather than the browser's and so it can
   live on an element with no border of its own to style. */
const RULE_IMAGE =
  "repeating-linear-gradient(90deg, var(--color-canopy) 0 2px, transparent 2px 5px)";

/**
 * The rule under a pen. Its own element, absolutely positioned, so it adds no
 * height and cannot push anything. `origin-left` plus a scaleX spring means it
 * draws in from the left the way a pen would.
 */
export function PenRule({ on, delay = 0 }: { on: boolean; delay?: number }) {
  return (
    <motion.span
      aria-hidden
      className="pointer-events-none absolute inset-x-0 -bottom-1 h-[2px] origin-left"
      style={{ backgroundImage: RULE_IMAGE }}
      initial={false}
      animate={{ scaleX: on ? 1 : 0, opacity: on ? 0.45 : 0 }}
      transition={{ ...SPRINGS.gentle, delay: on ? delay : 0 }}
    />
  );
}

/** The wrapper every pen shares: the field, and the rule beneath it.
 *  `inline-block` so it sits in text flow exactly as the span it replaces. */
export function PenSlot({
  editing,
  delay,
  className,
  children,
}: {
  editing: boolean;
  delay?: number;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span className={cn("relative inline-block max-w-full align-baseline", className)}>
      {children}
      <PenRule on={editing} delay={delay} />
    </span>
  );
}

/* ------------------------------------------------------------------ *
 *  A single-line value, exactly as wide as what is in it.
 *
 *  "Student at Imperial College London" is a sentence, and a sentence
 *  with a fixed-width hole in it is not one. Two elements share one grid
 *  cell: an invisible copy of the text gives the cell its width, and the
 *  real input stretches over it. No measuring, no ref, no resize
 *  listener. `field-sizing: content` replaces all of it the day Safari
 *  ships it.
 * ------------------------------------------------------------------ */
export function PenValue({
  value,
  onChange,
  onCommit,
  editing,
  placeholder,
  ariaLabel,
  delay,
  className,
  inputMode,
  maxLength,
  restText,
}: {
  value: string;
  onChange: (v: string) => void;
  /** Fired on blur, and on Enter. This is the save. */
  onCommit: () => void;
  editing: boolean;
  placeholder: string;
  ariaLabel: string;
  delay?: number;
  /** the typography of the element being stood in for; on the wrapper, so the
   *  mirror and the field both inherit it and cannot disagree */
  className?: string;
  inputMode?: "numeric" | "tel" | "url" | "email";
  maxLength?: number;
  /** What an EMPTY slot says while the pen is away, for the one field whose
   *  blank is a statement: a teacher's open-ended tenure reads "present" at
   *  rest and only becomes an empty year box when editing. */
  restText?: string;
}) {
  return (
    <PenSlot editing={editing} delay={delay} className={className}>
      {/* The mirror is in FLOW and the field is laid over it. That is what
          makes a pen occupy exactly its text's box: the box comes from a span
          rendering the same string in the same font, so it is by construction
          the box the read-only span had. Sizing the field itself and letting
          it drive the layout is what put the admission number 3px high and
          the name 3px tall, because a control's own idea of its height is not
          its text's line box. */}
      <span className="relative block">
        {/* The mirror doubles as the rest-state text when restText applies:
            it is already the exact box the value would occupy, so showing it
            costs no layout and the pen-out swap happens in place. */}
        <span
          aria-hidden
          className={cn(
            "block whitespace-pre",
            !editing && !value && restText ? undefined : "invisible"
          )}
        >
          {!editing && !value && restText ? restText : value || placeholder}
        </span>
        <input
          value={value}
          readOnly={!editing}
          onChange={(e) => onChange(e.target.value)}
          onBlur={() => editing && onCommit()}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              e.currentTarget.blur();
            }
          }}
          placeholder={editing ? placeholder : ""}
          aria-label={ariaLabel}
          inputMode={inputMode}
          maxLength={maxLength}
          size={1}
          tabIndex={editing ? 0 : -1}
          className={cn(
            PEN_FIELD,
            "absolute inset-0 h-full w-full",
            editing && "cursor-text placeholder:text-muted-foreground/70"
          )}
        />
      </span>
    </PenSlot>
  );
}

/* ------------------------------------------------------------------ *
 *  A value that wraps. This is a textarea, and it has to be.
 *
 *  An <input> is one line forever: at 390px a display-size name longer
 *  than the column just runs off the end of it, and "Sanan Shankar" came
 *  out reading "Sanan Shankaı" under the bird. The <h1> it stands in for
 *  wraps to two lines, so the typeable version has to wrap too, or it is
 *  not the same object.
 * ------------------------------------------------------------------ */
export function PenBlock({
  value,
  onChange,
  onCommit,
  editing,
  placeholder,
  ariaLabel,
  delay,
  className,
  singleLine = false,
  snug = false,
  maxLength,
}: {
  value: string;
  onChange: (v: string) => void;
  onCommit: () => void;
  editing: boolean;
  placeholder: string;
  ariaLabel: string;
  delay?: number;
  className?: string;
  /** A name has no second paragraph, so Enter is swallowed. */
  singleLine?: boolean;
  /**
   * Sized to the text rather than to the column.
   *
   * A name needs this and About does not. About is a paragraph, and its rule
   * running the width of the sheet reads as a line to write on. A name is a
   * value, and a rule carrying on past the last letter reads as a blank
   * waiting to be filled, which it is not.
   */
  snug?: boolean;
  maxLength?: number;
}) {
  return (
    <PenSlot
      editing={editing}
      delay={delay}
      className={cn(snug ? "block w-fit" : "block w-full", className)}
    >
      {/* Same mirror-in-flow pattern as PenValue, with a WRAPPING copy, so a
          long name breaks exactly where the <h1> broke and the block is
          exactly as tall as the paragraph it stands in for. No ResizeObserver
          and no scrollHeight: a textarea's scrollHeight overshoots its line
          box by 3px at display size, which is enough to push every section
          below the name down the sheet. */}
      <span className="relative block">
        {/* `break-words` matches the UA's own `overflow-wrap: break-word` on a
            textarea, so a name with no space in it for 60 characters breaks in
            the mirror on the same character it breaks on in the field. Without
            it the mirror keeps one long line, the field wraps to two, and the
            clip box -- which now reaches 0.12em past the line box -- shows a
            sliver of a second line the mirror never made room for. */}
        <span aria-hidden className="invisible block whitespace-pre-wrap break-words">
          {value || placeholder}
          {/* A zero-width space, so a value ending in a newline still renders
              the empty last line the caret is sitting on. */}
          {"\u200b"}
        </span>
        <textarea
          rows={1}
          value={value}
          readOnly={!editing}
          onChange={(e) =>
            onChange(singleLine ? e.target.value.replace(/\n/g, "") : e.target.value)
          }
          onBlur={() => editing && onCommit()}
          onKeyDown={(e) => {
            if (singleLine && e.key === "Enter") {
              e.preventDefault();
              e.currentTarget.blur();
            }
          }}
          placeholder={placeholder}
          aria-label={ariaLabel}
          maxLength={maxLength}
          spellCheck={!singleLine}
          tabIndex={editing ? 0 : -1}
          className={cn(
            PEN_FIELD,
            /* The clip box is grown past the line box at both ends, because a
               textarea is a scroll container and clips at its own edges.

               The name is set at line-height 1.05, and Libre Baskerville's
               content area is 1.226em, so 0.09em of the font hangs outside the
               line box at each end. Measured at 41.6px, the largest the name
               gets: the tail of the j in "Sananjjy" lost 3.1px off the bottom,
               and the accent on a capital -- "Śrī", "Ñ" -- lost 4.0px off the
               top. Nothing else on the sheet is set this tight, so nothing else
               was losing anything.

               The TEXT must not move: the box is pulled up 0.12em and the same
               0.12em handed back as padding, so the first line still starts
               exactly where the mirror's does and the <h1> this stands in for
               is still what you see. It is absolute, so none of it is layout --
               the mirror above still owns the height. 0.12em rather than the
               0.09em the metrics ask for, since an accent can overshoot the
               content area itself, and it still leaves 3px of the 8px colophon
               gap above untouched. */
            "absolute left-0 top-[-0.12em] h-[calc(100%+0.24em)] w-full resize-none overflow-hidden pt-[0.12em]",
            editing
              ? "cursor-text placeholder:text-muted-foreground/70"
              : "placeholder:text-muted-foreground"
          )}
        />
      </span>
    </PenSlot>
  );
}

/* ------------------------------------------------------------------ *
 *  The save mark, and the queue behind it.
 *
 *  Owner, 2026-08-07: "let the profiles automatically save. So maybe
 *  just have a loading icon and a saved with tick mark thing. Instead of
 *  'everything saves as you go' or some other cringe shit like that."
 *
 *  So there is no bar, no Save button and no sentence. A field commits on
 *  its own blur, a spinner turns while the write is in flight, a tick
 *  says it landed, and after a few seconds the whole thing goes back to
 *  saying nothing at all, which is the honest state most of the time.
 * ------------------------------------------------------------------ */

export type SaveState = "idle" | "saving" | "saved" | "error";

export function useAutoSave() {
  const [state, setState] = useState<SaveState>("idle");
  const [message, setMessage] = useState<string | null>(null);
  /* Counted, not booleaned: blurring one field while another is still in
     flight has to keep the spinner up rather than tick early. */
  const inFlight = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    []
  );

  const run = useCallback(async (fn: () => Promise<{ error?: string } | void>) => {
    inFlight.current += 1;
    if (timer.current) clearTimeout(timer.current);
    setState("saving");
    setMessage(null);
    let failed: string | null = null;
    try {
      const result = await fn();
      if (result && "error" in result && result.error) failed = result.error;
    } catch {
      failed = "That did not save. Check your connection.";
    }
    inFlight.current -= 1;
    if (inFlight.current > 0) return;
    if (failed) {
      // An error stays put. It is the one state that must not time itself out,
      // because the value on screen is not the value on file.
      setState("error");
      setMessage(failed);
      return;
    }
    setState("saved");
    timer.current = setTimeout(() => setState("idle"), 2400);
  }, []);

  return { state, message, run };
}

export function SaveMark({ state, message }: { state: SaveState; message?: string | null }) {
  return (
    <span
      className="inline-flex min-h-5 items-center gap-1.5 text-[12.5px] font-semibold"
      aria-live="polite"
    >
      <AnimatePresence mode="wait" initial={false}>
        {state !== "idle" && (
          <motion.span
            key={state}
            initial={{ opacity: 0, y: 3 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={SPRINGS.gentle}
            className={cn(
              "inline-flex items-center gap-1.5",
              state === "error" ? "text-heart" : "text-muted-foreground"
            )}
          >
            {state === "saving" && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />}
            {state === "saved" && <Check className="h-3.5 w-3.5 text-leaf" aria-hidden />}
            {state === "saving" ? "Saving" : state === "saved" ? "Saved" : (message ?? "Not saved")}
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}
