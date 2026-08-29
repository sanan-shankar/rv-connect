"use client";

import { useCallback, useEffect, useRef, type ComponentProps, type ReactNode } from "react";
import { FIELD_FOCUS, FIELD_FOCUS_SHELL } from "@/components/ui/field-focus";
import { InfoTooltip } from "@/components/common/info-tooltip";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ *
 *  <FloatField> - the calm signup field (owner reference: Revolut's
 *  "bank account details" form, 2026-08-14). One piece of text per box:
 *  the label lives INSIDE the field and floats up small once the field
 *  is focused or filled, so a resting form shows nothing but soft mist
 *  boxes that each say one thing. No external labels, no permanent
 *  placeholder text, no helper paragraphs.
 *
 *  Geometry: 56px box, 12px input radius (the system's input rung),
 *  mist fill with no border (the hairline earns nothing on a filled
 *  field; focus draws the one leaf ring instead). The float is
 *  TRANSFORM-ONLY (translate + scale about the left-center origin), so
 *  it honours "only transform and opacity animate": the label never
 *  animates font-size or top. 16px text throughout - under 16px iOS
 *  zooms the whole page on focus, which would defeat the calm.
 *
 *  The label floats on :focus, on :not(:placeholder-shown) (the input
 *  always carries a placeholder, " " by default, so this selector means
 *  "has a value"), and on :autofill - Chrome fills saved details
 *  without firing focus, and a filled value under a resting label reads
 *  as two texts collided. Same reason the autofill background is pinned
 *  back to mist: the default yellow wash breaks the one-material row.
 * ------------------------------------------------------------------ */

/** Shared shell for FloatField and bespoke composites (the signup phone
 *  field builds on these so both stay one material). Mist, not paper: the
 *  owner's read of the paper version was "the white typing box", and the
 *  ladder agrees - paper is a card surface, mist is the well you put
 *  something into. On the page background mist sits +2.6 dL*, clearly a
 *  box, without the white-slab glare (2026-08-14). */
/* `border border-transparent`: the shell has no visible edge at rest, but
   FIELD_FOCUS lights a field by turning its border leaf, so the border has
   to exist (transparent, inside the 56px box) for the focus edge to land. */
export const FIELD_SHELL =
  "h-14 w-full rounded-[var(--radius-input)] border border-transparent bg-mist";

/** Label base: absolute, vertically centred, ready to transform. */
export const FLOAT_LABEL_BASE =
  "pointer-events-none absolute left-4 top-1/2 origin-left text-base text-muted-foreground transition-transform duration-200 ease-out";

/** The two label poses, for composites that control the float in JS.
 *  FloatField itself uses the CSS peer- variants below (they must stay
 *  written out longhand for Tailwind to see them). */
export const FLOAT_LABEL_REST = "-translate-y-1/2 scale-100";
export const FLOAT_LABEL_UP = "translate-y-[calc(-50%-0.8rem)] scale-[0.72]";

/** Value-text padding inside the 56px box: the floated label owns the
 *  top ~22px, the value sits in the band below it. */
export const FIELD_PAD = "px-4 pt-[1.375rem] pb-[0.375rem]";

export function FloatField({
  id,
  label,
  focusHint,
  trailing,
  className,
  containerClassName,
  ...inputProps
}: ComponentProps<"input"> & {
  id: string;
  label: string;
  /** Example value revealed as the placeholder only while focused
   *  ("2014", "8+ characters"). Never visible at rest. */
  focusHint?: string;
  /** Small control inside the right edge (password eye, batch info). */
  trailing?: ReactNode;
  containerClassName?: string;
}) {
  return (
    <div className={cn("relative", containerClassName)}>
      <input
        id={id}
        // A placeholder is always present (even if just a space) so
        // :placeholder-shown can stand in for "empty"; the real hint
        // only becomes visible on focus via the opacity classes.
        placeholder={focusHint ?? " "}
        className={cn(
          FIELD_SHELL,
          FIELD_PAD,
          // FIELD_FOCUS_SHELL: on a click or tap this shell shows NOTHING on
          // its edge, exactly the 2026-08-14 ruling ("I don't want the green
          // outline on boxes"); the label floating up is the focus state. A
          // Tab gets the 2px leaf edge like every field (owner's pick from
          // /lab/focus, column A, 2026-08-29).
          "peer min-w-0 text-base text-foreground outline-none",
          FIELD_FOCUS_SHELL,
          "placeholder:text-muted-foreground/70 placeholder:opacity-0 placeholder:transition-opacity placeholder:duration-200 focus:placeholder:opacity-100",
          "autofill:[-webkit-box-shadow:0_0_0_1000px_var(--color-mist)_inset] autofill:[-webkit-text-fill-color:var(--color-foreground)]",
          trailing && "pr-11",
          className
        )}
        {...inputProps}
      />
      <label
        htmlFor={id}
        className={cn(
          FLOAT_LABEL_BASE,
          FLOAT_LABEL_REST,
          "peer-focus:translate-y-[calc(-50%-0.8rem)] peer-focus:scale-[0.72]",
          "peer-[:not(:placeholder-shown)]:translate-y-[calc(-50%-0.8rem)] peer-[:not(:placeholder-shown)]:scale-[0.72]",
          "peer-autofill:translate-y-[calc(-50%-0.8rem)] peer-autofill:scale-[0.72]"
        )}
      >
        {label}
      </label>
      {trailing && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">{trailing}</div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 *  <FloatArea> - the same idea for a paragraph rather than a line.
 *
 *  Built here rather than in the one room that needed it (the Collection's
 *  contribute pop-up) because the float-label rule is the thing being
 *  shared: the label lives inside the box, rises when the box is focused or
 *  filled, and is the only text there. A second hand-rolled copy of that in
 *  a feature folder is how the signup material starts drifting.
 *
 *  Two deliberate differences from FloatField:
 *
 *  - IT IS DRAWN AS A BORDER, NOT A FILL. FloatField's mist well is right on
 *    the page wash, where a fill sits LIGHTER than its surround and reads as
 *    a box. A pop-up is pure white (--float): every warm fill is darker than
 *    the paper and reads as a stain instead, which is exactly what the owner
 *    called "the yellowing" (2026-08-28). A hairline says the same thing on
 *    white and costs nothing on any other surface.
 *  - THE LABEL IS ANCHORED TO THE TOP, not the vertical centre. A three-line
 *    box has no middle to sit in; the resting label lines up with the first
 *    line of text and rises out of it.
 * ------------------------------------------------------------------ */
export function FloatArea({
  id,
  label,
  hint,
  bare = false,
  className,
  containerClassName,
  ...areaProps
}: ComponentProps<"textarea"> & {
  id: string;
  label: string;
  /** What goes behind the (i). Omit it and no icon is drawn. */
  hint?: ReactNode;
  /** Drop the box's own frame, for when it is a ROW inside a grouped card
   *  rather than a field standing on its own. Two stacked fields each drawing
   *  their own border is two borders where the eye wants one shape -- the
   *  owner on the contribute room's question panel (2026-08-28): "it just has
   *  an excess of elements and border, it's not smart and sleek at all." The
   *  group draws the frame and a hairline between its rows; this draws
   *  nothing. */
  bare?: boolean;
  containerClassName?: string;
}) {
  /* IT GROWS AS YOU TYPE, and starts at whatever `rows` says rather than at
     the tallest it will ever need to be. The owner, on the contribute room's
     description box (2026-08-28): "maybe the description isn't a tall
     rectangle, but it should clearly expand when people are typing." A box
     drawn at its maximum is asking for an essay before a word is typed, which
     on a phone is most of the screen spent on emptiness.

     The floor is MEASURED EVERY TIME rather than cached, and that is worth a
     sentence. It used to be read once on mount and kept in a ref, which is
     wrong twice: a webfont that finishes loading after mount changes the line
     height under it, and so does anything that restyles the box. Both leave
     the box a few pixels off forever, which is exactly the kind of difference
     that gets noticed when this sits in a grouped card beside a fixed-height
     row. Clearing the inline height first asks the browser what `rows` says
     right now; two extra layout reads per keystroke on one textarea is
     nothing, and it cannot go stale. */
  const area = useRef<HTMLTextAreaElement>(null);
  const grow = useCallback(() => {
    const el = area.current;
    if (!el) return;
    el.style.height = "";
    const floor = el.clientHeight;
    /* `auto` first: without it the box can only ever get taller, because
       scrollHeight of an element with an explicit height is that height. */
    el.style.height = "auto";
    el.style.height = `${Math.max(floor, el.scrollHeight)}px`;
  }, []);

  /* Keyed on the value, so it is right after a paste, after the room fills
     the box in from another photograph's answers, and after the first paint
     -- not only on the keystrokes an `onInput` would hear. */
  useEffect(grow, [grow, areaProps.value]);

  return (
    <div className={cn("relative", containerClassName)}>
      <textarea
        id={id}
        ref={area}
        onInput={grow}
        // Always a placeholder, even if only a space, so :placeholder-shown
        // can stand in for "empty" -- same trick as FloatField.
        placeholder=" "
        className={cn(
          /* `block`, and it is load-bearing: a textarea is inline-block by
             default, so its wrapper grows a line box around it and adds ~6px
             of descender space underneath. Invisible on a field standing
             alone, and immediately visible when this is one row of a grouped
             card next to a row that does not have it.

             `pb-2`, not `pb-3`, for the same reason: 26 + 22 + 8 makes an
             empty one-row box exactly 56px, which is the height of the date
             row above it. The owner: "why is the second box bigger than the
             first?" It was 66 against 56 -- four pixels of padding and six of
             phantom line box. */
          "peer block w-full resize-none bg-transparent",
          "px-4 pb-2 pt-[1.625rem] text-base leading-snug text-foreground outline-none",
          "disabled:opacity-50 placeholder:text-transparent",
          /* A grouped row has no frame and no focus colour of its own: the
             caret and the label rising are its focus state, which is the same
             call FloatField made ("I don't want the green outline on boxes"). */
          !bare &&
            `rounded-[var(--radius-input)] border border-border ${FIELD_FOCUS}`,
          hint && "pr-10",
          className
        )}
        {...areaProps}
      />
      <label
        htmlFor={id}
        className={cn(
          "pointer-events-none absolute left-4 top-[1.0625rem] origin-left text-base text-muted-foreground",
          "transition-transform duration-200 ease-out",
          "peer-focus:translate-y-[-0.72rem] peer-focus:scale-[0.72]",
          "peer-[:not(:placeholder-shown)]:translate-y-[-0.72rem] peer-[:not(:placeholder-shown)]:scale-[0.72]"
        )}
      >
        {label}
      </label>
      {hint && (
        /* ANCHORED TO THE LABEL, not to the corner. It used to sit at
           `right-2.5 top-2.5`, which lined up with nothing: 2.5px off the
           label's centre and inset 10px against the text's own 16px, so it
           read as loose. The owner: "it's not aligned to anything, just
           hanging, I can't see why it's there."

           `top-[1.1875rem]` is measured, not derived: a 20px icon box there
           puts its centre on the resting label's centre exactly, so the icon
           and the words "Add a description" sit on one line across the row,
           which is what says the icon belongs to them. (17px, the label's own
           `top`, leaves it 2px high -- the label's line box is taller than its
           font size.) `right-4` is the text's own inset mirrored, so the row
           is even.

           Once the box is filled the label floats and the icon stays, which
           is correct rather than a compromise: it becomes the box's corner
           affordance at exactly the moment the label has stopped being a
           question. */
        <div className="absolute right-4 top-[1.1875rem] flex h-5 items-center">
          {/* `end`, because this icon lives in the box's top-right corner:
              the note hangs back across the field it belongs to instead of
              off the right of the screen. */}
          <InfoTooltip label="What to write" side="bottom" align="end">
            {hint}
          </InfoTooltip>
        </div>
      )}
    </div>
  );
}
