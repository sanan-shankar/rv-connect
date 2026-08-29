"use client";

/* ------------------------------------------------------------------ *
 *  The swap between the Collection's two halves: one caret.
 *
 *  The owner set the shape: *"I want a clean subtle way to swap between
 *  the two that doesn't interfere with the rest of the UI. for example a
 *  tiny up and down arrow beside the title."*
 *
 *  WHAT THIS REPLACED, so nobody puts it back. A `<SegmentedPills>`
 *  switch sat on the controls line for one commit. That line is the one
 *  place in the app whose brief was explicitly *no pills, no borders*
 *  (river-controls.tsx's own header, quoting him), and a filled white
 *  capsule beside bare 13.5px bucket words put two selection idioms, at
 *  two sizes, on two baselines, in two visual languages. His read: "one
 *  of the ugliest things I've seen." He is right, and the lesson is that
 *  a control does not become appropriate because it is the house
 *  component -- the house component belongs where the house put it.
 *
 *  So: nothing on the controls line. The title already says which half
 *  you are in, which makes the title the only honest place for the thing
 *  that changes it. One caret, the muted weight of a footnote, inline
 *  after the last word so it follows "Collection" down to the second
 *  line when the title wraps on a phone.
 *
 *  ONE glyph and not two. The owner suggested an up and a down; with
 *  exactly two halves there is nowhere to travel, only somewhere to
 *  return from, and a second arrow would be a second mark earning
 *  nothing. It flips instead -- which is the same information, in half
 *  the ink. If a third collection ever exists this is the assumption
 *  that breaks, and a stacked pair is what it breaks into.
 * ------------------------------------------------------------------ */

import { CaretDown } from "@phosphor-icons/react";
import type { PhotoScope } from "@/lib/photo-visibility-rule";
import { cn } from "@/lib/utils";

export function ScopeCaret({
  scope,
  onScope,
  canSeeClass = false,
}: {
  scope: PhotoScope;
  onScope: (v: PhotoScope) => void;
  /** Absent entirely for a member with no class -- a teacher, or a profile
   *  without a batch year yet -- rather than drawn and dead. */
  canSeeClass?: boolean;
}) {
  if (!canSeeClass) return null;
  const next: PhotoScope = scope === "class" ? "valley" : "class";

  return (
    <button
      type="button"
      onClick={() => onScope(next)}
      /* The label names the DESTINATION, not the gesture. "Switch collection"
         tells a screen reader nothing it could not see; the name of the place
         it goes is the whole content of the control. */
      aria-label={
        next === "class"
          ? "Switch to the Class Collection"
          : "Switch to the Valley Collection"
      }
      title={next === "class" ? "The Class Collection" : "The Valley Collection"}
      className={cn(
        /* Inline and baseline-aligned, so it belongs to the last word rather
           than floating in the header. `-my-3` cancels the padding that gives
           it a real thumb target: the box is 40px for a finger and 0px for the
           line box, so a 30px serif title keeps exactly the leading it had.
           Measured: h1 height unchanged with and without this. */
        "group relative -my-3 ml-1.5 inline-flex h-10 w-5 shrink-0 items-center justify-center align-baseline",
        "text-muted-foreground/70 transition-colors duration-150 hover:text-foreground",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring rounded-[var(--radius-sm)]"
      )}
    >
      <CaretDown
        size={13}
        weight="bold"
        aria-hidden
        className={cn(
          /* Transform only, and no layout property in sight. 200ms is the
             length of a glance: long enough to read as the same mark turning
             over rather than two different marks, short enough that nobody
             waits for it. */
          "transition-transform duration-200 ease-out",
          /* -2px lifts it off the baseline onto the optical centre of the
             lowercase run beside it. A caret sitting ON a serif baseline reads
             as having fallen off the line. */
          "translate-y-[-2px]",
          scope === "class" && "rotate-180"
        )}
      />
    </button>
  );
}
