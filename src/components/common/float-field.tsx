"use client";

import type { ComponentProps, ReactNode } from "react";
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
export const FIELD_SHELL =
  "h-14 w-full rounded-[var(--radius-input)] bg-mist";

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
          // No focus ring, on purpose (owner, 2026-08-14: "I don't want the
          // green outline on boxes" - inputs match :focus-visible even on a
          // tap, so the ring flashed on every touch). The field's focus
          // state is the caret plus the label floating up; buttons and links
          // keep their rings for keyboard travel.
          "peer min-w-0 text-base text-foreground outline-none",
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
