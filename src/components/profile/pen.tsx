"use client";

/* ------------------------------------------------------------------ *
 *  The pen: how a value on your own letterhead becomes typeable.
 *
 *  The whole design constraint here is the owner's (2026-08-07): "it's
 *  very important that we have a very beautiful transition from resting
 *  profile to settings ... make sure we don't have tiles resizing and so
 *  on."
 *
 *  So there is no swap. On your own profile every value is ALREADY an
 *  input, from first paint, sitting there `readOnly`. Turning on edit
 *  mode changes nothing about the DOM and nothing about the box model:
 *  it drops `readOnly`, and it draws a rule underneath. Nothing can
 *  reflow, because nothing moved.
 *
 *  Three details make an always-input read as prose at rest:
 *   - The border is 1px TRANSPARENT at rest, so hover can paint it
 *     without shifting the text by a pixel. (The owner's standing rule:
 *     hovering never moves a control.)
 *   - The horizontal padding is cancelled by a matching negative margin
 *     at the call site, so the TEXT sits on the sheet's own left edge and
 *     only the invisible box hangs outside it.
 *   - `cursor: text` only arrives with edit mode; at rest the field is
 *     as inert as the paragraph it replaced.
 *
 *  The rule itself is an absolutely positioned element scaled on X, not
 *  a text-decoration and not a border. text-decoration cannot animate at
 *  all, and a border would be 2px of layout. A transform can neither
 *  reflow nor repaint its neighbours, so a dozen of them can draw in
 *  together at 60fps.
 * ------------------------------------------------------------------ */

import { useEffect, useRef, type ReactNode } from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { SPRINGS } from "@/components/common/motion";

/** Padding + the transparent border, identical on every pen so that two
 *  fields on one line can never disagree about where their text starts. */
export const PEN_BOX =
  "rounded-[var(--radius-sm)] border border-transparent bg-transparent px-1.5 outline-none transition-[background-color,border-color] duration-150";

/** What the box does once the pen is live. `read-only:` guards nothing here
 *  because the field stops being read-only in edit mode; these are applied
 *  conditionally instead, so a resting profile has no hover behaviour at all. */
const PEN_LIVE =
  "cursor-text placeholder:text-muted-foreground/70 hover:border-border hover:bg-float/60 focus:border-canopy/45 focus:bg-float";

/* The rule, dotted, in canopy. Drawn as a repeating gradient rather than a
   dotted border so its dash rhythm is ours and not the browser's, and so it
   can live on an element that has no border of its own to style. */
const RULE_IMAGE =
  "repeating-linear-gradient(90deg, var(--color-canopy) 0 2px, transparent 2px 5px)";

/**
 * The rule under a pen. Its own element, absolutely positioned, so it adds no
 * height and cannot push anything. `origin-left` plus a scaleX spring means
 * it draws in from the left the way a pen would.
 */
export function PenRule({ on, delay = 0 }: { on: boolean; delay?: number }) {
  return (
    <motion.span
      aria-hidden
      className="pointer-events-none absolute inset-x-1.5 -bottom-0.5 h-[2px] origin-left"
      style={{ backgroundImage: RULE_IMAGE }}
      initial={false}
      animate={{ scaleX: on ? 1 : 0, opacity: on ? 0.45 : 0 }}
      transition={{ ...SPRINGS.gentle, delay: on ? delay : 0 }}
    />
  );
}

/** The wrapper every pen shares: positions the rule against the field. */
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
    <span className={cn("relative inline-block max-w-full align-top", className)}>
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
}: {
  value: string;
  onChange: (v: string) => void;
  /** Fired on blur, and on Enter. This is the save. */
  onCommit: () => void;
  editing: boolean;
  placeholder: string;
  ariaLabel: string;
  delay?: number;
  /** type size and weight; on the wrapper, so the mirror inherits it too */
  className?: string;
  inputMode?: "numeric" | "tel" | "url" | "email";
  maxLength?: number;
}) {
  return (
    <PenSlot editing={editing} delay={delay} className={className}>
      <span className="inline-grid max-w-full overflow-hidden align-top">
        <span
          aria-hidden
          className={cn(PEN_BOX, "invisible col-start-1 row-start-1 whitespace-pre")}
        >
          {value || placeholder}
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
          // size={1} is load-bearing. An input's default intrinsic width is
          // about 20 characters, and in a grid cell that competes with the
          // mirror: the column comes out 168px wide however short the text is.
          size={1}
          tabIndex={editing ? 0 : -1}
          className={cn(PEN_BOX, "col-start-1 row-start-1 w-full min-w-0", editing && PEN_LIVE)}
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
 *  not the same object and the transition is a lie.
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
  maxLength?: number;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  /* Exactly as tall as its content, remeasured whenever that changes. The
     first pass has to run before paint or the field opens at one row and
     jumps, which is precisely the resize this whole file exists to avoid. */
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${el.scrollHeight}px`;
  }, [value, placeholder, editing]);

  return (
    <PenSlot editing={editing} delay={delay} className={cn("block w-full", className)}>
      <textarea
        ref={ref}
        rows={1}
        value={value}
        readOnly={!editing}
        onChange={(e) => onChange(singleLine ? e.target.value.replace(/\n/g, "") : e.target.value)}
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
          PEN_BOX,
          "block w-full resize-none overflow-hidden",
          editing && PEN_LIVE,
          // At rest an empty About still has to read as the prompt it always
          // was, so the placeholder stays visible when the field is inert.
          !editing && "placeholder:text-muted-foreground"
        )}
      />
    </PenSlot>
  );
}
