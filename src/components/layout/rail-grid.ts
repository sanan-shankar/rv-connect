/* ------------------------------------------------------------------ *
 *  The two-column rail geometry shared by Feed and Catch-ups: a fluid
 *  main column beside a fixed right rail. This used to be hand-copied
 *  as a class literal across both pages and both loading skeletons;
 *  the numbers live here once so a rail tweak can never miss a file.
 *
 *  318px rail + 30px gutter are the rail-card design width from
 *  /preview/v2 (FreshOffThePress / FeedRail are drawn to it). 1180px is
 *  the viewport floor: below it the main column would drop under ~500px
 *  (1180 - 248 sidebar - 80 shell padding - 348 rail+gutter = 504), so
 *  the rail does not render at all rather than squeezing the content.
 *
 *  Pages wrap BOTH their header row and their body in this same grid,
 *  each occupying column 1 only, so the page's primary CTA right-aligns
 *  to the main column's edge and never runs over the rail (owner,
 *  2026-07-30: "right aligned with the right edge of the LEFT column").
 * ------------------------------------------------------------------ */

/** The grid: fluid main column, then a 318px rail from 1180px up. */
export const RAIL_GRID =
  "grid grid-cols-1 gap-x-[30px] min-[1180px]:grid-cols-[minmax(0,1fr)_318px]";

/** The rail cell: hidden until the grid actually has its second column. */
export const RAIL_ASIDE = "hidden min-[1180px]:block";

/**
 * Whether the page at `pathname` has a rail whose first card starts level with
 * the page header -- the one place the confirm-your-email chip
 * (verify-email-banner.tsx) can float in the rail's top-right corner instead
 * of pushing the page down.
 *
 * Only the Feed. The chip floated on every /catchups page too, from when those
 * had the Feed's shape, and the Catch-ups rework changed both under it
 * (2026-09-29): the index lost its rail, so the chip sat on its "Start a
 * Catch-up" pill, and a Catch-up's home put a full-width cover photograph above
 * its rail, so the chip sat on the photograph. Kept beside RAIL_GRID so the
 * next page to take the rail's shape has this in front of it.
 */
export function railStartsAtTop(pathname: string): boolean {
  return pathname === "/feed";
}
