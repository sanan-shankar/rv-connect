/* ------------------------------------------------------------------ *
 *  The boxes of the client controls the loading screens draw, in a module
 *  of their own: a control's file is a client component, and a server
 *  component that imports a value from one gets a client reference rather
 *  than the value. The control and its placeholder both read these, so a
 *  change to a control's size reaches the screen that stands in for it.
 *  Geometry only -- height, padding, type -- never paint or state, which
 *  stay with the control.
 * ------------------------------------------------------------------ */

/* SegmentedPills (segmented-pills.tsx) */

/** The track: a hairline pill with a 4px inset. */
export const SEGMENTED_TRACK = "items-center rounded-full border border-border p-1";

/** The track hugging its labels, which is every call site but signup's. */
export const SEGMENTED_TRACK_HUG = "inline-flex w-fit max-w-full gap-1";

/** The track spanning its row, the segments splitting it evenly (`fill`). */
export const SEGMENTED_TRACK_FILL = "grid w-full gap-1.5";

/** A segment's box: its 32px height, its padding and its type. */
export const SEGMENTED_SEGMENT =
  "relative inline-flex h-8 items-center justify-center gap-1.5 rounded-full px-3.5 text-[13px] font-semibold sm:px-4";

/** The trailing count a segment can carry (the profile's, the review piles'). */
export const SEGMENTED_COUNT = "relative text-[11.5px] font-semibold tabular-nums";

/** FilterButton (filters/filter-popover.tsx): the 40px pill, the icon and the
 *  word, which a `compact` button drops. */
export const FILTER_BUTTON =
  "inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full border px-4 text-[13px] font-medium";

/** A bucket word on the Collection's filter line (river-controls.tsx),
 *  13.5px at leading-none, its padding making room for the marker under it. */
export const BUCKET_WORD = "relative shrink-0 whitespace-nowrap px-0.5 pb-2 pt-1 text-[13.5px] leading-none";
